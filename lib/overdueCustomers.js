import Customer from "@/models/Customers";
import Payment from "@/models/Payment";
import Order from "@/models/Orders";

export const DEFAULT_OVERDUE_DAYS = 30;

// A customer's "reference date" for overdue purposes is their most recent
// payment; if they've never made one, the earliest real (non-draft) order
// that put them into debt in the first place; if neither exists, the
// account's own creation date.
function referenceDateStage(now) {
  return [
    {
      $addFields: {
        referenceDate: {
          $ifNull: [
            { $arrayElemAt: ["$lastPayment.createdAt", 0] },
            { $ifNull: [{ $arrayElemAt: ["$firstOrder.createdAt", 0] }, "$createdAt"] },
          ],
        },
      },
    },
    {
      $addFields: {
        lastPaymentDate: { $arrayElemAt: ["$lastPayment.createdAt", 0] },
        daysSincePayment: {
          $floor: { $divide: [{ $subtract: [now, "$referenceDate"] }, 1000 * 60 * 60 * 24] },
        },
      },
    },
  ];
}

function lookupStages() {
  return [
    {
      $lookup: {
        from: Payment.collection.name,
        let: { customerId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$customer", "$$customerId"] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
          { $project: { createdAt: 1 } },
        ],
        as: "lastPayment",
      },
    },
    {
      $lookup: {
        from: Order.collection.name,
        let: { customerId: "$_id" },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ["$customer", "$$customerId"] }, { $ne: ["$status", "draft"] }] } } },
          { $sort: { createdAt: 1 } },
          { $limit: 1 },
          { $project: { createdAt: 1 } },
        ],
        as: "firstOrder",
      },
    },
  ];
}

// Paginated list of customers with debt who haven't paid in at least
// `minDays` days, sorted by amount owed (highest first).
export async function getOverdueCustomers({ minDays = DEFAULT_OVERDUE_DAYS, page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const now = new Date();

  const pipeline = [
    { $match: { debt: { $gt: 0 } } },
    ...lookupStages(),
    ...referenceDateStage(now),
    { $match: { daysSincePayment: { $gte: minDays } } },
    { $sort: { debt: -1 } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          { $project: { fullName: 1, phoneNumber: 1, debt: 1, lastPaymentDate: 1, daysSincePayment: 1, createdAt: 1 } },
        ],
        totalCount: [{ $count: "count" }],
      },
    },
  ];

  const [result] = await Customer.aggregate(pipeline);
  const customers = result?.data || [];
  const total = result?.totalCount?.[0]?.count || 0;

  return { customers, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

// Same reference-date/days-overdue computation for a single customer, used
// to show the overdue flag on their own detail page.
export async function getCustomerOverdueInfo(customerId) {
  const [lastPayment, firstOrder] = await Promise.all([
    Payment.findOne({ customer: customerId }).sort({ createdAt: -1 }).select("createdAt"),
    Order.findOne({ customer: customerId, status: { $ne: "draft" } }).sort({ createdAt: 1 }).select("createdAt"),
  ]);

  const lastPaymentDate = lastPayment?.createdAt || null;
  return { lastPaymentDate, firstOrderDate: firstOrder?.createdAt || null };
}
