import mongoose from "mongoose";

// A real cash or bank account the business actually holds money in.
// Balances are never stored directly - they're computed on read from
// every Payment/Disbursement/Purchase/SupplierPayment that references
// this account, so the balance can never drift out of sync with the
// transactions that make it up. `openingBalance` is the starting point
// for that computation (e.g. the real bank balance on the day this
// account was set up in the app).
const accountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ["cash", "bank"], default: "cash" },
    openingBalance: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

const Account = mongoose.models.Account || mongoose.model("Account", accountSchema);
export default Account;
