import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectDb";
import Order from "@/models/Orders";

const DATE_FORMATS = {
  day: "%Y-%m-%d",
  month: "%Y-%m",
  year: "%Y",
};

// Real profit = sum of Order.profit, which is qty*(sellingPrice-initialCost)
// captured at sale time for every product in the order - the actual margin
// made, as opposed to the dashboard's cash-flow "profit" (sales minus
// restocking spend) shown elsewhere.
export async function GET(req) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const granularity = ["day", "month", "year"].includes(searchParams.get("granularity"))
      ? searchParams.get("granularity")
      : "month";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const dateFormat = DATE_FORMATS[granularity];

    const dateMatch = {};
    if (startDateParam) dateMatch.$gte = new Date(startDateParam);
    if (endDateParam) dateMatch.$lte = new Date(endDateParam);
    const hasDateFilter = Object.keys(dateMatch).length > 0;

    const agg = await Order.aggregate([
      ...(hasDateFilter ? [{ $match: { createdAt: dateMatch } }] : []),
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          realProfit: { $sum: { $ifNull: ["$profit", 0] } },
          ordersCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    let trends = agg.map((row) => ({
      period: row._id,
      realProfit: row.realProfit,
      ordersCount: row.ordersCount,
    }));

    if (!hasDateFilter) {
      const limit = Math.min(parseInt(searchParams.get("limit")) || 12, 60);
      trends = trends.slice(-limit);
    }

    return NextResponse.json({ success: true, granularity, trends });
  } catch (error) {
    console.error("Error fetching real profit trends:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch real profit trends" },
      { status: 500 }
    );
  }
}
