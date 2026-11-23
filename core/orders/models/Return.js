import mongoose from "mongoose";

// A customer sending stock back from a past (non-draft) order. Deliberately
// doesn't rewrite the original Order's total/amountpaid/status - that stays
// the historical record of what was actually sold; a return is its own
// transaction that adjusts the customer's running debt and (optionally)
// restocks inventory, the same way a Payment adjusts debt without touching
// the order it's against.
const returnSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Types.ObjectId, ref: "Order", required: true },
    customer: { type: mongoose.Types.ObjectId, ref: "Customer", required: true },
    items: [
      {
        // Absent for a custom/ad-hoc line item, same convention as
        // Order.products - nothing to restock in inventory for those.
        productId: { type: mongoose.Types.ObjectId, ref: "Product", required: false },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        // The price the customer was actually charged on the original
        // order line (not the product's current price), so the refund
        // total stays correct even if the price has since changed.
        unitPrice: { type: Number, required: true },
      },
    ],
    // Whether returned items were added back to inventory (unchecked for
    // damaged/unsellable stock - still refunded, just not restocked).
    restocked: { type: Boolean, default: true },
    totalRefundAmount: { type: Number, required: true },
    reason: { type: String, trim: true },
    // Customer.debt before/after this return, for an audit trail - same
    // convention as core/payments/models/Payment.js.
    previousDebt: { type: Number, required: true },
    newDebt: { type: Number, required: true },
    admin: { type: mongoose.Types.ObjectId, ref: "Admin" },
    adminName: { type: String },
  },
  { timestamps: true }
);

returnSchema.index({ order: 1 });
returnSchema.index({ customer: 1, createdAt: -1 });

const Return = mongoose.models.Return || mongoose.model("Return", returnSchema);
export default Return;
