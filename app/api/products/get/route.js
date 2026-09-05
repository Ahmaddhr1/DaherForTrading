import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectDb";
import Product from "@/models/Products";


export async function GET(req) {
  await connectToDB();

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page")) || 1;
  const limit = parseInt(searchParams.get("limit")) || 20;
  const search = searchParams.get("search")?.toLowerCase() || "";

  const skip = (page - 1) * limit;

  try {
    const query = search
      ? { name: { $regex: new RegExp(search, "i") } }
      : {};

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Stock value across ALL products matching the search (not just the
    // current page), so the summary cards reflect the whole inventory.
    const summaryAgg = await Product.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          stockValueCost: { $sum: { $multiply: ["$quantity", "$initialPrice"] } },
          stockValueSelling: { $sum: { $multiply: ["$quantity", "$price"] } },
          totalUnits: { $sum: "$quantity" },
        },
      },
    ]);
    const summaryRow = summaryAgg[0] || { stockValueCost: 0, stockValueSelling: 0, totalUnits: 0 };
    const summary = {
      stockValueCost: summaryRow.stockValueCost,
      stockValueSelling: summaryRow.stockValueSelling,
      potentialProfit: summaryRow.stockValueSelling - summaryRow.stockValueCost,
      totalUnits: summaryRow.totalUnits,
    };

    return NextResponse.json(
      {
        products,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        summary,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching products", error: error.message },
      { status: 500 }
    );
  }
}