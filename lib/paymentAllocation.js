import Order from "@/models/Orders";
import Purchase from "@/models/Purchase";

// Keeps payments and the records they pay for in sync, so the same money is
// never counted twice.
//
// A customer's debt is the sum of what's still owed on their orders. When a
// payment is recorded against the debt as a whole (Payments tab), it's also
// applied to their open orders, oldest first - marking them partially or
// fully paid. Afterwards, marking an order paid only ever collects what is
// genuinely still owed on it. Supplier payments work the same way against a
// company's unpaid purchases.

const cents = (n) => Math.round(n * 100) / 100;

// What's been paid so far on a purchase. Purchases created before partial
// supplier payments existed only have the `paid` flag.
export function purchasePaidAmount(purchase) {
  if (typeof purchase.amountPaid === "number") return purchase.amountPaid;
  return purchase.paid ? purchase.total : 0;
}

export function purchaseRemaining(purchase) {
  return cents(Math.max(0, (purchase.total || 0) - purchasePaidAmount(purchase)));
}

// Apply `amount` to the customer's pending/partially-paid orders, oldest
// first. Returns [{ order, amount }] and anything left unallocated (e.g.
// debt that came from somewhere other than an order).
export async function allocateCustomerPayment(customerId, amount) {
  const orders = await Order.find({
    customer: customerId,
    status: { $in: ["pending", "partiallyPaid"] },
  }).sort({ createdAt: 1 });

  let left = cents(amount);
  const allocations = [];
  for (const order of orders) {
    if (left <= 0) break;
    const remaining = cents(order.remainingBalance ?? order.total - (order.amountpaid || 0));
    if (remaining <= 0) continue;

    const applied = cents(Math.min(left, remaining));
    order.amountpaid = cents((order.amountpaid || 0) + applied);
    order.remainingBalance = cents(remaining - applied);
    if (order.remainingBalance <= 0) {
      order.remainingBalance = 0;
      order.status = "paid";
      order.paymentDate = new Date();
    } else {
      order.status = "partiallyPaid";
    }
    await order.save();

    allocations.push({ order: order._id, amount: applied });
    left = cents(left - applied);
  }
  return { allocations, unallocated: Math.max(0, left) };
}

// Apply `amount` to the company's unpaid purchases, oldest first. Returns
// [{ purchase, amount }] and anything left unallocated.
export async function allocateSupplierPayment(companyId, amount) {
  const purchases = await Purchase.find({ company: companyId, paid: { $ne: true } }).sort({ createdAt: 1 });

  let left = cents(amount);
  const allocations = [];
  for (const purchase of purchases) {
    if (left <= 0) break;
    const remaining = purchaseRemaining(purchase);
    if (remaining <= 0) continue;

    const applied = cents(Math.min(left, remaining));
    purchase.amountPaid = cents(purchasePaidAmount(purchase) + applied);
    purchase.paid = purchase.amountPaid >= purchase.total - 0.005;
    if (purchase.paid) purchase.amountPaid = purchase.total;
    await purchase.save();

    allocations.push({ purchase: purchase._id, amount: applied, productName: purchase.productName });
    left = cents(left - applied);
  }
  return { allocations, unallocated: Math.max(0, left) };
}
