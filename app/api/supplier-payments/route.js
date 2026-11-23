import { NextResponse } from "next/server";
import { connectToDB } from "@/core/platform/connectDb";
import SupplierPayment from "@/core/payments/models/SupplierPayment";
import Company from "@/core/suppliers/models/Company";
import "@/core/suppliers/models/Purchase";

// Paginated, filterable list of payments made to companies (suppliers) -
// same shape as GET /api/payments so the Payments tab can share its UI.
export async function GET(req) {
  await connectToDB();
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const sort = searchParams.get("sort") || "newest";
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    const SORT_MAP = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      amountDesc: { amount: -1 },
      amountAsc: { amount: 1 },
    };

    const query = {};
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const companies = await Company.find({ name: { $regex: new RegExp(escaped, "i") } }).select("_id");
      query.company = { $in: companies.map((c) => c._id) };
    }
    if (startDateParam || endDateParam) {
      query.createdAt = {};
      if (startDateParam) query.createdAt.$gte = new Date(startDateParam);
      if (endDateParam) query.createdAt.$lte = new Date(endDateParam);
    }

    const total = await SupplierPayment.countDocuments(query);
    const payments = await SupplierPayment.find(query)
      .populate({ path: "company", select: "name phoneNumber" })
      .populate({ path: "purchase", select: "productName quantity" })
      .sort(SORT_MAP[sort] || SORT_MAP.newest)
      .skip(skip)
      .limit(limit);

    const totalsAgg = await SupplierPayment.aggregate([
      { $match: query },
      { $group: { _id: null, totalPaid: { $sum: "$amount" } } },
    ]);

    return NextResponse.json({
      payments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      totalPaid: totalsAgg[0]?.totalPaid || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching supplier payments", error: error.message },
      { status: 500 }
    );
  }
}
