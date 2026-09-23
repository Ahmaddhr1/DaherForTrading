import { connectToDB } from "@/lib/connectDb";
import Order from "@/models/Orders";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const skip = (page - 1) * limit;

    const query = { status: "partiallyPaid" };
    if (startDateParam || endDateParam) {
      // The client resolves these to precise instants before sending them
      // (see lib/dateUtils.js localDayStartISO/localDayEndISO).
      query.createdAt = {};
      if (startDateParam) query.createdAt.$gte = new Date(startDateParam);
      if (endDateParam) query.createdAt.$lte = new Date(endDateParam);
    }

    const total = await Order.countDocuments(query);
    const paritalOrders = await Order.find(query)
      .populate({
        path: "customer",
        select: "fullName",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Sum of order value and profit across every partially paid order
    // matching the current date range (not just the current page).
    const [totalsResult] = await Order.aggregate([
      { $match: query },
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
        paritalOrders,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        totals,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch pending orders." },
      { status: 500 }
    );
  }
}
