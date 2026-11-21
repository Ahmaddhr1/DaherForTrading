import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    adminname: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // Required for every new admin going forward (enforced in
    // app/api/admin/create/route.js) - an admin with an email on file must
    // verify a one-time code sent there before their session is issued
    // (see app/api/admin/login/route.js). Admins created before this
    // feature existed have no email and keep logging in without a code
    // until an owner sets one via the Admins page.
    email: { type: String, trim: true, lowercase: true, default: null },
    // "owner" has full access, including settings, backups, and managing
    // other admins. "employee" gets day-to-day access (orders, customers,
    // payments, products, purchases, disbursements) but not those.
    // Enforced server-side in middleware.js - this field alone doesn't
    // restrict anything.
    role: { type: String, enum: ["owner", "employee"], default: "employee" },
    // A deactivated admin can no longer log in (checked in the login
    // route). Existing sessions remain valid until their token expires -
    // see scripts/backfill-admin-roles.mjs and app/api/admin/login/route.js.
    active: { type: Boolean, default: true },
    // One-time login code state - never returned by a default query
    // (select: false), only read explicitly in the login/verify-otp route.
    otpHash: { type: String, select: false, default: null },
    otpExpiresAt: { type: Date, select: false, default: null },
    otpLastSentAt: { type: Date, select: false, default: null },
    // Fine-grained extras for an "employee" beyond the base role - see
    // lib/permissions.js for the fixed set of keys and what each gates.
    // Meaningless for an "owner" (hasPermission() always returns true for
    // one regardless of this). Defaults to none granted, including for
    // employees created before this field existed - an owner must
    // explicitly grant each one.
    permissions: {
      canDelete: { type: Boolean, default: false },
      canViewStats: { type: Boolean, default: false },
      canManageDisbursements: { type: Boolean, default: false },
      canProcessReturns: { type: Boolean, default: false },
      canManageCustomers: { type: Boolean, default: false },
      canManagePayments: { type: Boolean, default: false },
      canManageCompanies: { type: Boolean, default: false },
      canManageProducts: { type: Boolean, default: false },
      canManageCategories: { type: Boolean, default: false },
      canCreateOrders: { type: Boolean, default: false },
      canFinalizeOrders: { type: Boolean, default: false },
      canManageSettings: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);
export default Admin;
