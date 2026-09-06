import { connectToDB } from "@/lib/connectDb";
import Customer from "@/models/Customers";
import Order from "@/models/Orders";
import { NextResponse } from "next/server";

// Full statement for one customer: every order they've placed with what was
// paid and what's still owed on each, plus running totals. Used both by the
// authenticated dashboard statement page and as the source the public
// share link is built from.
export async function GET(_, { params }) {
  await connectToDB();
  try {
    const { id } = await params;

    const customer = await Customer.findById(id).select("fullName phoneNumber debt");
    if (!customer) {
      return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    }

    const orders = await Order.find({ customer: customer._id, status: { $ne: "draft" } })
      .select("total amountpaid remainingBalance status createdAt")
      .sort({ createdAt: -1 });

    const totals = orders.reduce(
      (acc, order) => ({
        totalAmount: acc.totalAmount + order.total,
        totalPaid: acc.totalPaid + (order.amountpaid || 0),
        totalRemaining: acc.totalRemaining + (order.remainingBalance ?? order.total),
      }),
      { totalAmount: 0, totalPaid: 0, totalRemaining: 0 }
    );

    return NextResponse.json(
      {
        fullName: customer.fullName,
        phoneNumber: customer.phoneNumber,
        debt: customer.debt,
        orders: orders.map((o) => ({
          _id: o._id,
          total: o.total,
          amountpaid: o.amountpaid || 0,
          remainingBalance: o.remainingBalance ?? o.total,
          status: o.status,
          createdAt: o.createdAt,
        })),
        totals,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching customer statement", error: error.message },
      { status: 500 }
    );
  }
}
