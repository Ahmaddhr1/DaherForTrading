// Field definitions + value formatting for the detailed audit trail.
//
// Plain, dependency-free module so it's safe on both sides: the server uses
// it to build the per-field `changes` stored on each ActivityLog entry (see
// lib/audit.js), and the activity pages use formatAuditValue() to render the
// stored before/after values.
//
// Each entity lists the fields worth auditing as [key, label, format]. Keys
// refer to the "audit view" of a document built in lib/audit.js, where
// references (category, supplier, customer...) are already resolved to
// readable names.

import { PERMISSION_KEYS, PERMISSION_LABELS } from "@/lib/permissions";

const PERMISSION_FIELDS = PERMISSION_KEYS.map((key) => [
  `permissions.${key}`,
  `Permission: ${PERMISSION_LABELS[key] || key}`,
  "bool",
]);

export const AUDIT_FIELDS = {
  Product: [
    ["name", "Name"],
    ["price", "Retail price", "money"],
    ["priceWholesale", "Wholesale price", "money"],
    ["priceDistributor", "Distributor price", "money"],
    ["priceVip", "VIP price", "money"],
    ["initialPrice", "Cost price", "money"],
    ["discount", "Default discount", "percent"],
    ["quantity", "Stock quantity", "number"],
    ["unit", "Unit"],
    ["lowStockThreshold", "Low-stock alert at", "number"],
    ["expiryDate", "Expiry date", "day"],
    ["category", "Category"],
    ["defaultSupplier", "Default supplier"],
    ["img", "Images", "count"],
  ],
  Customer: [
    ["fullName", "Full name"],
    ["phoneNumber", "Phone number"],
    ["priceTier", "Price tier", "tier"],
    ["debt", "Debt", "money"],
    ["notes", "Notes"],
  ],
  Company: [
    ["name", "Name"],
    ["phoneNumber", "Phone number"],
    ["address", "Address"],
    ["debt", "Debt (owed to them)", "money"],
  ],
  Category: [["name", "Name"]],
  Order: [
    ["customer", "Customer"],
    ["status", "Status", "status"],
    ["total", "Total", "money"],
    ["discountTotal", "Discount total", "money"],
    ["taxRate", "Tax rate", "percent"],
    ["taxAmount", "Tax amount", "money"],
    ["amountpaid", "Amount paid", "money"],
    ["remainingBalance", "Remaining balance", "money"],
    ["notes", "Notes"],
  ],
  Payment: [
    ["customer", "Customer"],
    ["amount", "Amount", "money"],
    ["previousDebt", "Debt before", "money"],
    ["newDebt", "Debt after", "money"],
  ],
  Purchase: [
    ["company", "Supplier"],
    ["productName", "Product"],
    ["unitPrice", "Unit price", "money"],
    ["quantity", "Quantity", "number"],
    ["discount", "Discount", "money"],
    ["taxRate", "Tax rate", "percent"],
    ["taxAmount", "Tax amount", "money"],
    ["total", "Total", "money"],
    ["paid", "Paid upfront", "bool"],
  ],
  Disbursement: [
    ["description", "Description"],
    ["amount", "Amount", "money"],
    ["category", "Category"],
  ],
  RecurringDisbursement: [
    ["description", "Description"],
    ["amount", "Amount", "money"],
    ["category", "Category"],
    ["dayOfMonth", "Day of month", "number"],
    ["active", "Active", "bool"],
  ],
  Admin: [
    ["adminname", "Username"],
    ["email", "Email"],
    ["role", "Role", "role"],
    ["active", "Active", "bool"],
    ...PERMISSION_FIELDS,
  ],
  Settings: [
    ["dollarRate", "Dollar rate (LBP)", "number"],
    ["taxRate", "Default tax rate", "percent"],
    ["expiryAlertDays", "Expiry alert (days ahead)", "number"],
  ],
};

export const AUDIT_ENTITY_TYPES = [
  "Order",
  "Payment",
  "Product",
  "Purchase",
  "Disbursement",
  "RecurringDisbursement",
  "Customer",
  "Company",
  "Category",
  "Return",
  "Admin",
  "Settings",
];

const TIER_LABELS = { 1: "Retail", 2: "Wholesale", 3: "Distributor", 4: "VIP" };
const STATUS_LABELS = {
  draft: "Draft",
  pending: "Pending",
  partiallyPaid: "Partially paid",
  paid: "Paid",
};

const isBlank = (v) => v === null || v === undefined || v === "";

function money(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n);
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatLine(line, tr = (s) => s) {
  if (!line || typeof line !== "object") return String(line);
  const qty = line.quantity ?? 0;
  const unit = line.unit ? ` ${line.unit}` : "";
  let text = `${qty}${unit} × ${money(line.price ?? 0)}`;
  if (line.free) text += ` (${tr("free")})`;
  else if (Number(line.discount) > 0) text += ` − ${money(line.discount)} ${tr("discount")}`;
  return text;
}

