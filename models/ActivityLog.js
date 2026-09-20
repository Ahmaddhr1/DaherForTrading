import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Types.ObjectId, ref: "Admin", required: true },
    // Snapshot of the admin's username at the time of the action, so the
    // log stays readable even if that admin account is later renamed or
    // deleted.
    adminName: { type: String, required: true },
    // Dot-namespaced action, e.g. "order.create", "product.priceChange".
    action: { type: String, required: true },
    entityType: {
      type: String,
      enum: ["Order", "Payment", "Product", "Purchase", "Disbursement", "Customer", "Company", "Settings"],
      required: true,
    },
    entityId: { type: mongoose.Types.ObjectId },
    // Human-readable one-liner shown directly in the activity log UI.
    summary: { type: String, required: true },
    // Optional structured detail, e.g. { before: 10, after: 12 } for a
    // price change. Free-form on purpose - callers decide what's useful.
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ admin: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, createdAt: -1 });

const ActivityLog =
  mongoose.models.ActivityLog || mongoose.model("ActivityLog", activityLogSchema);
export default ActivityLog;
