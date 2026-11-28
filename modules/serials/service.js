// Serial number / IMEI tracking. Units are received per product, assigned to
// an order's line when sold (never more than the line's quantity), and carry
// their warranty from the sale date.
import mongoose from "mongoose";
import SerialUnit from "./models/SerialUnit";
import Product from "@/core/products/models/Products";
import Order from "@/core/orders/models/Orders";
import "@/core/customers/models/Customers";
import "@/core/suppliers/models/Company";
import { ServiceError } from "@/core/shared/serviceError";
import { logActivity } from "@/core/audit/activityLog";

const bad = (error) => new ServiceError(400, { error });
const notFound = (error) => new ServiceError(404, { error });
const isId = (v) => mongoose.isValidObjectId(v);
const MAX_BATCH = 500;

export function parseSerials(input) {
  const raw = Array.isArray(input) ? input : String(input || "").split(/[\n,;\t]+/);
  const out = [];
  for (const s of raw) {
    const v = String(s).trim().toUpperCase().replace(/\s+/g, "");
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

// Warranty months come from the product's own details (electronics or furniture).
export function warrantyMonthsOf(product) {
  const e = product?.extra || {};
  return Number(e.electronics?.warrantyMonths ?? e.furniture?.warrantyMonths ?? 0) || 0;
}

export function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0); // Jan 31 + 1 month -> Feb 28/29
  return d;
}

export function warrantyStatus(unit, now = new Date()) {
  if (!unit.soldAt || !unit.warrantyMonths) return { active: false, endsAt: null, daysLeft: 0, months: unit.warrantyMonths || 0 };
  const endsAt = unit.warrantyEndsAt || addMonths(unit.soldAt, unit.warrantyMonths);
  const daysLeft = Math.ceil((new Date(endsAt) - now) / 864e5);
  return { active: daysLeft > 0, endsAt, daysLeft: Math.max(0, daysLeft), months: unit.warrantyMonths };
}

export async function addUnits({ productId, serials, supplier, note }, admin) {
  if (!isId(productId)) throw notFound("Product not found");
  const product = await Product.findById(productId).select("name");
  if (!product) throw notFound("Product not found");
  const list = parseSerials(serials);
  if (!list.length) throw bad("Type or scan at least one serial / IMEI");
  if (list.length > MAX_BATCH) throw bad(`At most ${MAX_BATCH} at a time`);
  const tooLong = list.find((s) => s.length > 64);
  if (tooLong) throw bad(`"${tooLong.slice(0, 20)}..." is too long`);
  const existing = await SerialUnit.find({ serial: { $in: list } }).select("serial");
  if (existing.length) throw bad(`Already recorded: ${existing.map((u) => u.serial).slice(0, 10).join(", ")}`);
  const by = admin?.adminname || "";
  const docs = await SerialUnit.insertMany(
    list.map((serial) => ({
      product: product._id,
      serial,
      supplier: isId(supplier) ? supplier : null,
      note: String(note || "").slice(0, 300),
      history: [{ status: "in_stock", note: "Received", by }],
    }))
  );
  await logActivity({ admin, action: "product.serialsAdd", entityType: "Product", entityId: product._id, entityLabel: product.name, summary: `Recorded ${docs.length} serial number(s) for "${product.name}"` });
  return docs;
}

