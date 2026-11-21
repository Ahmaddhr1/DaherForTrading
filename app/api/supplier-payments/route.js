import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectDb";
import SupplierPayment from "@/models/SupplierPayment";
import Company from "@/models/Company";
import "@/models/Purchase";
import { getUserFromCookie } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activityLog";
import { extraChange } from "@/lib/audit";
import { allocateSupplierPayment } from "@/lib/paymentAllocation";

// "Pay a supplier": records money paid to a company against what we owe
// them, and applies it to their unpaid purchases oldest first (partially
// covering the last one if needed) so each purchase shows what's actually
// been paid - marking one of them paid later only pays the rest.
export async function POST(req) {
  await connectToDB();
  const admin = await getUserFromCookie();
  const forbidden = await requirePermission(admin, "canRecordPurchases");
  if (forbidden) return forbidden;

  try {
    const { companyId, amount } = await req.json();
    if (!companyId) {
      return NextResponse.json({ error: "Company is required" }, { status: 400 });
    }
    const paymentAmount = Math.round(parseFloat(amount) * 100) / 100;
    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json({ error: "Payment amount must be greater than 0" }, { status: 400 });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    const previousDebt = company.debt || 0;
    if (paymentAmount > previousDebt + 0.005) {
      return NextResponse.json(
        { error: `Payment cannot exceed what you owe ${company.name} ($${previousDebt.toFixed(2)})` },
        { status: 400 }
      );
    }

    const newDebt = Math.max(0, Math.round((previousDebt - paymentAmount) * 100) / 100);
    company.debt = newDebt;
    await company.save();

    const { allocations } = await allocateSupplierPayment(companyId, paymentAmount);

    const payment = await SupplierPayment.create({
      company: company._id,
      amount: paymentAmount,
      previousDebt,
      newDebt,
      allocations,
      admin: admin?.id,
      adminName: admin?.adminname,
    });

    await logActivity({
      admin,
      action: "supplierPayment.create",
      entityType: "Company",
      entityId: company._id,
      entityLabel: company.name,
      summary: `Paid ${company.name} $${paymentAmount.toFixed(2)} (applied to ${allocations.length} purchase${allocations.length === 1 ? "" : "s"})`,
      changes: [
        extraChange("payment.amount", "Payment amount", null, paymentAmount, "money"),
        extraChange("company.debt", "Debt (owed to them)", previousDebt, newDebt, "money"),
        ...allocations.map((a) =>
          extraChange(`applied.${a.purchase}`, `Applied to purchase: ${a.productName}`, null, a.amount, "money")
        ),
      ],
    });

    return NextResponse.json({ message: "Supplier payment recorded", payment }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error recording supplier payment", error: error.message },
      { status: 500 }
    );
  }
}

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
