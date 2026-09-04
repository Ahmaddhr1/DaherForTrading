import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    product: {
      type: mongoose.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    total: { type: Number, required: true },
    paid: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Purchase =
  mongoose.models.Purchase || mongoose.model("Purchase", purchaseSchema);
export default Purchase;
