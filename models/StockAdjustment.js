import mongoose from "mongoose";

const stockAdjustmentSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Types.ObjectId, ref: "Product", required: true },
    type: {
      type: String,
      enum: ["damaged", "lost", "expired", "correction", "other"],
      required: true,
    },
    // Signed change applied to the product's quantity, e.g. -5 for damaged
    // stock, +3 for a recount that found extra units.
    quantityChange: { type: Number, required: true },
    quantityBefore: { type: Number, required: true },
    quantityAfter: { type: Number, required: true },
    reason: { type: String, trim: true },
    admin: { type: mongoose.Types.ObjectId, ref: "Admin" },
    // Snapshot of the admin's username at the time of the adjustment, so
    // history stays readable even if that admin account is later renamed
    // or deleted - same pattern as ActivityLog.
    adminName: { type: String },
  },
  { timestamps: true }
);

stockAdjustmentSchema.index({ product: 1, createdAt: -1 });

const StockAdjustment =
  mongoose.models.StockAdjustment ||
  mongoose.model("StockAdjustment", stockAdjustmentSchema);
export default StockAdjustment;
