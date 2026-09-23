import { connectToDB } from "@/lib/connectDb";
import Order from "@/models/Orders";
import { NextResponse } from "next/server";

// Lifetime totals across every non-draft order, ignoring whatever
// status/search filters the Orders page's tabs currently have applied - so
// the headline "Total Sales" figure doesn't change as the owner clicks
// through Pending/Partially Paid/etc. Mirrors the same totals aggregation
// GET /api/orders already does per-filter, just without the filters.
export async function GET() {
  await connectToDB();
  try {
    const [result] = await Order.aggregate([
      { $match: { status: { $ne: "draft" } } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$total" },
          totalProfit: { $sum: { $ifNull: ["$profit", 0] } },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    return NextResponse.json(
      {
        totalSales: result?.totalSales || 0,
        totalProfit: result?.totalProfit || 0,
        orderCount: result?.orderCount || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching order totals", error: error.message },
      { status: 500 }
    );
  }
}
