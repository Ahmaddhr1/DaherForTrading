import { connectToDB } from "@/lib/connectDb";
import Company from "@/models/Company";
import Purchase from "@/models/Purchase";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { auditView, diffViews, snapshotChanges, extraChange, describeChanges } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";

// GET one company
export async function GET(req, { params }) {
  await connectToDB();
  try {
    const { id } = params;
    const company = await Company.findById(id);
    if (!company) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }
    return NextResponse.json(company, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching company", error: error.message },
      { status: 500 }
    );
  }
}

// UPDATE company info (debt is not editable here — managed by purchases)
export async function PUT(req, { params }) {
  await connectToDB();
  const forbidden = await requirePermission(await getUserFromCookie(), "canEditCompanies");
  if (forbidden) return forbidden;

  try {
    const { id } = params;
    const body = await req.json();
    delete body.debt;
    delete body.purchases;

    const beforeCompany = await Company.findById(id);
    if (!beforeCompany) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }
    const updatedCompany = await Company.findByIdAndUpdate(id, body, {
      new: true,
    });

    const changes = diffViews("Company", beforeCompany.toObject(), updatedCompany.toObject());
    if (changes.length > 0) {
      await logActivity({
        admin: await getUserFromCookie(),
        action: "company.edit",
        entityType: "Company",
        entityId: updatedCompany._id,
        entityLabel: updatedCompany.name,
        summary: `Edited supplier "${updatedCompany.name}": ${describeChanges(changes)}`,
        changes,
      });
    }

    return NextResponse.json(
      { message: "Company updated successfully", company: updatedCompany },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating company", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE company
export async function DELETE(req, { params }) {
  await connectToDB();
  const admin = await getUserFromCookie();
  const forbidden = await requirePermission(admin, "canDelete");
  if (forbidden) return forbidden;

  try {
    const { id } = params;
    const deletedCompany = await Company.findByIdAndDelete(id);
    if (!deletedCompany) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }
    const { deletedCount: purchasesDeleted } = await Purchase.deleteMany({ company: id });

    await logActivity({
      admin,
      action: "company.delete",
      entityType: "Company",
      entityId: id,
      entityLabel: deletedCompany.name,
      summary: `Deleted supplier "${deletedCompany.name}" (and their purchase history)`,
      changes: [
        ...snapshotChanges("Company", deletedCompany.toObject(), "delete"),
        extraChange("purchases", "Purchases removed", purchasesDeleted, null, "number"),
      ],
    });

    return NextResponse.json(
      { message: "Company deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting company", error: error.message },
      { status: 500 }
    );
  }
}
