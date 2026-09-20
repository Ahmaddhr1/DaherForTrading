import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    adminname: { type: String, required: true, unique: true },
    password: { type: String, required: true },
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
  },
  { timestamps: true }
);

const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);
export default Admin;
