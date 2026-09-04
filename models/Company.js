import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    phoneNumber: { type: String },
    address: { type: String },
    // Amount WE owe this company for unpaid purchases.
    // Managed only through the purchases endpoints, never edited directly.
    debt: { type: Number, default: 0 },
    purchases: {
      type: [mongoose.Types.ObjectId],
      ref: "Purchase",
      default: [],
    },
  },
  { timestamps: true }
);

const Company =
  mongoose.models.Company || mongoose.model("Company", companySchema);
export default Company;
