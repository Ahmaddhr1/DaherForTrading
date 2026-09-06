import { connectToDB } from "@/lib/connectDb";
import Customer from "@/models/Customers";
import Order from "@/models/Orders";
import { NextResponse } from "next/server";

// Public, unauthenticated, read-only statement for sharing (e.g. via a
// WhatsApp link). Exposes only what's needed to read the statement - no
// phone number, no way to list or enumerate anything beyond this customer's
// own orders.
export async function GET(req, { params }) {
  await connectToDB();
  try {
    const { id } = await params;

    const customer = await Customer.findById(id).select("fullName");
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
    return NextResponse.json({ message: "Statement not found" }, { status: 404 });
  }
}
