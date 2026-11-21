import { connectToDB } from "@/lib/connectDb";
import Customer from "@/models/Customers";
import Order from "@/models/Orders";
import Payment from "@/models/Payment";
import { getCustomerOverdueInfo, DEFAULT_OVERDUE_DAYS } from "@/lib/overdueCustomers";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

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

    const updatedCustomer = await Customer.findByIdAndUpdate(id, body, {
      new: true,
    });
    if (!updatedCustomer) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 }
      );
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
    await Order.deleteMany({ customer: id });
    await Payment.deleteMany({ customer: id });
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