export async function listUnits({ productId, status, q, page = 1, limit = 50 } = {}) {
  const filter = {};
  if (productId) {
    if (!isId(productId)) return { units: [], total: 0, pages: 1 };
    filter.product = productId;
  }
  if (status) filter.status = status;
  if (q) filter.serial = { $regex: String(q).trim().toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") };
  const [total, units] = await Promise.all([
    SerialUnit.countDocuments(filter),
    SerialUnit.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("product", "name")
      .populate("customer", "fullName phoneNumber")
      .lean(),
  ]);
  const counts = productId
    ? Object.fromEntries((await SerialUnit.aggregate([{ $match: { product: new mongoose.Types.ObjectId(String(productId)) } }, { $group: { _id: "$status", n: { $sum: 1 } } }])).map((c) => [c._id, c.n]))
    : undefined;
  return { total, pages: Math.max(1, Math.ceil(total / limit)), units: units.map((u) => ({ ...u, warranty: warrantyStatus(u) })), counts };
}

// Warranty lookup by serial / IMEI.
export async function lookup(serial) {
  const s = parseSerials([serial])[0];
  if (!s) throw bad("Type a serial / IMEI");
  const unit = await SerialUnit.findOne({ serial: s })
    .populate("product", "name extra img")
    .populate("customer", "fullName phoneNumber")
    .populate("supplier", "name")
    .lean();
  if (!unit) throw notFound(`No unit with serial ${s}`);
  return { unit: { ...unit, warranty: warrantyStatus(unit) } };
}

// Sell: link in-stock units to an order line. The order must contain the
// product, and a line can't get more serials than its quantity.
export async function assignToOrder({ orderId, productId, unitIds }, admin) {
  if (!isId(orderId)) throw notFound("Order not found");
  const order = await Order.findById(orderId);
  if (!order) throw notFound("Order not found");
  if (order.status === "draft") throw bad("Finalize the draft before assigning serial numbers");
  const qty = (order.products || []).filter((l) => String(l.productId) === String(productId)).reduce((n, l) => n + (l.quantity || 0), 0);
  if (!qty) throw bad("This product isn't in the order");
  const ids = [...new Set((unitIds || []).map(String))].filter(isId);
  if (!ids.length) throw bad("Pick at least one serial");
  const already = await SerialUnit.countDocuments({ order: order._id, product: productId, status: "sold" });
  if (already + ids.length > qty) throw bad(`Only ${qty - already} more serial(s) fit this order line`);
  const units = await SerialUnit.find({ _id: { $in: ids }, product: productId });
  if (units.length !== ids.length) throw bad("Some serials don't belong to this product");
  const notInStock = units.find((u) => u.status !== "in_stock");
  if (notInStock) throw bad(`${notInStock.serial} isn't in stock`);
  const product = await Product.findById(productId).select("name extra");
  const months = warrantyMonthsOf(product);
  const soldAt = order.createdAt || new Date();
  for (const u of units) {
    u.status = "sold";
    u.order = order._id;
    u.customer = order.customer || null;
    u.soldAt = soldAt;
    u.warrantyMonths = months;
    u.warrantyEndsAt = months ? addMonths(soldAt, months) : null;
    u.history.push({ status: "sold", note: `Order ${String(order._id).slice(-6)}`, by: admin?.adminname || "" });
    await u.save();
  }
  await logActivity({ admin, action: "order.serialsAssign", entityType: "Order", entityId: order._id, entityLabel: product?.name, summary: `Assigned ${units.length} serial(s) of "${product?.name}" to an order: ${units.map((u) => u.serial).join(", ")}` });
  return units;
}

// Returned by the customer, back in stock, or defective.
const TRANSITIONS = { sold: ["returned", "defective"], returned: ["in_stock", "defective"], defective: ["in_stock"], in_stock: ["defective"] };

export async function setStatus(unitId, { status, note }, admin) {
  if (!isId(unitId)) throw notFound("Unit not found");
  const unit = await SerialUnit.findById(unitId);
  if (!unit) throw notFound("Unit not found");
  if (!(TRANSITIONS[unit.status] || []).includes(status)) throw bad(`Can't change ${unit.status.replace("_", " ")} to ${String(status).replace("_", " ")}`);
  unit.status = status;
  if (status === "in_stock") {
    unit.order = null;
    unit.customer = null;
    unit.soldAt = null;
    unit.warrantyEndsAt = null;
  }
  unit.history.push({ status, note: String(note || "").slice(0, 300), by: admin?.adminname || "" });
  await unit.save();
  await logActivity({ admin, action: "product.serialStatus", entityType: "Product", entityId: unit.product, entityLabel: unit.serial, summary: `Serial ${unit.serial} marked ${status.replace("_", " ")}` });
  return unit;
}

export async function unitsForOrder(orderId) {
  if (!isId(orderId)) return [];
  return SerialUnit.find({ order: orderId }).select("serial product status warrantyEndsAt warrantyMonths soldAt").lean();
}
