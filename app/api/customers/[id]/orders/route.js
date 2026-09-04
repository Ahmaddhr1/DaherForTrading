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

export async function GET(req, { params }) {
  await connectToDB();
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const status = searchParams.get("status"); // "pending" | "partiallyPaid" | "paid"
    const sort = searchParams.get("sort") || "newest";
    const skip = (page - 1) * limit;

    const customer = await Customer.findById(id).select("fullName");
    if (!customer) {
      return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    }

    const query = { customer: id };
    if (status && ["pending", "partiallyPaid", "paid"].includes(status)) {
      query.status = status;
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort(SORT_MAP[sort] || SORT_MAP.newest)
      .skip(skip)
      .limit(limit);

    // Status counts (across all of this customer's orders, ignoring the status filter)
    const statusCounts = await Order.aggregate([
      { $match: { customer: customer._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const counts = { pending: 0, partiallyPaid: 0, paid: 0 };
    statusCounts.forEach((s) => {
      if (counts[s._id] !== undefined) counts[s._id] = s.count;
    });

    return NextResponse.json(
      {
        fullName: customer.fullName,
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
      { message: "Error fetching customer orders", error: error.message },
      { status: 500 }
    );
  }
}
