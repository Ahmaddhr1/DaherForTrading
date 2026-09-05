import { connectToDB } from "@/lib/connectDb";
import Order from "@/models/Orders";
import Purchase from "@/models/Purchase";
import Product from "@/models/Products";
import { NextResponse } from "next/server";

// Sales vs purchases history for one product, optionally filtered by date.
// Sales profit uses the product's CURRENT initialPrice as the cost basis -
// orders only snapshot the selling price at sale time, not the cost, so
// this is an approximation whenever the cost has changed since a given sale.
export async function GET(req, { params }) {
  await connectToDB();
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const limit = Math.min(parseInt(searchParams.get("limit")) || 20, 100);

    const product = await Product.findById(id).select("name price initialPrice");
    if (!product) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    const dateMatch = {};
    if (startDateParam) dateMatch.$gte = new Date(startDateParam);
    if (endDateParam) dateMatch.$lte = new Date(endDateParam);
    const hasDateFilter = Object.keys(dateMatch).length > 0;

    const [salesResult] = await Order.aggregate([
      { $unwind: "$products" },
      {
        $match: {
          "products.productId": product._id,
          ...(hasDateFilter ? { createdAt: dateMatch } : {}),
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          entries: [
            { $limit: limit },
            {
              $project: {
                _id: 0,
                orderId: "$_id",
                quantity: "$products.quantity",
                price: "$products.price",
                createdAt: 1,
              },
            },
          ],
          totals: [
            {
              $group: {
                _id: null,
                totalQuantity: { $sum: "$products.quantity" },
                totalRevenue: { $sum: { $multiply: ["$products.quantity", "$products.price"] } },
              },
            },
          ],
        },
      },
    ]);

    const [purchasesResult] = await Purchase.aggregate([
      {
        $match: {
          product: product._id,
          ...(hasDateFilter ? { createdAt: dateMatch } : {}),
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          entries: [
            { $limit: limit },
            {
              $project: {
                _id: 1,
                quantity: 1,
                unitPrice: 1,
                total: 1,
                createdAt: 1,
              },
            },
          ],
          totals: [
            {
              $group: {
                _id: null,
                totalQuantity: { $sum: "$quantity" },
                totalCost: { $sum: "$total" },
              },
            },
          ],
        },
      },
    ]);

    const salesTotals = salesResult?.totals?.[0] || { totalQuantity: 0, totalRevenue: 0 };
    const purchaseTotals = purchasesResult?.totals?.[0] || { totalQuantity: 0, totalCost: 0 };

    return NextResponse.json({
      product: {
        _id: product._id,
        name: product.name,
        price: product.price,
        initialPrice: product.initialPrice,
      },
      sales: {
        entries: salesResult?.entries || [],
        totalQuantity: salesTotals.totalQuantity,
        totalRevenue: salesTotals.totalRevenue,
        totalProfit: salesTotals.totalRevenue - salesTotals.totalQuantity * product.initialPrice,
      },
      purchases: {
        entries: purchasesResult?.entries || [],
        totalQuantity: purchaseTotals.totalQuantity,
        totalCost: purchaseTotals.totalCost,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching product history", error: error.message },
      { status: 500 }
    );
  }
}
