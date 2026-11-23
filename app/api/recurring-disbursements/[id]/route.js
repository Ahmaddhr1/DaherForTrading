import { connectToDB } from "@/core/platform/connectDb";
import RecurringDisbursement from "@/core/expenses/models/RecurringDisbursement";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/core/platform/auth";
import { logActivity } from "@/core/audit/activityLog";
import { diffViews, snapshotChanges, extraChange, describeChanges } from "@/core/audit/audit";
import { requirePermission } from "@/core/platform/permissions";

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

    const beforeTemplate = await RecurringDisbursement.findById(id);
    if (!beforeTemplate) {
      return NextResponse.json({ message: "Recurring disbursement not found" }, { status: 404 });
    }
    const template = await RecurringDisbursement.findByIdAndUpdate(id, update, { new: true });

    const changes = diffViews("RecurringDisbursement", beforeTemplate.toObject(), template.toObject());
    if (changes.length > 0) {
      await logActivity({
        admin,
        action: "recurringDisbursement.edit",
        entityType: "RecurringDisbursement",
        entityId: template._id,
        entityLabel: template.description,
        summary: `Updated the recurring disbursement "${template.description}": ${describeChanges(changes)}`,
        changes,
      });
    }

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
      entityType: "RecurringDisbursement",
      entityId: id,
      entityLabel: template.description,
      changes: snapshotChanges("RecurringDisbursement", template.toObject(), "delete"),
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
