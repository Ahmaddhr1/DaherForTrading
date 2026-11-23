import { connectToDB } from "@/core/platform/connectDb";
import { recordPurchase } from "@/core/suppliers/purchaseService";
import { respondError } from "@/core/shared/serviceError";
import Company from "@/core/suppliers/models/Company";
import Purchase from "@/core/suppliers/models/Purchase";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/core/platform/auth";
import { requirePermission } from "@/core/platform/permissions";

// GET paginated purchase history for a company
export async function GET(req, { params }) {
  await connectToDB();
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const skip = (page - 1) * limit;

    const company = await Company.findById(id).select("name");
    if (!company) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }

    const query = { company: id };
    if (startDateParam || endDateParam) {
      // The client resolves these to precise instants before sending them
      // (see core/shared/dateUtils.js localDayStartISO/localDayEndISO).
      query.createdAt = {};
      if (startDateParam) query.createdAt.$gte = new Date(startDateParam);
      if (endDateParam) query.createdAt.$lte = new Date(endDateParam);
    }

    const total = await Purchase.countDocuments(query);
    const purchases = await Purchase.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const summaryAgg = await Purchase.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$total" },
          totalQuantity: { $sum: "$quantity" },
        },
      },
    ]);
    const summary = summaryAgg[0]
      ? { totalAmount: summaryAgg[0].totalAmount, totalQuantity: summaryAgg[0].totalQuantity }
      : { totalAmount: 0, totalQuantity: 0 };

    return NextResponse.json(
      {
        companyName: company.name,
        purchases,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        summary,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching purchases", error: error.message },
      { status: 500 }
    );
  }
}

// Create a purchase from this company (restocking a product)
export async function POST(req, { params }) {
  await connectToDB();
  const user = await getUserFromCookie();
  const forbidden = await requirePermission(user, "canRecordPurchases");
  if (forbidden) return forbidden;

  try {
    const { id } = await params;
    const purchase = await recordPurchase({ companyId: id, input: await req.json(), user });
    return NextResponse.json(
      { message: "Purchase recorded successfully", purchase },
      { status: 201 }
    );
  } catch (error) {
    return respondError(error, { message: "Error recording purchase" });
  }
}
