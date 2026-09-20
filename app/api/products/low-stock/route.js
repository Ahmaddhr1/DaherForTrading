import { connectToDB } from "@/lib/connectDb";
import Product from "@/models/Products";
import { NextResponse } from "next/server";

// Powers the dashboard's low-stock alert widget: products at or below
// their own lowStockThreshold (defaulting to 5 for products created
// before that field existed), lowest stock first.
export async function GET(req) {
  await connectToDB();
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit")) || 10;

    const products = await Product.aggregate([
      {
        $match: {
          $expr: { $lte: ["$quantity", { $ifNull: ["$lowStockThreshold", 5] }] },
        },
      },
      { $sort: { quantity: 1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    ]);

    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching low stock products", error: error.message },
      { status: 500 }
    );
  }
}
