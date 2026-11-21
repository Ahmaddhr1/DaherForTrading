import { NextResponse } from "next/server";
import Order from "@/models/Orders";
import { connectToDB } from "@/lib/connectDb";
import { getUserFromCookie } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activityLog";
import { auditView, diffViews, extraChange, orderLabel } from "@/lib/audit";
import { recordCustomerPayment } from "@/lib/recordPayment";

// Marks an order fully paid. Whatever was still owed on it is recorded as
// ONE payment (linked to the order) via recordCustomerPayment, which is also
// the only thing that lowers the customer's debt - so the debt is updated
// exactly once.
export async function PUT(req, { params }) {
  await connectToDB();
  const admin = await getUserFromCookie();
  const forbidden = await requirePermission(admin, "canFinalizeOrders");
  if (forbidden) return forbidden;

  const { id } = await params;

  try {
    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (order.status === "paid") {
      return NextResponse.json({ message: "Order is already marked as paid." }, { status: 200 });
    }
    if (order.status === "draft") {
      return NextResponse.json({ error: "Finalize this draft before marking it paid." }, { status: 400 });
    }
    if (!order.customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const remainingToPay = Math.round((order.total - (order.amountpaid || 0)) * 100) / 100;
    const beforeView = await auditView("Order", order);

    order.amountpaid = order.total;
    order.remainingBalance = 0;
    order.status = "paid";
    order.paymentDate = new Date();
    await order.save();

    const result =
      remainingToPay > 0
        ? await recordCustomerPayment({ customerId: order.customer, amount: remainingToPay, order: order._id })
        : null;

    await logActivity({
      admin,
      action: "order.markPaid",
      entityType: "Order",
      entityId: order._id,
      entityLabel: orderLabel(order),
      summary: result
        ? `Marked ${orderLabel(order)} as fully paid ($${remainingToPay.toFixed(2)} collected from ${result.customerName})`
        : `Marked ${orderLabel(order)} as fully paid`,
      changes: [
        ...diffViews("Order", beforeView, await auditView("Order", order)),
        result ? extraChange("payment.amount", "Payment recorded", null, remainingToPay, "money") : null,
        result ? extraChange("customer.debt", "Customer debt", result.previousDebt, result.newDebt, "money") : null,
      ],
    });

    return NextResponse.json(
      {
        message: "Order marked as fully paid.",
        details: {
          orderId: order._id,
          totalAmount: order.total,
          amountPaid: order.amountpaid,
          paymentRecorded: remainingToPay,
          newDebt: result?.newDebt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error marking order as paid:", error);
    return NextResponse.json({ error: "Failed to mark order as paid.", details: error.message }, { status: 500 });
  }
}
