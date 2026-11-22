import { connectToDB } from "@/lib/connectDb";
import Product from "@/models/Products";
import AppSettings from "@/models/AppSettings";
import { NextResponse } from "next/server";

// Powers the dashboard's expiry alert: every product that is inside its own
// alert window - expiryDate minus the product's expiryAlertDays (or the
// default from Settings, AppSettings.expiryAlertDays) is today or earlier -
// including already expired ones. Closest expiry first, paginated.
// GET /api/products/expiring?page=1&limit=5
const DAY_MS = 86400000;

export async function GET(req) {
  await connectToDB();
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit"), 10) || 5));

    const settings = await AppSettings.findOne({ key: "app" }).select("expiryAlertDays").lean();
    const defaultDays = settings?.expiryAlertDays || 30;
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [result] = await Product.aggregate([
      { $match: { expiryDate: { $ne: null } } },
      { $addFields: { alertDays: { $ifNull: ["$expiryAlertDays", defaultDays] } } },
      {
        $match: {
          $expr: { $lte: [{ $subtract: ["$expiryDate", { $multiply: ["$alertDays", DAY_MS] }] }, endOfToday] },
        },
      },
      { $sort: { expiryDate: 1, _id: 1 } },
      {
        $facet: {
          total: [{ $count: "n" }],
          products: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            { $lookup: { from: "categories", localField: "category", foreignField: "_id", as: "category" } },
            { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
            { $project: { name: 1, quantity: 1, unit: 1, expiryDate: 1, alertDays: 1, "category.name": 1 } },
          ],
        },
      },
    ]);

    const total = result?.total?.[0]?.n || 0;
    return NextResponse.json(
      { products: result?.products || [], total, page, totalPages: Math.max(1, Math.ceil(total / limit)), days: defaultDays },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching expiring products", error: error.message },
      { status: 500 }
    );
  }
}
