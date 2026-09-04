import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectDb";
import Product from "@/models/Products";

export async function GET(req) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 50);
    const sort = searchParams.get("sort") || "orders"; // "orders" or "profit"
    const category = searchParams.get("category");

    const query = category ? { category } : {};

    let topProducts;
    if (sort === "profit") {
      topProducts = await Product.aggregate([
        { $match: query },
        {
          $addFields: {
            totalProfit: {
              $multiply: [
                { $subtract: ["$price", "$initialPrice"] },
                "$nbOfOrders",
              ],
            },
          },
        },
        { $sort: { totalProfit: -1 } },
        { $limit: limit },
        {
          $project: {
            name: 1,
            nbOfOrders: 1,
            price: 1,
            initialPrice: 1,
            img: 1,
            quantity: 1,
            totalProfit: 1,
          },
        },
      ]);
    } else {
      topProducts = await Product.find(query)
        .sort({ nbOfOrders: -1 })
        .limit(limit)
        .select("name nbOfOrders price initialPrice img quantity");
    }

    return NextResponse.json(
      {
        success: true,
        topProducts,
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching top products:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch top products" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
        },
      }
    );
  }
}
