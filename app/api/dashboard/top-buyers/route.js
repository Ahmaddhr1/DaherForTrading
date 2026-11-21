import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectDb";
import Order from "@/models/Orders";

// Top customers by what they bought in a date range: total ordered (sum of
// order totals) and the real profit those orders made (sum of Order.profit,
// captured at sale time - same figure as the Real Profit chart). Drafts
// never count; they aren't sales yet.
//
// Query: startDate/endDate (ISO instants, optional), limit (default 10),
// sortBy "purchased" (default) | "profit".
export async function GET(req) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 50);
    const sortBy = searchParams.get("sortBy") === "profit" ? "profit" : "purchased";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const match = { status: { $ne: "draft" }, customer: { $ne: null } };
    if (startDateParam || endDateParam) {
      match.createdAt = {};
      if (startDateParam) match.createdAt.$gte = new Date(startDateParam);
      if (endDateParam) match.createdAt.$lte = new Date(endDateParam);
    }

    const rows = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$customer",
          purchased: { $sum: { $ifNull: ["$total", 0] } },
          profit: { $sum: { $ifNull: ["$profit", 0] } },
          ordersCount: { $sum: 1 },
        },
      },
      { $sort: { [sortBy]: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
    ]);

    const topBuyers = rows.map((row) => ({
      customerId: row._id,
      name: row.customer?.fullName || "(deleted customer)",
      phoneNumber: row.customer?.phoneNumber ?? null,
      purchased: Math.round(row.purchased * 100) / 100,
      profit: Math.round(row.profit * 100) / 100,
      ordersCount: row.ordersCount,
    }));

    return NextResponse.json({ success: true, sortBy, topBuyers });
  } catch (error) {
    console.error("Error fetching top buyers:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch top customers" }, { status: 500 });
  }
}
