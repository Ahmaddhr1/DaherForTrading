import mongoose from "mongoose";

// A style (e.g. "Basic T-shirt", "Galaxy S25", "Oslo sofa"). Its variants are
// ordinary Product documents carrying extra.variant = { group, options }, so
// stock, orders, returns, purchases, labels and reports all keep working.
const optionSchema = new mongoose.Schema(
  {
    list: { type: String, required: true }, // OptionList key, e.g. "size"
    name: { type: String, required: true }, // shown name, e.g. "Size"
    values: { type: [String], default: [] }, // chosen values, in display order
  },
  { _id: false }
);

const productGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: mongoose.Types.ObjectId, ref: "Category", default: null },
    options: { type: [optionSchema], default: [] },
    // Default prices for new variants (when a size/color is added later).
    prices: { type: mongoose.Schema.Types.Mixed, default: undefined },
    unit: { type: String, default: "pcs" },
    lowStockThreshold: { type: Number, default: 2, min: 0 },
    // Shared photos; photosByValue overrides per value of the first swatch
    // option (e.g. per color): { "Black": [url, ...] }.
    img: { type: [String], default: [] },
    photosByValue: { type: mongoose.Schema.Types.Mixed, default: undefined },
    // Shared module details copied to every variant (catalog, apparel...).
    extra: { type: mongoose.Schema.Types.Mixed, default: undefined },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.ProductGroup || mongoose.model("ProductGroup", productGroupSchema);
