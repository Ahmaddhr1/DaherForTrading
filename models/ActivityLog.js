import mongoose from "mongoose";
import { AUDIT_ENTITY_TYPES } from "@/lib/auditFields";

// One exact field change: what it was and what it became. Values are stored
// raw (numbers, strings, booleans, line objects) and formatted for display
// with lib/auditFields.js formatAuditValue(value, format).
const changeSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    label: { type: String, required: true },
    format: { type: String, default: "text" },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

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
      enum: AUDIT_ENTITY_TYPES,
      required: true,
    },
    entityId: { type: mongoose.Types.ObjectId },
    // Readable name of the affected record at the time (product name,
    // customer name, ...), kept so the log reads well after a rename/delete.
    entityLabel: { type: String },
    // Human-readable one-liner shown directly in the activity log UI.
    summary: { type: String, required: true },
    // Optional structured detail, e.g. { before: 10, after: 12 } for a
    // price change. Free-form on purpose - callers decide what's useful.
    metadata: { type: mongoose.Schema.Types.Mixed },
    // Exact field-by-field changes (previous vs current) - see lib/audit.js.
    // Empty for entries recorded before the detailed audit trail existed.
    changes: { type: [changeSchema], default: [] },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ admin: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, createdAt: -1 });

const ActivityLog =
  mongoose.models.ActivityLog || mongoose.model("ActivityLog", activityLogSchema);
export default ActivityLog;
