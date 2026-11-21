import { NextResponse } from "next/server";
import Order from "@/models/Orders";
import Customer from "@/models/Customers";
import Payment from "@/models/Payment";
import { connectToDB } from "@/lib/connectDb";
import { getUserFromCookie } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activityLog";
import { auditView, diffViews, snapshotChanges, diffOrderLines, extraChange, describeChanges, orderLabel } from "@/lib/audit";

export async function PUT(req, { params }) {
  await connectToDB();
  const forbidden = await requirePermission(await getUserFromCookie(), "canFinalizeOrders");
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

    const previousAmountPaid = order.amountpaid || 0;
    const previousRemaining = order.remainingBalance ?? (order.total - previousAmountPaid);

    // Validate payment amount
    if (
      !amountpaid ||
      amountpaid <= 0 ||
      amountpaid > previousRemaining
    ) {
      return NextResponse.json(
        { error: `Invalid payment. You can only pay up to ${previousRemaining.toFixed(2)}.` },
        { status: 400 }
      );
    }

    // Get current customer debt
    const customer = await Customer.findById(order.customer);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    // Calculate how much we can actually deduct from debt (can't go below 0)
    const maxAllowedPayment = Math.min(amountpaid, customer.debt);
    const actualDebtReduction = -maxAllowedPayment; // Negative because it reduces debt
    const newDebtValue = Math.max(0, customer.debt + actualDebtReduction);

    // Calculate new values
    const newAmountPaid = previousAmountPaid + amountpaid;
    const newRemaining = order.total - newAmountPaid;

    const beforeView = await auditView("Order", order);

    // Update order
    order.amountpaid = newAmountPaid;
    order.remainingBalance = newRemaining;
    order.status = newRemaining === 0 ? "paid" : "partiallyPaid";
    await order.save();

    // Update customer debt - use either $inc or $set, not both
    await Customer.findByIdAndUpdate(order.customer, {
      $set: { debt: newDebtValue }
    });

    await logActivity({
      admin: await getUserFromCookie(),
      action: "order.payment",
      entityType: "Order",
      entityId: order._id,
      entityLabel: orderLabel(order),
      summary:
        maxAllowedPayment > 0
          ? `Recorded a $${maxAllowedPayment.toFixed(2)} payment on ${orderLabel(order)} from ${customer.fullName}`
          : `Applied $${amountpaid.toFixed(2)} to ${orderLabel(order)} (already covered by earlier payments from ${customer.fullName} - no new payment recorded)`,
      changes: [
        ...diffViews("Order", beforeView, await auditView("Order", order)),
        extraChange("customer.debt", "Customer debt", customer.debt, newDebtValue, "money"),
      ],
    });

    // Only the part of this that still reduces the customer's debt is new
    // money. If they already paid some/all of it through a manual payment on
    // the Payments tab (which lowers their debt without touching the order),
    // that cash is already recorded - recording it again here would count the
    // same payment twice. So the payment is capped at the debt reduction, and
    // none is created when the debt was already cleared.
    if (maxAllowedPayment > 0) {
      await Payment.create({
        customer: order.customer,
        amount: maxAllowedPayment,
        previousDebt: customer.debt,
        newDebt: newDebtValue,
        source: "order",
        order: order._id,
      });
    }

    return NextResponse.json({
      message: `Payment of ${amountpaid.toFixed(2)} applied successfully. ${newRemaining > 0 ? `Remaining balance: ${newRemaining.toFixed(2)}` : 'Order fully paid!'}`,
      paymentDetails: {
        amountPaid: amountpaid,
        debtReduction: maxAllowedPayment,
        previousDebt: customer.debt,
        newDebt: newDebtValue
      },
      updatedOrder: {
        amountpaid: newAmountPaid,
        remainingBalance: newRemaining,
        status: order.status
      }
    });
  } catch (error) {
    console.error("Payment update error:", error.message);
    return NextResponse.json(
      { error: "Failed to update payment.", details: error.message }, 
      { status: 500 }
    );
  }
}