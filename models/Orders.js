import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    products: [
      {
        productId: {
          type: mongoose.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        // Fixed $ discount off this line's (price * quantity) subtotal.
        discount: {
          type: Number,
          default: 0,
        },
      },
    ],
    total: {
      type: Number,
      required: true,
    },
    // Sum of every line item's discount - kept alongside `total` so the
    // receipt/UI don't have to re-derive it from the line items.
    discountTotal: {
      type: Number,
      default: 0,
    },
    // Tax rate (%) applied to this order, snapshotted from AppSettings (or
    // overridden) at creation time so a later change to the default rate
    // never rewrites historical orders.
    taxRate: {
      type: Number,
      default: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["draft", "pending", "paid", "partiallyPaid"],
      default: "pending",
    },
    amountpaid: {
      type: Number,
    },
    remainingBalance: {
      type: Number,
    },
    profit:{
      type:Number
    }
  },
  { timestamps: true }
);

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
export default Order;
