import { connectToDB } from "@/lib/connectDb";
import RecurringDisbursement from "@/models/RecurringDisbursement";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";

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
      admin: await getUserFromCookie(),
      action: "recurringDisbursement.create",
      entityType: "Disbursement",
      entityId: template._id,
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
