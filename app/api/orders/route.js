import { connectToDB } from "@/lib/connectDb";
import Customer from "@/models/Customers";
import Order from "@/models/Orders";
import { NextResponse } from "next/server";
import { startOfDayUTC, endOfDayUTC } from "@/lib/dateUtils";

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

    if (status && ["pending", "partiallyPaid", "paid"].includes(status)) {
      query.status = status;
    }

    if (search) {
      const matchingCustomers = await Customer.find({
        fullName: { $regex: new RegExp(search, "i") },
      }).select("_id");
      query.customer = { $in: matchingCustomers.map((c) => c._id) };
    }

    if (startDateParam || endDateParam) {
      query.createdAt = {};
      if (startDateParam) {
        query.createdAt.$gte = startOfDayUTC(startDateParam);
      }
      if (endDateParam) {
        query.createdAt.$lte = endOfDayUTC(endDateParam);
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
    const counts = { pending: 0, partiallyPaid: 0, paid: 0 };
    statusCounts.forEach((s) => {
      if (counts[s._id] !== undefined) counts[s._id] = s.count;
    });

    return NextResponse.json(
      {
        orders,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        counts,
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
