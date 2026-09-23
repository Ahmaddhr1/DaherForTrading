import mongoose, { Mongoose } from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    // Four price tiers, one per customer tier (see models/Customers.js's
    // priceTier and lib/priceTiers.js for the shared mapping). `price` is
    // reused as the Retail (tier 1) price so every pre-existing feature
    // that reads product.price keeps working unchanged; the other three
    // are net-new and fall back to `price` wherever they're unset (e.g. a
    // product created before this feature existed).
    price: { type: Number }, // Retail (tier 1)
    priceWholesale: { type: Number, default: null }, // Wholesale (tier 2)
    priceDistributor: { type: Number, default: null }, // Distributor (tier 3)
    priceVip: { type: Number, default: null }, // VIP (tier 4)
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
