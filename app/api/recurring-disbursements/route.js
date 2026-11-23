import { connectToDB } from "@/core/platform/connectDb";
import RecurringDisbursement from "@/core/expenses/models/RecurringDisbursement";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/core/platform/auth";
import { logActivity } from "@/core/audit/activityLog";
import { diffViews, snapshotChanges, extraChange, describeChanges } from "@/core/audit/audit";
import { requirePermission } from "@/core/platform/permissions";

export async function GET() {
  await connectToDB();
  try {
    const templates = await RecurringDisbursement.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ templates }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching recurring disbursements", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  await connectToDB();
  const admin = await getUserFromCookie();
  const forbidden = await requirePermission(admin, "canManageDisbursements");
  if (forbidden) return forbidden;

  try {
    const { description, amount, category, dayOfMonth } = await req.json();

    if (!description?.trim()) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    const parsedDay = parseInt(dayOfMonth, 10);
    if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 28) {
      return NextResponse.json({ error: "Day of month must be between 1 and 28" }, { status: 400 });
    }

    const template = await RecurringDisbursement.create({
      description: description.trim(),
      amount: numericAmount,
      category: category || "Other",
      dayOfMonth: parsedDay,
    });

    await logActivity({
      admin,
      action: "recurringDisbursement.create",
      entityType: "RecurringDisbursement",
      entityId: template._id,
      entityLabel: template.description,
      changes: snapshotChanges("RecurringDisbursement", template.toObject(), "create"),
      summary: `Set up a recurring $${numericAmount} disbursement (${template.category}) on day ${parsedDay} of each month: ${template.description}`,
    });

    return NextResponse.json({ message: "Recurring disbursement created", template }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error creating recurring disbursement", error: error.message },
      { status: 500 }
    );
  }
}
