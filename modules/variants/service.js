// Styles and their variants. A style generates one Product per combination of
// its option values (Size x Color...); see models/ProductGroup.js.
import mongoose from "mongoose";
import ProductGroup from "./models/ProductGroup";
import manifest from "./manifest";
import Product from "@/core/products/models/Products";
import Category from "@/core/products/models/Category";
import Order from "@/core/orders/models/Orders";
import { ServiceError } from "@/core/shared/serviceError";
import { logActivity } from "@/core/audit/activityLog";
import OptionList from "../lists/models/OptionList";
import { ensureLists } from "../lists/service";
import { sanitizeProductExtra } from "../config";

const bad = (error) => new ServiceError(400, { error });
const isId = (v) => mongoose.isValidObjectId(v);
const comboKey = (values) => values.join("|");

// Every combination of the options' values, in order.
export function combinations(options) {
  return options.reduce((acc, opt) => acc.flatMap((prefix) => opt.values.map((v) => [...prefix, v])), [[]]);
}

export function variantName(styleName, values) {
  return `${styleName} · ${values.join(" / ")}`;
}

function parsePrices(input, fallback = {}) {
  const num = (v, label, def) => {
    if (v === "" || v === undefined || v === null) return def;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) throw bad(`${label} must be a number ≥ 0`);
    return n;
  };
  const price = num(input.price, "Price", fallback.price);
  if (price === undefined) throw bad("Price is required");
  const initialPrice = num(input.initialPrice, "Cost price", fallback.initialPrice ?? 0);
  if (initialPrice > price) throw bad("Cost Price can't be bigger than the selling price");
  return {
    price,
    initialPrice,
    priceWholesale: num(input.priceWholesale, "Wholesale price", fallback.priceWholesale ?? price),
    priceDistributor: num(input.priceDistributor, "Distributor price", fallback.priceDistributor ?? price),
    priceVip: num(input.priceVip, "VIP price", fallback.priceVip ?? price),
    discount: Math.min(100, num(input.discount, "Discount", fallback.discount ?? 0)),
  };
}

// Options must use variant lists and values that exist (and aren't hidden).
async function cleanOptions(options) {
  if (!Array.isArray(options) || !options.length) throw bad("Pick at least one option, e.g. Size");
  if (options.length > manifest.maxOptions) throw bad(`At most ${manifest.maxOptions} options per style`);
  await ensureLists();
  const lists = await OptionList.find({ key: { $in: options.map((o) => o?.list) } }).lean();
  const seen = new Set();
  return options.map((o) => {
    const list = lists.find((l) => l.key === o?.list);
    if (!list || list.kind !== "variant") throw bad(`Unknown option list "${o?.list}"`);
    if (seen.has(list.key)) throw bad(`"${list.name}" is chosen twice`);
    seen.add(list.key);
    const values = [...new Set((o.values || []).map((v) => String(v).trim()).filter(Boolean))];
    if (!values.length) throw bad(`Pick at least one ${list.name} value`);
    for (const v of values) if (!list.values.some((x) => x.value === v)) throw bad(`"${v}" isn't in ${list.name} - add it first`);
    const fallback = list.optionName || list.name;
    return { list: list.key, name: String(o.name || fallback).trim().slice(0, 40) || fallback, values, swatch: list.swatch, hexes: list.values };
  });
}

async function checkBarcodes(codes) {
  const list = codes.filter(Boolean);
  const dupe = list.find((c, i) => list.indexOf(c) !== i);
  if (dupe) throw bad(`Barcode ${dupe} is used twice`);
  if (!list.length) return;
  const taken = await Product.findOne({ barcode: { $in: list } }).select("name barcode");
  if (taken) throw bad(`This barcode is already used by "${taken.name}".`);
}

function photosFor(group, values) {
  const map = group.photosByValue || {};
  for (const v of values) if (Array.isArray(map[v]) && map[v].length) return map[v].slice(0, 8);
  return (group.img || []).slice(0, 8);
}

function buildVariant(group, values, perVariant, prices) {
  const code = typeof perVariant.barcode === "string" ? perVariant.barcode.trim() : "";
  const qty = perVariant.quantity === "" || perVariant.quantity == null ? 0 : parseInt(perVariant.quantity, 10);
  if (!Number.isFinite(qty) || qty < 0) throw bad(`Quantity for ${values.join(" / ")} must be ≥ 0`);
  const p = parsePrices(perVariant, prices);
  return {
    name: variantName(group.name, values),
    barcode: code || undefined,
    quantity: qty,
    ...p,
    profit: p.price - p.initialPrice,
    category: group.category || undefined,
    unit: group.unit,
    lowStockThreshold: group.lowStockThreshold,
    img: photosFor(group, values),
    extra: {
      ...(group.extra || {}),
      variant: { group: group._id, options: group.options.map((o, i) => ({ list: o.list, name: o.name, value: values[i] })) },
    },
  };
}

