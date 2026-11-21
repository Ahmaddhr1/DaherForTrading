import mongoose from "mongoose";

// Money paid to a company (supplier) - the supplier-side mirror of Payment.
// Created when an unpaid purchase is marked as paid (see
// app/api/purchases/[id]/markpaid/route.js) and listed under the Payments
// tab's "Supplier payments" view.
const supplierPaymentSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Types.ObjectId, ref: "Company", required: true },
    // The purchase this payment settled, when it came from one.
    purchase: { type: mongoose.Types.ObjectId, ref: "Purchase", default: null },
    // For a manual "Pay a supplier" payment: which unpaid purchases it was
    // applied to (oldest first) - see lib/paymentAllocation.js.
    allocations: {
      type: [
        {
          purchase: { type: mongoose.Types.ObjectId, ref: "Purchase" },
          productName: String,
          amount: Number,
          _id: false,
        },
      ],
      default: [],
    },
    amount: { type: Number, required: true },
    // What we owed this company before/after the payment.
    previousDebt: { type: Number, required: true },
    newDebt: { type: Number, required: true },
    admin: { type: mongoose.Types.ObjectId, ref: "Admin" },
    adminName: { type: String },
  },
  { timestamps: true }
);

supplierPaymentSchema.index({ createdAt: -1 });
supplierPaymentSchema.index({ company: 1, createdAt: -1 });

const SupplierPayment =
  mongoose.models.SupplierPayment || mongoose.model("SupplierPayment", supplierPaymentSchema);
export default SupplierPayment;
