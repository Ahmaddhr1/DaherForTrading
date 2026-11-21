import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectDb";
import Purchase from "@/models/Purchase";
import Company from "@/models/Company";
import SupplierPayment from "@/models/SupplierPayment";
import { getUserFromCookie } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activityLog";
import { extraChange } from "@/lib/audit";
import { purchasePaidAmount, purchaseRemaining } from "@/lib/paymentAllocation";

// Marks a purchase as fully paid: pays whatever is still owed on it (it may
// already be partly covered by an earlier "Pay a supplier" payment), lowers
// what we owe the company by that much, and records a SupplierPayment for
// exactly that amount - never for money already paid.
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

    const paidBefore = purchasePaidAmount(purchase);
    const remaining = purchaseRemaining(purchase);
    const previousDebt = company.debt || 0;
    // Same safeguard as orders: the company balance is what's really owed,
    // so a payment can never take it below zero.
    const amount = Math.round(Math.min(remaining, Math.max(0, previousDebt)) * 100) / 100;
    const newDebt = Math.round((previousDebt - amount) * 100) / 100;

    purchase.paid = true;
    purchase.amountPaid = purchase.total;
    await purchase.save();

    company.debt = newDebt;
    await company.save();

    const payment =
      amount > 0
        ? await SupplierPayment.create({
            company: company._id,
            purchase: purchase._id,
            amount,
            previousDebt,
            newDebt,
            admin: admin?.id,
            adminName: admin?.adminname,
          })
        : null;

    await logActivity({
      admin,
      action: "purchase.markPaid",
      entityType: "Purchase",
      entityId: purchase._id,
      entityLabel: `${purchase.quantity} x ${purchase.productName}`,
      summary:
        amount > 0
          ? `Paid ${company.name} $${amount.toFixed(2)} for ${purchase.quantity} x "${purchase.productName}"`
          : `Marked ${purchase.quantity} x "${purchase.productName}" from ${company.name} as paid (already covered - no new payment recorded)`,
      changes: [
        extraChange("paid", "Paid", false, true, "bool"),
        extraChange("amountPaid", "Amount paid on this purchase", paidBefore, purchase.total, "money"),
        extraChange("payment.amount", "Payment amount", null, amount || null, "money"),
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
