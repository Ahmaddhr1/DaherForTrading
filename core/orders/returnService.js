// Processing a customer return: what can still be returned, restocking (with
// a stock-history entry), the refund against the customer's debt, the Return
// record and the audit entry.
import Order from "@/core/orders/models/Orders";
import Customer from "@/core/customers/models/Customers";
import Product from "@/core/products/models/Products";
import StockAdjustment from "@/core/products/models/StockAdjustment";
import Return from "@/core/orders/models/Return";
import { logActivity } from "@/core/audit/activityLog";
import { extraChange, orderLabel } from "@/core/audit/audit";
import { ServiceError } from "@/core/shared/serviceError";

// input: { items: [{ productId | name, quantity }], reason, restocked } -> the Return
export async function processReturn({ orderId, input, admin }) {
  const id = orderId;
  const { items, reason, restocked } = input;

  if (!Array.isArray(items) || items.length === 0) {
    throw new ServiceError(400, { error: "Select at least one item to return" });
  }

  const order = await Order.findById(id);
  if (!order) {
    throw new ServiceError(404, { message: "Order not found" });
  }
  if (order.status === "draft") {
    throw new ServiceError(400, { error: "A draft has no sale to return - edit or delete it instead" });
  }
  if (!order.customer) {
    throw new ServiceError(400, { error: "This order has no linked customer to refund" });
  }

  const customer = await Customer.findById(order.customer);
  if (!customer) {
    throw new ServiceError(404, { message: "Customer not found" });
  }

  // How much of each line has already been returned, so this request
  // can't return more than was actually sold - keyed by line identity
  // (productId, or name for a custom line with no productId).
  const priorReturns = await Return.find({ order: id }).select("items").lean();
  const alreadyReturned = new Map();
  for (const ret of priorReturns) {
    for (const item of ret.items) {
      const key = item.productId ? String(item.productId) : `custom:${item.name}`;
      alreadyReturned.set(key, (alreadyReturned.get(key) || 0) + item.quantity);
    }
  }

  const shouldRestock = restocked !== false;
  const returnItems = [];
  let totalRefundAmount = 0;
  const stockUpdates = [];

  for (const requested of items) {
    const quantity = parseInt(requested.quantity, 10);
    if (!quantity || quantity <= 0) continue;

    const orderLine = order.products.find((p) =>
      requested.productId
        ? String(p.productId) === String(requested.productId)
        : !p.productId && p.name === requested.name
    );
    if (!orderLine) {
      throw new ServiceError(400, { error: `"${requested.name}" isn't on this order` });
    }

    const key = orderLine.productId ? String(orderLine.productId) : `custom:${orderLine.name}`;
    const alreadyQty = alreadyReturned.get(key) || 0;
    const remaining = orderLine.quantity - alreadyQty;
    if (quantity > remaining) {
      throw new ServiceError(400, { error: `Only ${remaining} of "${orderLine.name}" can still be returned` });
    }

    returnItems.push({
      productId: orderLine.productId || undefined,
      name: orderLine.name,
      quantity,
      unitPrice: orderLine.price,
    });
    totalRefundAmount += orderLine.price * quantity;

    if (shouldRestock && orderLine.productId) {
      stockUpdates.push({ productId: orderLine.productId, name: orderLine.name, quantity });
    }
  }

  if (returnItems.length === 0) {
    throw new ServiceError(400, { error: "Enter a quantity to return for at least one item" });
  }

  if (shouldRestock) {
    for (const update of stockUpdates) {
      const product = await Product.findById(update.productId);
      if (!product) continue;
      const quantityBefore = product.quantity;
      product.quantity += update.quantity;
      await product.save();

      await StockAdjustment.create({
        product: product._id,
        type: "returned",
        quantityChange: update.quantity,
        quantityBefore,
        quantityAfter: product.quantity,
        reason: reason?.trim() || `Customer return (order ${order._id})`,
        admin: admin?.id,
        adminName: admin?.adminname,
      });
    }
  }

  const previousDebt = customer.debt;
  customer.debt = previousDebt - totalRefundAmount;
  await customer.save();

  const returnDoc = await Return.create({
    order: order._id,
    customer: customer._id,
    items: returnItems,
    restocked: shouldRestock,
    totalRefundAmount,
    reason: reason?.trim() || "",
    previousDebt,
    newDebt: customer.debt,
    admin: admin?.id,
    adminName: admin?.adminname,
  });

  await logActivity({
    admin,
    action: "order.return",
    entityType: "Order",
    entityId: order._id,
    entityLabel: orderLabel(order),
    changes: [
      ...returnItems.map((item) =>
        extraChange(
          `returned.${item.productId || item.name}`,
          `Returned: ${item.name}`,
          null,
          { quantity: item.quantity, price: item.unitPrice },
          "line"
        )
      ),
      extraChange("return.refund", "Refund amount", null, totalRefundAmount, "money"),
      extraChange("return.restocked", "Returned to stock", null, shouldRestock, "bool"),
      extraChange("return.reason", "Reason", null, reason?.trim() || null),
      extraChange("customer.debt", "Customer debt", previousDebt, customer.debt, "money"),
    ],
    summary: `Processed a $${totalRefundAmount.toFixed(2)} return for ${customer.fullName} (order ${order._id})`,
    metadata: { returnId: returnDoc._id, items: returnItems, restocked: shouldRestock },
  });

  return returnDoc;
}
