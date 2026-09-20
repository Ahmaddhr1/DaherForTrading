import { connectToDB } from "@/lib/connectDb";
import Company from "@/models/Company";
import Purchase from "@/models/Purchase";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";

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
  try {
    const { id } = params;
    const body = await req.json();
    delete body.debt;
    delete body.purchases;

    const updatedCompany = await Company.findByIdAndUpdate(id, body, {
      new: true,
    });
    if (!updatedCompany) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }

    await logActivity({
      admin: await getUserFromCookie(),
      action: "company.edit",
      entityType: "Company",
      entityId: updatedCompany._id,
      summary: `Edited supplier "${updatedCompany.name}"`,
    });

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
  try {
    const { id } = params;
    const deletedCompany = await Company.findByIdAndDelete(id);
    if (!deletedCompany) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }
    await Purchase.deleteMany({ company: id });

    await logActivity({
      admin: await getUserFromCookie(),
      action: "company.delete",
      entityType: "Company",
      entityId: id,
      summary: `Deleted supplier "${deletedCompany.name}" (and their purchase history)`,
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
