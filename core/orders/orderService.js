// Creating a customer order: pricing, stock check, stock deduction, customer
// debt and the audit entry. The API route only handles login/permissions/HTTP.
import Customer from "@/core/customers/models/Customers";
import Order from "@/core/orders/models/Orders";
import Product from "@/core/products/models/Products";
import { logActivity } from "@/core/audit/activityLog";
import { auditView, snapshotChanges, diffOrderLines, extraChange, orderLabel } from "@/core/audit/audit";
import { priceOrderItems, PricingError } from "@/core/orders/orderPricing";
import { hasPermission } from "@/core/platform/permissions";
import { ServiceError } from "@/core/shared/serviceError";

// input: { products, taxRate, asDraft, notes }  -> the created order
export async function createCustomerOrder({ customerId, input, user }) {
  const { products, taxRate, asDraft, notes } = input;

  if (!products?.length) {
    throw new ServiceError(400, { message: "No products provided" });
  }

  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw new ServiceError(404, { message: "Customer not found" });
  }

  // An employee's submitted price is only trusted with canOverrideOrderPricing
  // - see priceOrderItems.
  let priced;
  try {
    priced = await priceOrderItems(products, taxRate, {
      canOverridePricing: hasPermission(user, "canOverrideOrderPricing"),
      priceTier: customer.priceTier || 1,
    });
  } catch (err) {
    if (err instanceof PricingError) throw new ServiceError(err.status, { message: err.message });
    throw err;
  }

  // A draft doesn't touch stock, so it's exempt from the stock check -
  // it's only enforced once the draft is finalized into a real order.
  // Custom lines never touched inventory, so they're skipped here too.
  if (!asDraft) {
    for (let i = 0; i < priced.enrichedProducts.length; i++) {
      const item = priced.enrichedProducts[i];
      if (item.isCustom) continue;
      const product = priced.productLookups[i];
      if (product.quantity < item.quantity) {
        throw new ServiceError(400, {
          message: `Insufficient stock for "${product.name}". Available: ${product.quantity}, requested: ${item.quantity}`,
        });
      }
    }
  }

  const newOrder = await Order.create({
    customer: customerId,
    products: priced.enrichedProducts,
    total: priced.total,
    discountTotal: priced.discountTotal,
    taxRate: priced.taxRate,
    taxAmount: priced.taxAmount,
    notes: typeof notes === "string" ? notes.trim().slice(0, 1000) : "",
    status: asDraft ? "draft" : "pending",
    remainingBalance: asDraft ? undefined : priced.total,
    profit: priced.profit,
  });

  // A draft never reserves stock or counts toward debt until finalized.
  // Custom lines are excluded - there's no stock to deduct for them.
  if (!asDraft) {
    const productUpdates = priced.enrichedProducts
      .filter((item) => !item.isCustom)
      .map((item) => ({
        updateOne: {
          filter: { _id: item.productId },
          update: { $inc: { quantity: -item.quantity, nbOfOrders: item.quantity } },
        },
      }));
    if (productUpdates.length) {
      await Product.bulkWrite(productUpdates);
    }
  }

  await Customer.findByIdAndUpdate(customerId, {
    $push: { orders: newOrder._id },
    ...(asDraft ? {} : { $inc: { debt: newOrder.total } }),
  });

  await logActivity({
    admin: user,
    action: "order.create",
    entityType: "Order",
    entityId: newOrder._id,
    entityLabel: orderLabel(newOrder),
    summary: asDraft
      ? `Saved a draft order worth $${priced.total.toFixed(2)} for ${customer.fullName}`
      : `Created an order worth $${priced.total.toFixed(2)} for ${customer.fullName}`,
    changes: [
      ...snapshotChanges("Order", await auditView("Order", newOrder), "create"),
      ...diffOrderLines([], newOrder.products),
      asDraft
        ? null
        : extraChange("customer.debt", "Customer debt", customer.debt, customer.debt + newOrder.total, "money"),
    ],
  });

  return newOrder;
}
