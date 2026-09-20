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
    // Fixed $ discount off (unitPrice * quantity), taken off the supplier's
    // bill before tax.
    discount: { type: Number, default: 0 },
    // Tax rate (%) snapshotted at the time of this purchase (defaults from
    // AppSettings, editable per purchase) - see taxAmount below.
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    // Grand total: (unitPrice * quantity - discount) + taxAmount. This is
    // what's added to Company.debt when the purchase is unpaid.
    total: { type: Number, required: true },
    paid: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Purchase =
  mongoose.models.Purchase || mongoose.model("Purchase", purchaseSchema);
export default Purchase;
