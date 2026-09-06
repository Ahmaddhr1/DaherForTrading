import mongoose from "mongoose";
import { connectToDB } from "@/lib/connectDb";
import Customer from "@/models/Customers";
import Order from "@/models/Orders";
import { NextResponse } from "next/server";

// Per-product breakdown of what this customer has bought: quantity, sales
// revenue, and profit for each product, optionally scoped to a date range
// and/or a single product. Profit uses each product's CURRENT initialPrice
// as the cost basis - orders only snapshot the selling price at sale time,
// so this is an approximation whenever a product's cost has since changed
// (same caveat as the order-level summary elsewhere).
export async function GET(req, { params }) {
  await connectToDB();
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const productId = searchParams.get("productId");

    const customer = await Customer.findById(id).select("fullName");
    if (!customer) {
      return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    }

    const match = { customer: customer._id, status: { $ne: "draft" } };
    if (startDateParam || endDateParam) {
      // The client resolves these to precise instants before sending them
      // (see lib/dateUtils.js localDayStartISO/localDayEndISO).
      match.createdAt = {};
      if (startDateParam) match.createdAt.$gte = new Date(startDateParam);
      if (endDateParam) match.createdAt.$lte = new Date(endDateParam);
    }

    const rows = await Order.aggregate([
      { $match: match },
      { $unwind: "$products" },
      ...(productId
        ? [{ $match: { "products.productId": new mongoose.Types.ObjectId(productId) } }]
        : []),
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$products.productId",
          name: { $first: { $ifNull: ["$productInfo.name", "$products.name"] } },
          quantity: { $sum: "$products.quantity" },
          totalSales: { $sum: { $multiply: ["$products.quantity", "$products.price"] } },
          totalCost: {
            $sum: {
              $multiply: ["$products.quantity", { $ifNull: ["$productInfo.initialPrice", 0] }],
            },
          },
        },
      },
      { $sort: { totalSales: -1 } },
    ]);

    const items = rows.map((row) => ({
      productId: row._id,
      name: row.name,
      quantity: row.quantity,
      totalSales: row.totalSales,
      profit: row.totalSales - row.totalCost,
    }));

    const totals = items.reduce(
      (acc, item) => ({
        totalQuantity: acc.totalQuantity + item.quantity,
        totalSales: acc.totalSales + item.totalSales,
        totalProfit: acc.totalProfit + item.profit,
      }),
      { totalQuantity: 0, totalSales: 0, totalProfit: 0 }
    );

    return NextResponse.json({ fullName: customer.fullName, items, totals });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching product sales breakdown", error: error.message },
      { status: 500 }
    );
  }
}
