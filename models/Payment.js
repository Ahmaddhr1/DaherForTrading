import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    amount: { type: Number, required: true },
    previousDebt: { type: Number, required: true },
    newDebt: { type: Number, required: true },
    // "manual" = recorded from the Payments tab against the customer's
    // balance; "order" = created automatically when an order was marked
    // (partially) paid, with `order` pointing at it.
    source: { type: String, enum: ["manual", "order"], default: "manual" },
    order: { type: mongoose.Types.ObjectId, ref: "Order", default: null },
    // For a manual payment: which open orders it was applied to (oldest
    // first) - see lib/paymentAllocation.js. Keeps orders in sync with the
    // customer's debt so the same money is never collected twice.
    allocations: {
      type: [
        {
          order: { type: mongoose.Types.ObjectId, ref: "Order" },
          amount: Number,
          _id: false,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

const Payment =
  mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
export default Payment;
