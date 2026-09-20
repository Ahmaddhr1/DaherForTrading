import mongoose from "mongoose";

// A payment made TO a supplier (Company) to pay down what we owe them -
// the mirror image of models/Payment.js, which records a payment
// received FROM a customer. Kept as a separate model (rather than
// reusing Payment) since it debits a cash/bank Account instead of
// crediting one, and references a Company instead of a Customer.
const supplierPaymentSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Types.ObjectId, ref: "Company", required: true },
    amount: { type: Number, required: true },
    previousDebt: { type: Number, required: true },
    newDebt: { type: Number, required: true },
    account: { type: mongoose.Types.ObjectId, ref: "Account", required: true },
  },
  { timestamps: true }
);

const SupplierPayment =
  mongoose.models.SupplierPayment || mongoose.model("SupplierPayment", supplierPaymentSchema);
export default SupplierPayment;