// Turn a stored before/after value into display text. Blank values render
// as an em dash so "set for the first time" / "cleared" read naturally.
const identity = (s) => s;

export function formatAuditValue(value, format, tr = identity) {
  if (isBlank(value) || (Array.isArray(value) && value.length === 0 && format !== "count")) {
    return "—";
  }
  switch (format) {
    case "money":
      return money(value);
    case "percent":
      return `${Number(value)}%`;
    case "number":
      return Number(value).toLocaleString("en-US");
    case "bool":
      return value ? tr("Yes") : tr("No");
    case "tier":
      return TIER_LABELS[value] ? `${tr(TIER_LABELS[value])} (${tr("tier")} ${value})` : String(value);
    case "status":
      return tr(STATUS_LABELS[value] || String(value));
    case "role":
      return value === "owner" ? tr("Owner") : value === "employee" ? tr("Employee") : String(value);
    case "count": {
      const n = Array.isArray(value) ? value.length : Number(value) || 0;
      return `${n} ${n === 1 ? tr("image") : tr("images")}`;
    }
    case "line":
      return formatLine(value, tr);
    case "date":
      return new Date(value).toLocaleString();
    case "day":
      return new Date(value).toLocaleDateString();
    default:
      if (Array.isArray(value)) return value.join(", ");
      if (typeof value === "object") return JSON.stringify(value);
      return tr(String(value));
  }
}

// Readable title for a dot-namespaced action, e.g. "product.priceChange" ->
// "Product price changed", "order.markPaid" -> "Order marked paid".
const ACTION_VERBS = {
  create: "created",
  edit: "edited",
  delete: "deleted",
  priceChange: "price changed",
  stockAdjustment: "stock adjusted",
  bulkPriceUpdate: "prices bulk-updated",
  bulkCategoryReassign: "category bulk-reassigned",
  bulkDelete: "bulk-deleted",
  finalize: "finalized",
  markPaid: "marked paid",
  payment: "payment recorded",
  return: "return processed",
  update: "updated",
  restore: "backup restored",
  clear: "cleared",
};
const ENTITY_WORDS = {
  recurringDisbursement: "Recurring disbursement",
  activityLog: "Activity log",
  settings: "Settings",
};

export function describeAction(action = "", tr = identity) {
  const [entity = "", verb = ""] = action.split(".");
  const entityWord =
    ENTITY_WORDS[entity] || (entity ? entity.charAt(0).toUpperCase() + entity.slice(1) : "Record");
  const verbWord = ACTION_VERBS[verb] || verb.replace(/([A-Z])/g, " $1").toLowerCase();
  if (tr !== identity && tr("Record") !== "Record") {
    // translated: "<entity> · <verb>" reads naturally in Arabic word order
    return `${tr(entityWord)} · ${tr(verbWord)}`.trim();
  }
  return `${entityWord} ${verbWord}`.trim();
}

// "create" | "delete" | "change" - drives the badge colour and how the
// before/after columns are labelled on the activity pages.
export function actionKind(action = "") {
  const verb = action.split(".")[1] || "";
  if (verb === "create") return "create";
  if (verb === "delete" || verb === "bulkDelete" || verb === "clear") return "delete";
  return "change";
}

// Dashboard page for the affected record, when it still exists.
export function entityHref(entry) {
  if (!entry?.entityId || actionKind(entry.action) === "delete") return null;
  const id = entry.entityId;
  switch (entry.entityType) {
    case "Product":
      return `/dashboard/products/${id}`;
    case "Order":
      return `/dashboard/orders/${id}`;
    case "Customer":
      return `/dashboard/customers/${id}`;
    case "Company":
      return `/dashboard/companies/${id}`;
    default:
      return null;
  }
}

// Record labels like "order #4F2A91" are stored in English.
export function translateEntityLabel(label, tr = identity) {
  if (!label || tr === identity) return label;
  return label.replace(/^order #/, `${tr("Order #")} `);
}

// Change labels are stored in English (e.g. "Permission: Create new products",
// "Item: Olive Oil 1L", "Olive Oil 1L — Cost price"). Translate the fixed
// parts and keep names (products, suppliers) as they are.
const LABEL_PREFIXES = ["Permission: ", "Item: ", "Returned: ", "Deleted: ", "Product removed: ", "Applied to purchase: ", "Applied to ", "Restored "];
export function translateChangeLabel(label, tr = identity) {
  if (!label || tr === identity) return label;
  for (const prefix of LABEL_PREFIXES) {
    if (label.startsWith(prefix)) {
      const rest = label.slice(prefix.length);
      const translatedRest = prefix === "Permission: " ? tr(rest) : rest;
      return `${tr(prefix.trim())} ${translatedRest}`;
    }
  }
  const dash = label.lastIndexOf(" — ");
  if (dash > 0) return `${label.slice(0, dash)} — ${tr(label.slice(dash + 3))}`;
  return tr(label);
}
