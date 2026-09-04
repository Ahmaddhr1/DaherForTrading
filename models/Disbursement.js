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
  },
  { timestamps: true }
);

const Disbursement =
  mongoose.models.Disbursement || mongoose.model("Disbursement", disbursementSchema);
export default Disbursement;
