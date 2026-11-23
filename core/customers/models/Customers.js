import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phoneNumber: { type: Number, unique: true, required: true },
    debt: { type: Number, default: 0 },
    // Which of the product's 4 price tiers this customer buys at - see
    // core/products/priceTiers.js for the shared 1-4 -> label/field mapping
    // (1 Retail, 2 Wholesale, 3 Distributor, 4 VIP). Defaults to Retail.
    priceTier: { type: Number, enum: [1, 2, 3, 4], default: 1 },
    // Free-text internal notes about this customer (dashboard only).
    notes: { type: String, trim: true, maxlength: 1000, default: "" },
    orders: {
      type: [mongoose.Types.ObjectId],
      ref: "Order",
      default: []
    },
  },
  { timestamps: true }
);

const Customer = mongoose.models.Customer || mongoose.model("Customer", customerSchema);
export default Customer;
