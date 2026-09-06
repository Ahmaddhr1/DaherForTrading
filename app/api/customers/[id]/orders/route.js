import mongoose from "mongoose";
import { connectToDB } from "@/lib/connectDb";
import Customer from "@/models/Customers";
import Order from "@/models/Orders";
import { NextResponse } from "next/server";

const SORT_MAP = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  totalDesc: { total: -1 },
  totalAsc: { total: 1 },
};

export async function GET(req, { params }) {
  await connectToDB();
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const status = searchParams.get("status"); // "pending" | "partiallyPaid" | "paid"
    const sort = searchParams.get("sort") || "newest";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const category = searchParams.get("category");
    const skip = (page - 1) * limit;

    const customer = await Customer.findById(id).select("fullName");
    if (!customer) {
      return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    }

    const query = { customer: customer._id };
    if (status && ["draft", "pending", "partiallyPaid", "paid"].includes(status)) {
      query.status = status;
    }
    if (startDateParam || endDateParam) {
      // The client resolves these to precise instants before sending them
      // (see lib/dateUtils.js localDayStartISO/localDayEndISO).
      query.createdAt = {};
      if (startDateParam) query.createdAt.$gte = new Date(startDateParam);
      if (endDateParam) query.createdAt.$lte = new Date(endDateParam);
    }

    // A category filter narrows orders down to ones containing at least one
    // product in that category - line-item detail (and the profit/sales
    // summary below) still reflects only the matching lines, not the whole
    // order, since one order can span multiple categories.
    if (category) {
      const matchingOrderIds = await Order.aggregate([
        { $match: query },
        { $unwind: "$products" },
        {
          $lookup: {
            from: "products",
            localField: "products.productId",
            foreignField: "_id",
            as: "productInfo",
          },
        },
        { $unwind: "$productInfo" },
        { $match: { "productInfo.category": new mongoose.Types.ObjectId(category) } },
        { $group: { _id: "$_id" } },
      ]);
      query._id = { $in: matchingOrderIds.map((o) => o._id) };
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort(SORT_MAP[sort] || SORT_MAP.newest)
      .skip(skip)
      .limit(limit);

    // Status counts (across all of this customer's orders, ignoring the status filter)
    const statusCounts = await Order.aggregate([
      { $match: { customer: customer._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const counts = { draft: 0, pending: 0, partiallyPaid: 0, paid: 0 };
    statusCounts.forEach((s) => {
      if (counts[s._id] !== undefined) counts[s._id] = s.count;
    });

    // Sales/cost/profit summary for the exact date+category+status scope,
    // computed over every matching line item (not just the current page).
    // Cost uses each product's CURRENT initialPrice - orders only snapshot
    // the selling price, not the cost basis at sale time, so this is an
    // approximation when a product's cost has changed since the sale.
    const summaryMatch = { customer: customer._id };
    if (query.status) summaryMatch.status = query.status;
    if (query.createdAt) summaryMatch.createdAt = query.createdAt;

    const summaryAgg = await Order.aggregate([
      { $match: summaryMatch },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
      ...(category
        ? [{ $match: { "productInfo.category": new mongoose.Types.ObjectId(category) } }]
        : []),
      {
        $group: {
          _id: null,
          totalSales: { $sum: { $multiply: ["$products.quantity", "$products.price"] } },
          totalCost: {
            $sum: {
              $multiply: ["$products.quantity", { $ifNull: ["$productInfo.initialPrice", 0] }],
            },
          },
          totalQuantity: { $sum: "$products.quantity" },
        },
      },
    ]);
    const summaryRow = summaryAgg[0] || { totalSales: 0, totalCost: 0, totalQuantity: 0 };
    const summary = {
      totalSales: summaryRow.totalSales,
      totalCost: summaryRow.totalCost,
      totalProfit: summaryRow.totalSales - summaryRow.totalCost,
      totalQuantity: summaryRow.totalQuantity,
    };

    return NextResponse.json(
      {
        fullName: customer.fullName,
        orders,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        counts,
        summary,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching customer orders", error: error.message },
      { status: 500 }
    );
  }
}
