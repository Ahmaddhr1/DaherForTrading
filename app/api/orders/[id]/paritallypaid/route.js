import { NextResponse } from "next/server";
import Order from "@/core/orders/models/Orders";
import { connectToDB } from "@/core/platform/connectDb";
import { getUserFromCookie } from "@/core/platform/auth";
import { requirePermission } from "@/core/platform/permissions";
import { logActivity } from "@/core/audit/activityLog";
import { auditView, diffViews, extraChange, orderLabel } from "@/core/audit/audit";
import { recordCustomerPayment } from "@/core/payments/recordPayment";

// Applies a partial payment to an order. The amount is recorded as ONE
// payment (linked to the order) via recordCustomerPayment, which is also the
// only thing that lowers the customer's debt - so the debt is updated
// exactly once.
export async function PUT(req, { params }) {
  await connectToDB();
  const admin = await getUserFromCookie();
  const forbidden = await requirePermission(admin, "canFinalizeOrders");
  if (forbidden) return forbidden;

  const { id } = await params;
  const { amountpaid } = await req.json();

  try {
    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (order.status === "paid") {
      return NextResponse.json({ error: "Order is already fully paid." }, { status: 400 });
    }
    if (order.status === "draft") {
      return NextResponse.json({ error: "Finalize this draft before recording a payment." }, { status: 400 });
    }
    if (!order.customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const amount = Math.round(Number(amountpaid) * 100) / 100;
    const previousAmountPaid = order.amountpaid || 0;
    const previousRemaining = order.remainingBalance ?? order.total - previousAmountPaid;

    if (!amount || amount <= 0 || amount > previousRemaining + 0.005) {
      return NextResponse.json(
        { error: `Invalid payment. You can only pay up to ${previousRemaining.toFixed(2)}.` },
        { status: 400 }
      );
    }

    const beforeView = await auditView("Order", order);

    const newAmountPaid = Math.round((previousAmountPaid + amount) * 100) / 100;
    const newRemaining = Math.max(0, Math.round((order.total - newAmountPaid) * 100) / 100);
    order.amountpaid = newAmountPaid;
    order.remainingBalance = newRemaining;
    order.status = newRemaining === 0 ? "paid" : "partiallyPaid";
    if (newRemaining === 0) order.paymentDate = new Date();
    await order.save();

    const result = await recordCustomerPayment({ customerId: order.customer, amount, order: order._id });

    await logActivity({
      admin,
      action: "order.payment",
      entityType: "Order",
      entityId: order._id,
      entityLabel: orderLabel(order),
      summary: `Recorded a $${amount.toFixed(2)} payment on ${orderLabel(order)} from ${result.customerName}`,
      changes: [
        ...diffViews("Order", beforeView, await auditView("Order", order)),
        extraChange("payment.amount", "Payment recorded", null, amount, "money"),
        extraChange("customer.debt", "Customer debt", result.previousDebt, result.newDebt, "money"),
      ],
    });

    return NextResponse.json({
      message: `Payment of ${amount.toFixed(2)} applied successfully. ${
        newRemaining > 0 ? `Remaining balance: ${newRemaining.toFixed(2)}` : "Order fully paid!"
      }`,
      paymentDetails: {
        amountPaid: amount,
        previousDebt: result.previousDebt,
        newDebt: result.newDebt,
      },
      updatedOrder: {
        amountpaid: newAmountPaid,
        remainingBalance: newRemaining,
        status: order.status,
      },
    });
  } catch (error) {
    console.error("Payment update error:", error.message);
    return NextResponse.json({ error: "Failed to update payment.", details: error.message }, { status: 500 });
  }
}
