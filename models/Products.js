import mongoose, { Mongoose } from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    price: { type: Number },
    initialPrice: { type: Number },
    profit: { type: Number },
    category: {
      type: mongoose.Types.ObjectId,
      ref: "Category",
    },
    nbOfOrders: { type: Number, default: 0 },
    // Unit of measure shown next to quantity ("12 kg in stock" instead of
    // just "12") - freeform text, not an enum, since businesses vary.
    unit: { type: String, default: "pcs", trim: true },
    // Below this quantity (and above 0), the product shows as low-stock on
    // the Products page and the dashboard's LowStockAlerts widget.
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    // Supplier to quick-reorder from (see the "Reorder from supplier" link
    // on the product edit page, which pre-fills a purchase form).
    defaultSupplier: { type: mongoose.Types.ObjectId, ref: "Company", default: null },
  },
  { timestamps: true }
);

const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);
export default Product;
