import mongoose from "mongoose";
import { connectToDB } from "@/lib/connectDb";
import Company from "@/models/Company";
import Purchase from "@/models/Purchase";
import { NextResponse } from "next/server";

// Per-product breakdown of what's been purchased from this company:
// quantity, amount spent, and expected profit for each product, optionally
// scoped to a date range and/or a single product. Expected profit estimates
// revenue at each product's CURRENT selling price against what was actually
// paid for it - an approximation, same caveat as other profit estimates
// elsewhere in the app.
export async function GET(req, { params }) {
  await connectToDB();
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const productId = searchParams.get("productId");

    const company = await Company.findById(id).select("name");
    if (!company) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }

    const match = { company: company._id };
    if (startDateParam || endDateParam) {
      // The client resolves these to precise instants before sending them
      // (see lib/dateUtils.js localDayStartISO/localDayEndISO).
      match.createdAt = {};
      if (startDateParam) match.createdAt.$gte = new Date(startDateParam);
      if (endDateParam) match.createdAt.$lte = new Date(endDateParam);
    }
    if (productId) {
      match.product = new mongoose.Types.ObjectId(productId);
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
          _id: "$product",
          name: { $first: { $ifNull: ["$productInfo.name", "$productName"] } },
          quantity: { $sum: "$quantity" },
          totalSpent: { $sum: "$total" },
          expectedRevenue: {
            $sum: { $multiply: ["$quantity", { $ifNull: ["$productInfo.price", 0] }] },
          },
        },
      },
      { $sort: { totalSpent: -1 } },
    ]);

    const items = rows.map((row) => ({
      productId: row._id,
      name: row.name,
      quantity: row.quantity,
      totalSpent: row.totalSpent,
      expectedProfit: row.expectedRevenue - row.totalSpent,
    }));

    const totals = items.reduce(
      (acc, item) => ({
        totalQuantity: acc.totalQuantity + item.quantity,
        totalSpent: acc.totalSpent + item.totalSpent,
        totalExpectedProfit: acc.totalExpectedProfit + item.expectedProfit,
      }),
      { totalQuantity: 0, totalSpent: 0, totalExpectedProfit: 0 }
    );

    return NextResponse.json({ companyName: company.name, items, totals });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching product purchase breakdown", error: error.message },
      { status: 500 }
    );
  }
}
