import ActivityLog from "@/core/audit/models/ActivityLog";
import Order from "@/core/orders/models/Orders";
import Payment from "@/core/payments/models/Payment";
import Disbursement from "@/core/expenses/models/Disbursement";

// Actions this view breaks out into their own counted/valued column -
// everything else an admin does still counts toward their "Total Actions".
const ORDER_ACTIONS = ["order.create"];
const PAYMENT_ACTIONS = ["payment.create"];
const DISBURSEMENT_ACTIONS = ["disbursement.create"];
const PRODUCT_ACTIONS = ["product.create"];
const PURCHASE_ACTIONS = ["purchase.create"];

function emptyStats(adminId, adminName) {
  return {
    adminId,
    adminName,
    ordersCreated: 0,
    ordersValue: 0,
    ordersProfit: 0,
    paymentsRecorded: 0,
    paymentsValue: 0,
    disbursementsRecorded: 0,
    disbursementsValue: 0,
    productsCreated: 0,
    purchasesRecorded: 0,
    totalActions: 0,
  };
}

// Per-admin activity counts and, where the underlying record still exists,
// dollar totals (orders/payments/disbursements), for a date range. Dollar
// amounts aren't stored on the activity log itself, so they're pulled from
// the actual records via one batched lookup per entity type rather than
// parsing the log's human-readable summary string.
export async function getEmployeePerformance({ startDate, endDate } = {}) {
  const query = {};
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const logs = await ActivityLog.find(query)
    .select("admin adminName action entityId")
    .lean();

  const statsByAdmin = new Map();
  const getStats = (adminId, adminName) => {
    const key = String(adminId);
    if (!statsByAdmin.has(key)) {
      statsByAdmin.set(key, emptyStats(adminId, adminName));
    }
    return statsByAdmin.get(key);
  };

  const orderIds = [];
  const paymentIds = [];
  const disbursementIds = [];

  for (const log of logs) {
    if (!log.admin) continue;
    const stats = getStats(log.admin, log.adminName);
    stats.totalActions += 1;

    if (ORDER_ACTIONS.includes(log.action)) {
      stats.ordersCreated += 1;
      if (log.entityId) orderIds.push(log.entityId);
    } else if (PAYMENT_ACTIONS.includes(log.action)) {
      stats.paymentsRecorded += 1;
      if (log.entityId) paymentIds.push(log.entityId);
    } else if (DISBURSEMENT_ACTIONS.includes(log.action)) {
      stats.disbursementsRecorded += 1;
      if (log.entityId) disbursementIds.push(log.entityId);
    } else if (PRODUCT_ACTIONS.includes(log.action)) {
      stats.productsCreated += 1;
    } else if (PURCHASE_ACTIONS.includes(log.action)) {
      stats.purchasesRecorded += 1;
    }
  }

  const [orders, payments, disbursements] = await Promise.all([
    orderIds.length
      ? Order.find({ _id: { $in: orderIds } }).select("total profit").lean()
      : [],
    paymentIds.length
      ? Payment.find({ _id: { $in: paymentIds } }).select("amount").lean()
      : [],
    disbursementIds.length
      ? Disbursement.find({ _id: { $in: disbursementIds } }).select("amount").lean()
      : [],
  ]);

  const orderById = new Map(orders.map((o) => [String(o._id), o]));
  const paymentById = new Map(payments.map((p) => [String(p._id), p]));
  const disbursementById = new Map(disbursements.map((d) => [String(d._id), d]));

  for (const log of logs) {
    if (!log.admin) continue;
    const stats = getStats(log.admin, log.adminName);

    if (ORDER_ACTIONS.includes(log.action) && log.entityId) {
      const order = orderById.get(String(log.entityId));
      if (order) {
        stats.ordersValue += order.total || 0;
        stats.ordersProfit += order.profit || 0;
      }
    } else if (PAYMENT_ACTIONS.includes(log.action) && log.entityId) {
      const payment = paymentById.get(String(log.entityId));
      if (payment) stats.paymentsValue += payment.amount || 0;
    } else if (DISBURSEMENT_ACTIONS.includes(log.action) && log.entityId) {
      const disbursement = disbursementById.get(String(log.entityId));
      if (disbursement) stats.disbursementsValue += disbursement.amount || 0;
    }
  }

  return Array.from(statsByAdmin.values()).sort((a, b) => b.totalActions - a.totalActions);
}
