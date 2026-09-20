import { connectToDB } from "@/lib/connectDb";
import Company from "@/models/Company";
import Account from "@/models/Account";
import SupplierPayment from "@/models/SupplierPayment";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";

// Record a payment TO this supplier, paying down what we owe them - the
// mirror of /api/payments (a payment received FROM a customer). This was
// previously missing entirely: a company's `debt` could only grow (via
// unpaid purchases), with no way to record actually paying it off.
export async function POST(req, { params }) {
  await connectToDB();
  try {
    const { id } = params;
    const { amount, account } = await req.json();

    if (!account) {
      return NextResponse.json(
        { error: "Select which account this payment was paid out of" },
        { status: 400 }
      );
    }

    const accountDoc = await Account.findById(account);
    if (!accountDoc) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be greater than 0" },
        { status: 400 }
      );
    }

    const company = await Company.findById(id);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const previousDebt = company.debt || 0;

    if (paymentAmount > previousDebt) {
      return NextResponse.json(
        { error: `Payment cannot exceed the current amount owed of $${previousDebt}` },
        { status: 400 }
      );
    }

    const newDebt = previousDebt - paymentAmount;

    company.debt = newDebt;
    await company.save();

    const supplierPayment = await SupplierPayment.create({
      company: id,
      amount: paymentAmount,
      previousDebt,
      newDebt,
      account,
    });

    await logActivity({
      admin: await getUserFromCookie(),
      action: "company.debtPayment",
      entityType: "Company",
      entityId: company._id,
      summary: `Paid ${company.name} $${paymentAmount} (owed $${previousDebt} → $${newDebt})`,
      metadata: { previousDebt, newDebt, account },
    });

    return NextResponse.json(
      { message: "Payment recorded successfully", supplierPayment, newDebt },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error recording payment", error: error.message },
      { status: 500 }
    );
  }
}

// List payments made to this supplier, newest first.
export async function GET(req, { params }) {
  await connectToDB();
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    const query = { company: id };
    const total = await SupplierPayment.countDocuments(query);
    const payments = await SupplierPayment.find(query)
      .populate({ path: "account", select: "name" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json(
      { payments, total, page, totalPages: Math.ceil(total / limit) },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching payments", error: error.message },
      { status: 500 }
    );
  }
}
