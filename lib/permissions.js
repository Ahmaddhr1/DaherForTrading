// Fixed, named permissions an owner can grant an individual employee,
// beyond the base owner/employee role split. An owner always has every
// permission implicitly - these only ever apply to an "employee".
//
// New/existing employees default to none of these (see models/Admin.js) -
// some of these gate actions (deleting records, managing disbursements,
// processing returns) that every employee could already do before this
// feature existed with no check at all, so defaulting to "off" is a
// deliberate tightening, not a bug: an owner must explicitly re-grant them.
export const PERMISSION_KEYS = [
  "canDelete",
  "canViewStats",
  "canManageDisbursements",
  "canProcessReturns",
  "canManageCustomers",
  "canManagePayments",
  "canManageCompanies",
  "canManageProducts",
  "canManageCategories",
  "canCreateOrders",
  "canFinalizeOrders",
  "canManageSettings",
];

export const PERMISSION_LABELS = {
  canDelete: "Delete records (products, customers, orders, companies, categories)",
  canViewStats: "View stats & profit/supplier reports",
  canManageDisbursements: "Create, edit, and delete disbursements (incl. recurring)",
  canProcessReturns: "Process customer returns/refunds",
  canManageCustomers: "Create and edit customer profiles",
  canManagePayments: "Record customer payments",
  canManageCompanies: "Create and edit companies, and record purchases",
  canManageProducts: "Create and edit products, and adjust stock",
  canManageCategories: "Create and edit categories",
  canCreateOrders: "Create orders/drafts, and edit draft orders",
  canFinalizeOrders: "Record order payments and finalize draft orders",
  canManageSettings: "Edit business settings (dollar rate, tax rate) and send test backup emails",
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
