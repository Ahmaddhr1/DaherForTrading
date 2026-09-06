import { connectToDB } from "@/lib/connectDb";
import Customer from "@/models/Customers";
import Order from "@/models/Orders";
import { NextResponse } from "next/server";

const SORT_MAP = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  totalDesc: { total: -1 },
  totalAsc: { total: 1 },
};

// List all orders across all customers, paginated & filterable.
export async function GET(req) {
  await connectToDB();
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const status = searchParams.get("status"); // pending | partiallyPaid | paid
    const search = searchParams.get("search")?.trim() || "";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const sort = searchParams.get("sort") || "newest";
    const skip = (page - 1) * limit;

    const query = {};

    if (status && ["draft", "pending", "partiallyPaid", "paid"].includes(status)) {
      query.status = status;
    }

    if (search) {
      const matchingCustomers = await Customer.find({
        fullName: { $regex: new RegExp(search, "i") },
      }).select("_id");
      query.customer = { $in: matchingCustomers.map((c) => c._id) };
    }

    if (startDateParam || endDateParam) {
      // The client resolves these to precise instants (see
      // lib/dateUtils.js localDayStartISO/localDayEndISO) before sending
      // them, so they're parsed directly here rather than re-derived
      // from a bare calendar date.
      query.createdAt = {};
      if (startDateParam) {
        query.createdAt.$gte = new Date(startDateParam);
      }
      if (endDateParam) {
        query.createdAt.$lte = new Date(endDateParam);
      }
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate({ path: "customer", select: "fullName" })
      .sort(SORT_MAP[sort] || SORT_MAP.newest)
      .skip(skip)
      .limit(limit);

    const statusCounts = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const counts = { draft: 0, pending: 0, partiallyPaid: 0, paid: 0 };
    statusCounts.forEach((s) => {
      if (counts[s._id] !== undefined) counts[s._id] = s.count;
    });

    // Sum of order value and real profit across every order matching the
    // current filters (not just the current page). Drafts never count
    // toward either figure since they haven't been finalized - unless the
    // status filter is explicitly "draft", in which case that's exactly
    // what's being viewed.
    const totalsMatch = { ...query };
    if (!totalsMatch.status) {
      totalsMatch.status = { $ne: "draft" };
    }
    const [totalsResult] = await Order.aggregate([
      { $match: totalsMatch },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$total" },
          totalProfit: { $sum: { $ifNull: ["$profit", 0] } },
        },
      },
    ]);
    const totals = {
      totalAmount: totalsResult?.totalAmount || 0,
      totalProfit: totalsResult?.totalProfit || 0,
    };

    return NextResponse.json(
      {
        orders,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        counts,
        totals,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching orders", error: error.message },
      { status: 500 }
    );
  }
}
