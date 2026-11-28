import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    // Barcode (EAN/UPC/Code128...) for scanning products into orders and
    // printing labels. Unique when set; left unset (not "") when empty.
    barcode: { type: String, trim: true, index: { unique: true, sparse: true } },
    quantity: { type: Number, default: 0 },
    // Four price tiers, one per customer tier (see core/customers/models/Customers.js's
    // priceTier and core/products/priceTiers.js for the shared mapping). `price` is
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
    // Optional expiry date (perishable stock). Products expiring within
    // AppSettings.expiryAlertDays show up in the dashboard's expiry alert.
    expiryDate: { type: Date, default: null, index: true },
    // How many days before expiryDate this product should appear in the
    // expiry alert. Empty = the default from Settings (AppSettings.expiryAlertDays).
    expiryAlertDays: { type: Number, default: null, min: 1, max: 3650 },
    // Supplier to quick-reorder from (see the "Reorder from supplier" link
    // on the product edit page, which pre-fills a purchase form).
    defaultSupplier: { type: mongoose.Types.ObjectId, ref: "Company", default: null },
    img: { type: [String], default: [] },
    // Default discount percentage (0-100) applied to this product's line
    // when it's added to an order - see addorder/page.js, which pre-fills
    // the line's $ discount from this instead of starting at 0.
    discount: { type: Number, default: 0, min: 0, max: 100 },
    // Data owned by add-on modules (modules/), one key per module id, e.g.
    // extra.catalog = { brand, summary, ... }, extra.variant = { group, options }.
    // Core never reads inside it; modules/server.js validates what goes in.
    extra: { type: mongoose.Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true }
);

productSchema.index({ "extra.variant.group": 1 }, { sparse: true });

const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);
export default Product;
