// Fixed, named permissions an owner can grant an individual employee,
// beyond the base owner/employee role split. An owner always has every
// permission implicitly - these only ever apply to an "employee".
//
// New/existing employees default to none of these (see core/platform/models/Admin.js) -
// some of these gate actions (deleting records, managing disbursements,
// processing returns) that every employee could already do before this
// feature existed with no check at all, so defaulting to "off" is a
// deliberate tightening, not a bug: an owner must explicitly re-grant them.
export const PERMISSION_KEYS = [
  "canDelete",
  "canViewStats",
  "canManageDisbursements",
  "canProcessReturns",
  "canManagePayments",
  "canManageSettings",
  "canCreateCustomers",
  "canEditCustomers",
  "canCreateCompanies",
  "canEditCompanies",
  "canRecordPurchases",
  "canCreateProducts",
  "canEditProducts",
  "canCreateCategories",
  "canEditCategories",
  "canCreateOrders",
  "canEditOrders",
  "canOverrideOrderPricing",
  "canFinalizeOrders",
  "canManageDeliveries",
];

export const PERMISSION_LABELS = {
  canDelete: "Delete records (products, customers, orders, companies, categories)",
  canViewStats: "View stats & profit/supplier reports",
  canManageDisbursements: "Create, edit, and delete disbursements (incl. recurring)",
  canProcessReturns: "Process customer returns/refunds",
  canManagePayments: "Record customer payments",
  canManageSettings: "Edit business settings (dollar rate, tax rate) and send test backup emails",
  canCreateCustomers: "Create new customers",
  canEditCustomers: "Edit existing customer profiles",
  canCreateCompanies: "Create new companies (suppliers)",
  canEditCompanies: "Edit existing company details",
  canRecordPurchases: "Record purchases from a company (restock products)",
  canCreateProducts: "Create new products",
  canEditProducts: "Edit existing products, adjust stock, and bulk price/category updates",
  canCreateCategories: "Create new categories",
  canEditCategories: "Edit existing categories",
  canCreateOrders: "Create new orders/drafts",
  canEditOrders: "Edit draft or pending orders, and link a customer to a draft",
  canOverrideOrderPricing: "Override catalog prices and price custom items on an order",
  canFinalizeOrders: "Record order payments and finalize draft orders",
  canManageDeliveries: "Set delivery status and delivery person on orders",
};

export function emptyPermissions() {
  return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, false]));
}

// `user` is whatever getUserFromCookie()/the JWT payload carries - an
// owner always passes; an employee needs the specific permission granted.
export function hasPermission(user, key) {
  if (!user) return false;
  if (user.role === "owner") return true;
  return !!user.permissions?.[key];
}

// For a route handler: returns a 403 NextResponse if `user` lacks `key`,
// or null if the request can proceed. Only usable in a Node (not Edge)
// context - route handlers, not middleware.js (which does the same check
// inline to stay Edge-compatible).
export async function requirePermission(user, key) {
  if (hasPermission(user, key)) return null;
  const { NextResponse } = await import("next/server");
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// True if `user` has at least one of `keys` - for an action shared by two
// otherwise-separate permissions (e.g. uploading a product image, needed by
// both creating and editing a product).
export function hasAnyPermission(user, keys) {
  return keys.some((key) => hasPermission(user, key));
}

// Same as requirePermission, but passes if `user` has any one of `keys`.
export async function requireAnyPermission(user, keys) {
  if (hasAnyPermission(user, keys)) return null;
  const { NextResponse } = await import("next/server");
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
