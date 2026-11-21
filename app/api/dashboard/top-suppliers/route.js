import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectDb";
import Purchase from "@/models/Purchase";

// Top companies (suppliers) by what you bought from them in a date range:
// total purchased (sum of purchase totals) and the expected profit on that
// stock - quantity x each product's CURRENT selling price, minus what you
// paid. It's an estimate (prices can change before the stock sells), the
// same one the Companies page summary uses.
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

    const match = {};
    if (startDateParam || endDateParam) {
      match.createdAt = {};
      if (startDateParam) match.createdAt.$gte = new Date(startDateParam);
      if (endDateParam) match.createdAt.$lte = new Date(endDateParam);
    }

    const rows = await Purchase.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$company",
          purchased: { $sum: { $ifNull: ["$total", 0] } },
          expectedRevenue: {
            $sum: { $multiply: ["$quantity", { $ifNull: ["$productInfo.price", 0] }] },
          },
          quantity: { $sum: "$quantity" },
          purchasesCount: { $sum: 1 },
        },
      },
      { $addFields: { profit: { $subtract: ["$expectedRevenue", "$purchased"] } } },
      { $sort: { [sortBy]: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "companies",
          localField: "_id",
          foreignField: "_id",
          as: "company",
        },
      },
      { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },
    ]);

    const topSuppliers = rows.map((row) => ({
      companyId: row._id,
      name: row.company?.name || "(deleted company)",
      purchased: Math.round(row.purchased * 100) / 100,
      profit: Math.round(row.profit * 100) / 100,
      quantity: row.quantity,
      purchasesCount: row.purchasesCount,
    }));

    return NextResponse.json({ success: true, sortBy, topSuppliers });
  } catch (error) {
    console.error("Error fetching top suppliers:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch top companies" }, { status: 500 });
  }
}
