import { NextResponse } from "next/server";
import { connectToDB } from "@/core/platform/connectDb";
import Purchase from "@/core/suppliers/models/Purchase";
import Company from "@/core/suppliers/models/Company";
import { getUserFromCookie } from "@/core/platform/auth";
import { requirePermission } from "@/core/platform/permissions";
import { logActivity } from "@/core/audit/activityLog";
import { extraChange } from "@/core/audit/audit";
import { recordSupplierPayment } from "@/core/payments/recordPayment";

// Marks an unpaid purchase as paid: reduces what we owe the company by the
// purchase total and records a SupplierPayment, which shows up in the
// Payments tab under "Supplier payments".
export async function PUT(_, { params }) {
  await connectToDB();
  const admin = await getUserFromCookie();
  const forbidden = await requirePermission(admin, "canRecordPurchases");
  if (forbidden) return forbidden;

  try {
    const { id } = await params;
    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return NextResponse.json({ message: "Purchase not found" }, { status: 404 });
    }
    if (purchase.paid) {
      return NextResponse.json({ message: "This purchase is already paid" }, { status: 400 });
    }

    const company = await Company.findById(purchase.company);
    if (!company) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }

    purchase.paid = true;
    await purchase.save();

    // One call: lowers what we owe the company once and records one payment.
    const { payment, previousDebt, newDebt } = await recordSupplierPayment({
      companyId: company._id,
      amount: purchase.total,
      purchase: purchase._id,
      admin,
    });

    await logActivity({
      admin,
      action: "purchase.markPaid",
      entityType: "Purchase",
      entityId: purchase._id,
      entityLabel: `${purchase.quantity} x ${purchase.productName}`,
      summary: `Paid ${company.name} $${purchase.total.toFixed(2)} for ${purchase.quantity} x "${purchase.productName}"`,
      changes: [
        extraChange("paid", "Paid", false, true, "bool"),
        extraChange("payment.amount", "Payment amount", null, purchase.total, "money"),
        extraChange("company.debt", `${company.name} — Debt (owed to them)`, previousDebt, newDebt, "money"),
      ],
    });

    return NextResponse.json({ message: "Purchase marked as paid", purchase, payment }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error marking purchase as paid", error: error.message },
      { status: 500 }
    );
  }
}