async function insertVariants(group, rows) {
  const docs = await Product.insertMany(rows);
  if (group.category && docs.length) {
    await Category.findByIdAndUpdate(group.category, { $push: { products: { $each: docs.map((d) => d._id) } } });
  }
  return docs;
}

export async function createStyle(input, admin) {
  const name = String(input?.name || "").trim().slice(0, 120);
  if (!name) throw bad("Style name is required");
  const options = await cleanOptions(input.options);
  const combos = combinations(options);
  if (combos.length > manifest.maxCombinations) throw bad(`That's ${combos.length} combinations - the limit is ${manifest.maxCombinations}`);
  const prices = parsePrices(input);
  if (input.category && !isId(input.category)) throw bad("Invalid category");

  const perVariant = input.variants && typeof input.variants === "object" ? input.variants : {};
  const wanted = combos.filter((values) => !perVariant[comboKey(values)]?.skip);
  if (!wanted.length) throw bad("Every combination is switched off");
  await checkBarcodes(wanted.map((values) => perVariant[comboKey(values)]?.barcode?.trim?.()));

  const group = new ProductGroup({
    name,
    category: input.category || null,
    options: options.map(({ list, name: n, values }) => ({ list, name: n, values })),
    prices,
    unit: String(input.unit || "pcs").trim() || "pcs",
    lowStockThreshold: Number.isFinite(Number(input.lowStockThreshold)) && input.lowStockThreshold !== "" ? Math.max(0, Number(input.lowStockThreshold)) : 2,
    img: Array.isArray(input.img) ? input.img.filter((u) => typeof u === "string" && u).slice(0, 8) : [],
    photosByValue: cleanPhotoMap(input.photosByValue),
    extra: sharedExtra(input.extra),
  });
  const rows = wanted.map((values) => buildVariant(group, values, perVariant[comboKey(values)] || {}, prices));
  await group.save();
  let docs;
  try {
    docs = await insertVariants(group, rows);
  } catch (e) {
    await ProductGroup.deleteOne({ _id: group._id });
    throw e;
  }
  await logActivity({
    admin,
    action: "product.create",
    entityType: "Product",
    entityId: docs[0]?._id,
    entityLabel: name,
    summary: `Created style "${name}" with ${docs.length} variant(s)`,
  });
  return { group, variants: docs };
}

function cleanPhotoMap(map) {
  if (!map || typeof map !== "object") return undefined;
  const out = {};
  for (const [k, v] of Object.entries(map)) {
    const urls = (Array.isArray(v) ? v : []).filter((u) => typeof u === "string" && u).slice(0, 8);
    if (urls.length) out[String(k).slice(0, 60)] = urls;
  }
  return Object.keys(out).length ? out : undefined;
}

// Shared details (catalog/apparel/...) - never the variant link.
function sharedExtra(input, previous) {
  const clean = sanitizeProductExtra(input, previous);
  delete clean.variant;
  return Object.keys(clean).length ? clean : undefined;
}

export async function getStyle(id) {
  if (!isId(id)) throw new ServiceError(404, { error: "Style not found" });
  const group = await ProductGroup.findById(id).lean();
  if (!group) throw new ServiceError(404, { error: "Style not found" });
  const variants = await Product.find({ "extra.variant.group": group._id }).lean();
  const order = (p) => group.options.map((o, i) => o.values.indexOf(p.extra?.variant?.options?.[i]?.value));
  variants.sort((a, b) => {
    const x = order(a), y = order(b);
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i];
    return 0;
  });
  const lists = await OptionList.find({ key: { $in: group.options.map((o) => o.list) } }).lean();
  return { group, variants, lists };
}

