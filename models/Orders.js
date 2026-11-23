import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    // Required for every real order; left unset on a draft created from the
    // product-grid cart before a real customer has been picked/linked (see
    // customerNameText below and PATCH /api/orders/[id]/link-customer).
    customer: {
      type: mongoose.Types.ObjectId,
      ref: "Customer",
      required: false,
    },
    // Hand-typed customer name, used only while a draft has no real
    // `customer` linked yet. Ignored once `customer` is set.
    customerNameText: {
      type: String,
      trim: true,
    },
    products: [
      {
        // Absent for a custom/ad-hoc line item (isCustom: true) - those
        // aren't tied to a real Product in inventory, so there's nothing to
        // reference, deduct stock from, or restock on delete/cancel.
        productId: {
          type: mongoose.Types.ObjectId,
          ref: "Product",
          required: false,
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
        // A one-off item typed in at order time instead of picked from the
        // product catalog - e.g. something not normally stocked. Doesn't
        // touch inventory (no stock check/deduction for these lines).
        isCustom: {
          type: Boolean,
          default: false,
        },
        // Marked as a giveaway/promo item - price is forced to 0 regardless
        // of what was submitted (see priceOrderItems in the orders API).
        free: {
          type: Boolean,
          default: false,
        },
        // Snapshot of the product's cost (Product.initialPrice) at the
        // moment this order was placed, so a profit-margin report stays
        // accurate even after the product's cost later changes. Absent on
        // a custom line (no cost basis) and on orders placed before this
        // field existed - those fall back to the product's current cost.
        costAtSale: {
          type: Number,
          required: false,
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
    // Free-text notes for this order (shown on the invoice and thermal receipt).
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    // Optional delivery, separate from the payment status (see lib/delivery.js):
    // null = not delivered/tracked.
    deliveryStatus: {
      type: String,
      enum: [null, "preparing", "out_for_delivery", "delivered", "failed"],
      default: null,
      index: true,
    },
    deliveryPerson: { type: String, trim: true, maxlength: 60, default: "" },
    deliveredAt: { type: Date, default: null },
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
