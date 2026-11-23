import mongoose from "mongoose";

const disbursementSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    category: {
      type: String,
      enum: ["Salaries", "Rent", "Utilities", "Maintenance", "Transport", "Other"],
      default: "Other",
    },
    // Set when this disbursement was auto-created by a recurring template
    // (see core/expenses/models/RecurringDisbursement.js) rather than entered by hand.
    recurringSourceId: {
      type: mongoose.Types.ObjectId,
      ref: "RecurringDisbursement",
      default: null,
    },
  },
  { timestamps: true }
);

const Disbursement =
  mongoose.models.Disbursement || mongoose.model("Disbursement", disbursementSchema);
export default Disbursement;
