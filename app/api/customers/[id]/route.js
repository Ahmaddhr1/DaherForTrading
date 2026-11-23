import { connectToDB } from "@/core/platform/connectDb";
import Customer from "@/core/customers/models/Customers";
import Order from "@/core/orders/models/Orders";
import Payment from "@/core/payments/models/Payment";
import { getCustomerOverdueInfo, DEFAULT_OVERDUE_DAYS } from "@/core/customers/overdueCustomers";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/core/platform/auth";
import { requirePermission } from "@/core/platform/permissions";
import { logActivity } from "@/core/audit/activityLog";
import { auditView, diffViews, snapshotChanges, extraChange, describeChanges } from "@/core/audit/audit";

// GET one customer
export async function GET(req, { params }) {
  await connectToDB();
  try {
    const id = params.id;
    const customer = await Customer.findById(id).populate({
      path: "orders",
      select:"total createdAt status profit",
      populate: {
        path: "products",
        select: "name price ",
      },
    });
    if (!customer) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 }
      );
    }

    const result = customer.toObject();
    if (customer.debt > 0) {
      const { lastPaymentDate, firstOrderDate } = await getCustomerOverdueInfo(id);
      const referenceDate = lastPaymentDate || firstOrderDate || customer.createdAt;
      const daysSincePayment = Math.floor((Date.now() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24));
      result.lastPaymentDate = lastPaymentDate;
      result.daysSincePayment = daysSincePayment;
      result.isOverdue = daysSincePayment >= DEFAULT_OVERDUE_DAYS;
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching customer", error: error.message },
      { status: 500 }
    );
  }
}
// UPDATE customer
export async function PUT(req, { params }) {
  await connectToDB();
  const forbidden = await requirePermission(await getUserFromCookie(), "canEditCustomers");
  if (forbidden) return forbidden;

  try {
    const id = params.id;
    const body = await req.json();
    // Debt is no longer editable directly here; it will be managed by
    // dedicated debt/purchase endpoints.
    delete body.debt;
    if (body.notes !== undefined) body.notes = String(body.notes ?? "").trim().slice(0, 1000);

    if (body.priceTier !== undefined) {
      const parsedPriceTier = parseInt(body.priceTier, 10);
      if (![1, 2, 3, 4].includes(parsedPriceTier)) {
        return NextResponse.json(
          { error: "Price tier must be 1, 2, 3, or 4." },
          { status: 400 }
        );
      }
      body.priceTier = parsedPriceTier;
    }

    const beforeCustomer = await Customer.findById(id);
    if (!beforeCustomer) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 }
      );
    }
    const updatedCustomer = await Customer.findByIdAndUpdate(id, body, {
      new: true,
    });

    const changes = diffViews(
      "Customer",
      await auditView("Customer", beforeCustomer),
      await auditView("Customer", updatedCustomer)
    );
    if (changes.length > 0) {
      await logActivity({
        admin: await getUserFromCookie(),
        action: "customer.edit",
        entityType: "Customer",
        entityId: updatedCustomer._id,
        entityLabel: updatedCustomer.fullName,
        summary: `Edited customer "${updatedCustomer.fullName}": ${describeChanges(changes)}`,
        changes,
      });
    }
    return NextResponse.json(
      { message: "Customer updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating customer", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE customer
export async function DELETE(req, { params }) {
  await connectToDB();
  const forbidden = await requirePermission(await getUserFromCookie(), "canDelete");
  if (forbidden) return forbidden;

  try {
    const id = params.id;
    const deletedCustomer = await Customer.findByIdAndDelete(id);
    if (!deletedCustomer) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 }
      );
    }
    const { deletedCount: ordersDeleted } = await Order.deleteMany({ customer: id });
    const { deletedCount: paymentsDeleted } = await Payment.deleteMany({ customer: id });

    await logActivity({
      admin: await getUserFromCookie(),
      action: "customer.delete",
      entityType: "Customer",
      entityId: id,
      entityLabel: deletedCustomer.fullName,
      summary: `Deleted customer "${deletedCustomer.fullName}" (with ${ordersDeleted} order${ordersDeleted === 1 ? "" : "s"} and ${paymentsDeleted} payment${paymentsDeleted === 1 ? "" : "s"})`,
      changes: [
        ...snapshotChanges("Customer", await auditView("Customer", deletedCustomer), "delete"),
        extraChange("orders", "Orders removed", ordersDeleted, null, "number"),
        extraChange("payments", "Payments removed", paymentsDeleted, null, "number"),
      ],
    });
    return NextResponse.json(
      { message: "Customer deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting customer", error: error.message },
      { status: 500 }
    );
  }
}
