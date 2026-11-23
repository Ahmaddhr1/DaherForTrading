import mongoose from "mongoose";

// A template that auto-creates a real Disbursement once a month (e.g. rent,
// salaries) instead of someone re-typing the same entry every month - see
// core/expenses/recurringDisbursements.js, which the backup-style cron job (and its
// in-process fallback) both call on a daily check.
const recurringDisbursementSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    category: {
      type: String,
      enum: ["Salaries", "Rent", "Utilities", "Maintenance", "Transport", "Other"],
      default: "Other",
    },
    // Day of the month this should auto-create on. Capped at 28 so it
    // always has a matching date regardless of month length.
    dayOfMonth: { type: Number, required: true, min: 1, max: 28, default: 1 },
    active: { type: Boolean, default: true },
    // "YYYY-MM" of the last month this template actually created a
    // disbursement for - prevents creating a second one if the daily check
    // runs more than once past the due day in the same month.
    lastRunMonth: { type: String, default: null },
  },
  { timestamps: true }
);

const RecurringDisbursement =
  mongoose.models.RecurringDisbursement ||
  mongoose.model("RecurringDisbursement", recurringDisbursementSchema);
export default RecurringDisbursement;
