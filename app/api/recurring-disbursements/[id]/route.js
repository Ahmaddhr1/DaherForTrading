import { connectToDB } from "@/lib/connectDb";
import RecurringDisbursement from "@/models/RecurringDisbursement";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { requirePermission } from "@/lib/permissions";

export async function PATCH(req, { params }) {
  await connectToDB();
  const admin = await getUserFromCookie();
  const forbidden = await requirePermission(admin, "canManageDisbursements");
  if (forbidden) return forbidden;

  try {
    const { id } = await params;
    const body = await req.json();
    const update = {};

    if (body.description !== undefined) {
      if (!body.description.trim()) {
        return NextResponse.json({ error: "Description is required" }, { status: 400 });
      }
      update.description = body.description.trim();
    }
    if (body.amount !== undefined) {
      const numericAmount = parseFloat(body.amount);
      if (!numericAmount || numericAmount <= 0) {
        return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
      }
      update.amount = numericAmount;
    }
    if (body.category !== undefined) {
      update.category = body.category;
    }
    if (body.dayOfMonth !== undefined) {
      const parsedDay = parseInt(body.dayOfMonth, 10);
      if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 28) {
        return NextResponse.json({ error: "Day of month must be between 1 and 28" }, { status: 400 });
      }
      update.dayOfMonth = parsedDay;
    }
    if (body.active !== undefined) {
      update.active = !!body.active;
    }

    const template = await RecurringDisbursement.findByIdAndUpdate(id, update, { new: true });
    if (!template) {
      return NextResponse.json({ message: "Recurring disbursement not found" }, { status: 404 });
    }

    await logActivity({
      admin,
      action: "recurringDisbursement.edit",
      entityType: "Disbursement",
      entityId: template._id,
      summary: `Updated the recurring disbursement "${template.description}"`,
    });

    return NextResponse.json({ message: "Recurring disbursement updated", template }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating recurring disbursement", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(_, { params }) {
  await connectToDB();
  const admin = await getUserFromCookie();
  const forbidden = await requirePermission(admin, "canManageDisbursements");
  if (forbidden) return forbidden;

  try {
    const { id } = await params;
    const template = await RecurringDisbursement.findByIdAndDelete(id);
    if (!template) {
      return NextResponse.json({ message: "Recurring disbursement not found" }, { status: 404 });
    }

    await logActivity({
      admin,
      action: "recurringDisbursement.delete",
      entityType: "Disbursement",
      entityId: id,
      summary: `Deleted the recurring disbursement "${template.description}"`,
    });

    return NextResponse.json({ message: "Recurring disbursement deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting recurring disbursement", error: error.message },
      { status: 500 }
    );
  }
}
