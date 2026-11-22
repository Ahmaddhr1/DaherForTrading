import { connectToDB } from "@/lib/connectDb";
import Product from "@/models/Products";
import AppSettings from "@/models/AppSettings";
import { NextResponse } from "next/server";

// Powers the dashboard's expiry alert: every product with an expiry date
// within the next N days (AppSettings.expiryAlertDays, default 30) or
// already past it - closest date first, paginated.
// GET /api/products/expiring?page=1&limit=5
export async function GET(req) {
  await connectToDB();
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit"), 10) || 5));

    const settings = await AppSettings.findOne({ key: "app" }).select("expiryAlertDays").lean();
    const days = settings?.expiryAlertDays || 30;
    const cutoff = new Date();
    cutoff.setHours(23, 59, 59, 999);
    cutoff.setDate(cutoff.getDate() + days);

    const query = { expiryDate: { $ne: null, $lte: cutoff } };
    const [total, products] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query)
        .select("name quantity unit expiryDate category")
        .populate({ path: "category", select: "name" })
        .sort({ expiryDate: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json(
      { products, total, page, totalPages: Math.max(1, Math.ceil(total / limit)), days },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching expiring products", error: error.message },
      { status: 500 }
    );
  }
}