export async function listStyles({ q = "", page = 1, limit = 24 } = {}) {
  const filter = { archived: { $ne: true } };
  if (q) filter.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  const [total, groups] = await Promise.all([
    ProductGroup.countDocuments(filter),
    ProductGroup.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);
  const stats = await Product.aggregate([
    { $match: { "extra.variant.group": { $in: groups.map((g) => g._id) } } },
    { $group: { _id: "$extra.variant.group", variants: { $sum: 1 }, stock: { $sum: "$quantity" }, minPrice: { $min: "$price" }, maxPrice: { $max: "$price" } } },
  ]);
  const byId = Object.fromEntries(stats.map((s) => [String(s._id), s]));
  return {
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
    styles: groups.map((g) => ({ ...g, stats: byId[String(g._id)] || { variants: 0, stock: 0 } })),
  };
}

// Add new values to an option (e.g. size XXL) - creates the new combinations.
export async function addOptionValues(id, { list, values, variants: perVariant = {} }, admin) {
  const group = await ProductGroup.findById(isId(id) ? id : null);
  if (!group) throw new ServiceError(404, { error: "Style not found" });
  const idx = group.options.findIndex((o) => o.list === list);
  if (idx < 0) throw bad("This style doesn't use that option");
  const [checked] = await cleanOptions([{ list, values }]);
  const fresh = checked.values.filter((v) => !group.options[idx].values.includes(v));
  if (!fresh.length) throw bad("Those values are already in this style");
  const opts = group.options.map((o, i) => ({ values: i === idx ? fresh : o.values }));
  const combos = combinations(opts);
  const total = (await Product.countDocuments({ "extra.variant.group": group._id })) + combos.length;
  if (total > manifest.maxCombinations) throw bad(`That would make ${total} variants - the limit is ${manifest.maxCombinations}`);
  await checkBarcodes(combos.map((values) => perVariant[comboKey(values)]?.barcode?.trim?.()));
  group.options[idx].values.push(...fresh);
  group.markModified("options");
  const rows = combos.map((values) => buildVariant(group, values, perVariant[comboKey(values)] || {}, group.prices || {}));
  await group.save();
  const docs = await insertVariants(group, rows);
  await logActivity({ admin, action: "product.create", entityType: "Product", entityId: docs[0]?._id, entityLabel: group.name, summary: `Added ${fresh.join(", ")} to style "${group.name}" (${docs.length} new variant(s))` });
  return { group, variants: docs };
}

// Edit the shared details; they're copied to every variant. Prices are only
// pushed to the variants when applyPrices is set (variants may differ).
export async function updateStyle(id, input, admin) {
  const group = await ProductGroup.findById(isId(id) ? id : null);
  if (!group) throw new ServiceError(404, { error: "Style not found" });
  if (input.name !== undefined) {
    const name = String(input.name).trim().slice(0, 120);
    if (!name) throw bad("Style name is required");
    group.name = name;
  }
  const oldCategory = group.category ? String(group.category) : null;
  if (input.category !== undefined) {
    if (input.category && !isId(input.category)) throw bad("Invalid category");
    group.category = input.category || null;
  }
  if (input.unit !== undefined) group.unit = String(input.unit).trim() || "pcs";
  if (input.lowStockThreshold !== undefined && input.lowStockThreshold !== "") group.lowStockThreshold = Math.max(0, Number(input.lowStockThreshold) || 0);
  if (input.img !== undefined) group.img = (Array.isArray(input.img) ? input.img : []).filter((u) => typeof u === "string" && u).slice(0, 8);
  if (input.photosByValue !== undefined) group.photosByValue = cleanPhotoMap(input.photosByValue);
  if (input.extra !== undefined) group.extra = sharedExtra(input.extra, group.extra);
  if (input.prices) group.prices = parsePrices(input.prices, group.prices || {});
  group.markModified("extra");
  group.markModified("photosByValue");
  group.markModified("prices");
  await group.save();

  const variants = await Product.find({ "extra.variant.group": group._id });
  for (const v of variants) {
    const values = (v.extra?.variant?.options || []).map((o) => o.value);
    v.name = variantName(group.name, values);
    v.category = group.category || undefined;
    v.unit = group.unit;
    v.lowStockThreshold = group.lowStockThreshold;
    v.img = photosFor(group, values);
    v.extra = { ...(group.extra || {}), variant: v.extra.variant };
    if (input.applyPrices && group.prices) Object.assign(v, group.prices, { profit: group.prices.price - group.prices.initialPrice });
    v.markModified("extra");
    await v.save();
  }
  const newCategory = group.category ? String(group.category) : null;
  if (oldCategory !== newCategory) {
    const ids = variants.map((v) => v._id);
    if (oldCategory) await Category.findByIdAndUpdate(oldCategory, { $pull: { products: { $in: ids } } });
    if (newCategory) await Category.findByIdAndUpdate(newCategory, { $addToSet: { products: { $each: ids } } });
  }
  await logActivity({ admin, action: "product.edit", entityType: "Product", entityId: variants[0]?._id, entityLabel: group.name, summary: `Edited style "${group.name}" (${variants.length} variant(s) updated)` });
  return getStyle(group._id);
}

// Deletes a style and its variants - only if none of them was ever ordered.
export async function deleteStyle(id, admin) {
  const group = await ProductGroup.findById(isId(id) ? id : null);
  if (!group) throw new ServiceError(404, { error: "Style not found" });
  const ids = (await Product.find({ "extra.variant.group": group._id }).select("_id")).map((p) => p._id);
  if (await Order.exists({ "products.productId": { $in: ids } })) {
    throw bad("This style can't be deleted because customers have ordered it.");
  }
  await Product.deleteMany({ _id: { $in: ids } });
  if (group.category) await Category.findByIdAndUpdate(group.category, { $pull: { products: { $in: ids } } });
  await group.deleteOne();
  await logActivity({ admin, action: "product.delete", entityType: "Product", entityLabel: group.name, summary: `Deleted style "${group.name}" and its ${ids.length} variant(s)` });
}
