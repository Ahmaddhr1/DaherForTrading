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
  },
  { timestamps: true }
);

const Payment =
  mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
export default Payment;
