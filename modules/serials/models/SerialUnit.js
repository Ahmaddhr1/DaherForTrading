import mongoose from "mongoose";

// One physical unit (a phone, a laptop, a TV...) identified by its serial
// number or IMEI. Received into stock, assigned to a customer's order when
// sold, and looked up later for warranty.
const historySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    status: String,
    note: String,
    by: String,
  },
  { _id: false }
);

const serialUnitSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Types.ObjectId, ref: "Product", required: true, index: true },
    serial: { type: String, required: true, trim: true, uppercase: true, unique: true, maxlength: 64 },
    status: { type: String, enum: ["in_stock", "sold", "returned", "defective"], default: "in_stock", index: true },
    supplier: { type: mongoose.Types.ObjectId, ref: "Company", default: null },
    note: { type: String, trim: true, maxlength: 300, default: "" },
    receivedAt: { type: Date, default: Date.now },
    order: { type: mongoose.Types.ObjectId, ref: "Order", default: null, index: true },
    customer: { type: mongoose.Types.ObjectId, ref: "Customer", default: null },
    soldAt: { type: Date, default: null },
    warrantyMonths: { type: Number, default: 0 },
    warrantyEndsAt: { type: Date, default: null },
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.SerialUnit || mongoose.model("SerialUnit", serialUnitSchema);
