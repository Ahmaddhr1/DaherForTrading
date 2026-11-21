// Server-side helpers for the detailed audit trail.
//
// Every write route builds an "audit view" of the affected document before
// and after the change (references resolved to readable names), then calls
// diffViews() to get the exact list of field changes stored on the
// ActivityLog entry. Creates and deletes use snapshotChanges() so the log
// still shows every value that was set (create) or lost (delete).

import mongoose from "mongoose";
import Category from "@/models/Category";
import Company from "@/models/Company";
import Customer from "@/models/Customers";
import { AUDIT_FIELDS, formatAuditValue } from "@/lib/auditFields";

const isBlank = (v) =>
  v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

function toPlain(doc) {
  if (!doc) return null;
  return typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
}

const idOf = (v) => (v && typeof v === "object" && v._id ? v._id : v);

async function nameFor(Model, field, id) {
  const ref = idOf(id);
  if (!ref || !mongoose.isValidObjectId(ref)) return ref ? String(ref) : null;
  const doc = await Model.findById(ref).select(field).lean();
  return doc ? doc[field] : "(deleted)";
}

// Comparable, storage-friendly form of a value: ObjectIds become strings,
// numbers are rounded to cents so float noise doesn't show up as a change.
function normalize(value) {
  if (value === undefined) return null;
  if (value instanceof mongoose.Types.ObjectId) return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return Math.round(value * 100) / 100;
  if (Array.isArray(value)) return value.map(normalize);
  return value;
}

const sameValue = (a, b) => {
  if (isBlank(a) && isBlank(b)) return true;
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
};

const getPath = (obj, path) =>
  path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);

// Build the readable view of a document for a given entity type: plain
// object with references swapped for names.
export async function auditView(entityType, doc) {
  const view = toPlain(doc);
  if (!view) return null;

  switch (entityType) {
    case "Product":
      view.category = view.category ? await nameFor(Category, "name", view.category) : null;
      view.defaultSupplier = view.defaultSupplier
        ? await nameFor(Company, "name", view.defaultSupplier)
        : null;
      break;
    case "Order":
    case "Payment":
      view.customer = view.customer
        ? await nameFor(Customer, "fullName", view.customer)
        : view.customerNameText
          ? `${view.customerNameText} (not linked)`
          : null;
      break;
    case "Purchase":
      view.company = view.company ? await nameFor(Company, "name", view.company) : null;
      break;
    case "Customer":
      if (view.phoneNumber != null) view.phoneNumber = String(view.phoneNumber);
      break;
    default:
      break;
  }
  return view;
}

// Exact per-field differences between two views of the same entity.
export function diffViews(entityType, before, after) {
  const fields = AUDIT_FIELDS[entityType] || [];
  const changes = [];
  for (const [key, label, format] of fields) {
    const b = getPath(before || {}, key);
    const a = getPath(after || {}, key);
    if (!sameValue(b, a)) {
      changes.push({
        field: key,
        label,
        format: format || "text",
        before: isBlank(b) ? null : normalize(b),
        after: isBlank(a) ? null : normalize(a),
      });
    }
  }
  return changes;
}

// Every non-empty field of a newly created ("create") or removed ("delete")
// entity, as before/after pairs against nothing.
export function snapshotChanges(entityType, view, mode = "create") {
  const empty = {};
  return mode === "create"
    ? diffViews(entityType, empty, view)
    : diffViews(entityType, view, empty);
}

// Line-item differences for an order (or anything with order-style lines).
// Lines are matched by product (or by name for custom lines); each line
// that was added, removed, or changed becomes one change entry formatted
// as "qty × price − discount".
const lineKey = (line) => (line.productId ? `p:${String(idOf(line.productId))}` : `c:${line.name}`);
const lineValue = (line) => ({
  quantity: line.quantity,
  price: normalize(line.price),
  discount: normalize(line.discount || 0),
  free: !!line.free,
});

export function diffOrderLines(beforeLines = [], afterLines = []) {
  const beforeMap = new Map(beforeLines.map((l) => [lineKey(l), l]));
  const afterMap = new Map(afterLines.map((l) => [lineKey(l), l]));
  const keys = [...new Set([...beforeMap.keys(), ...afterMap.keys()])];
  const changes = [];
  for (const key of keys) {
    const b = beforeMap.get(key);
    const a = afterMap.get(key);
    const bv = b ? lineValue(b) : null;
    const av = a ? lineValue(a) : null;
    if (JSON.stringify(bv) === JSON.stringify(av)) continue;
    const name = (a || b).name || "Item";
    changes.push({
      field: `items.${key}`,
      label: `Item: ${name}${(a || b).isCustom ? " (custom)" : ""}`,
      format: "line",
      before: bv,
      after: av,
    });
  }
  return changes;
}

// One extra before/after row that isn't a field on the entity itself, e.g.
// the customer's debt moving because of an order payment.
export function extraChange(field, label, before, after, format = "text") {
  if (sameValue(before, after)) return null;
  return {
    field,
    label,
    format,
    before: isBlank(before) ? null : normalize(before),
    after: isBlank(after) ? null : normalize(after),
  };
}

// Short readable reference for an order, e.g. "order #A1B2C3" (last 6 hex
// chars of its id - the same tail shown on invoices/receipts).
export function orderLabel(order) {
  const id = String(order?._id || order || "");
  return `order #${id.slice(-6).toUpperCase()}`;
}

// Short, human-readable list of the first few changes for the one-line
// summary shown in the activity table, e.g.
//   Retail price: $1.50 → $1.75; Unit: pcs → box (+2 more)
export function describeChanges(changes, max = 3) {
  const list = (changes || []).filter(Boolean);
  if (list.length === 0) return "";
  const shown = list.slice(0, max).map((c) => {
    const b = formatAuditValue(c.before, c.format);
    const a = formatAuditValue(c.after, c.format);
    return `${c.label.replace(/^Permission: /, "")}: ${b} → ${a}`;
  });
  const more = list.length > max ? ` (+${list.length - max} more)` : "";
  return shown.join("; ") + more;
}
