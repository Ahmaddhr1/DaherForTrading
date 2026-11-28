// Product option lists (sizes, colors, brands...): seeded from the enabled
// modules' defaults the first time they're needed, then fully owned by the
// business - managed in Settings and extendable inline from the product form.
import OptionList from "./models/OptionList";
import Product from "@/core/products/models/Products";
import { ServiceError } from "@/core/shared/serviceError";
import { MODULES, listsFor } from "../registry";
import { enabledModules } from "../config";

const HEX = /^#[0-9a-f]{6}$/i;
const toValue = (v) => (typeof v === "string" ? { value: v } : { value: v.value, hex: v.hex });
const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function slugify(name) {
  return (
    String(name || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9؀-ۿ]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || `list-${Date.now().toString(36)}`
  );
}

// Creates the lists the enabled modules need (with their default values) if
// they don't exist yet. Never re-adds values the owner removed.
export async function ensureLists() {
  const wanted = listsFor(enabledModules());
  if (!wanted.length) return;
  const existing = new Set((await OptionList.find({ key: { $in: wanted.map((l) => l.key) } }).select("key")).map((l) => l.key));
  const missing = wanted.filter((l) => !existing.has(l.key));
  if (!missing.length) return;
  try {
    await OptionList.insertMany(
      missing.map((l) => ({ key: l.key, name: l.name, optionName: l.optionName, kind: l.kind || "field", swatch: !!l.swatch, values: (l.values || []).map(toValue) })),
      { ordered: false }
    );
  } catch (e) {
    if (e?.code !== 11000 && !e?.writeErrors) throw e; // a parallel request seeded it first
  }
}

export async function getLists({ kind } = {}) {
  await ensureLists();
  const wantedKeys = new Set(listsFor(enabledModules()).map((l) => l.key));
  const lists = await OptionList.find(kind ? { kind } : {}).sort({ kind: 1, name: 1 }).lean();
  // Lists of switched-off modules stay in the database but aren't offered.
  return lists.filter((l) => l.custom || wantedKeys.has(l.key));
}

export async function getList(key) {
  await ensureLists();
  const list = await OptionList.findOne({ key });
  if (!list) throw new ServiceError(404, { error: "List not found" });
  return list;
}

function cleanValue(input, swatch) {
  const value = String(input?.value ?? input ?? "").trim().slice(0, 60);
  if (!value) throw new ServiceError(400, { error: "Value can't be empty" });
  const out = { value, hidden: !!input?.hidden };
  if (swatch) {
    const hex = String(input?.hex || "").trim();
    if (hex && !HEX.test(hex)) throw new ServiceError(400, { error: `"${hex}" isn't a color like #1A2B3C` });
    if (hex) out.hex = hex.toUpperCase();
  }
  return out;
}

// How many products use this value - used values can be hidden, not deleted.
export async function valueUsage(key, value) {
  const or = [{ "extra.variant.options": { $elemMatch: { list: key, value } } }];
  for (const mod of Object.values(MODULES)) {
    for (const f of mod.fields || []) if (f.list === key) or.push({ [`extra.${mod.id}.${f.key}`]: value });
  }
  return Product.countDocuments({ $or: or });
}

// Inline "+ Add new size" from the product form (or Settings).
export async function addValue(key, input) {
  const list = await getList(key);
  const v = cleanValue(input, list.swatch);
  const dupe = list.values.find((x) => same(x.value, v.value));
  if (dupe) {
    if (dupe.hidden) {
      dupe.hidden = false;
      await list.save();
    }
    return list;
  }
  list.values.push(v);
  await list.save();
  return list;
}

// Settings: rename, reorder, add, hide, recolor, remove (unused values only).
export async function updateList(key, { name, values }) {
  const list = await getList(key);
  if (name !== undefined) {
    const n = String(name).trim().slice(0, 60);
    if (!n) throw new ServiceError(400, { error: "Name can't be empty" });
    list.name = n;
  }
  if (values !== undefined) {
    if (!Array.isArray(values)) throw new ServiceError(400, { error: "Values must be a list" });
    const next = [];
    for (const raw of values) {
      const v = cleanValue(raw, list.swatch);
      if (next.some((x) => same(x.value, v.value))) throw new ServiceError(400, { error: `"${v.value}" is in the list twice` });
      next.push(v);
    }
    const removed = list.values.filter((old) => !next.some((v) => v.value === old.value));
    for (const old of removed) {
      const used = await valueUsage(key, old.value);
      if (used) throw new ServiceError(400, { error: `"${old.value}" is used by ${used} product(s) - hide it instead of deleting it` });
    }
    list.values = next;
  }
  await list.save();
  return list;
}

export async function createList({ name, kind = "field", swatch = false }) {
  const n = String(name || "").trim().slice(0, 60);
  if (!n) throw new ServiceError(400, { error: "Name can't be empty" });
  if (!["variant", "field", "template"].includes(kind)) throw new ServiceError(400, { error: "Unknown list type" });
  let key = slugify(n);
  if (await OptionList.exists({ key })) key = `${key}-${Date.now().toString(36).slice(-4)}`;
  return OptionList.create({ key, name: n, optionName: n, kind, swatch: !!swatch, custom: true, values: [] });
}

export async function deleteList(key) {
  const list = await getList(key);
  if (!list.custom) throw new ServiceError(400, { error: "Built-in lists can't be deleted - hide their values instead" });
  for (const v of list.values) {
    if (await valueUsage(key, v.value)) throw new ServiceError(400, { error: `"${v.value}" is still used by products` });
  }
  await list.deleteOne();
}
