import { connectToDB } from "@/lib/connectDb";
import Order from "@/models/Orders";
import AppSettings from "@/models/AppSettings";
import { NextResponse } from "next/server";

// Public, unauthenticated, read-only view of a single order for sharing
// (e.g. via a WhatsApp link). Deliberately exposes only what's needed to
// read an invoice - no customer debt, no other orders, no way to list or
// enumerate anything beyond the one order this exact id points to.
export async function GET(req, { params }) {
  await connectToDB();
  try {
    const { id } = params;

    const order = await Order.findById(id)
      .select("products total discountTotal taxRate taxAmount status createdAt amountpaid remainingBalance")
      .populate({ path: "customer", select: "fullName" });

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    const settings = await AppSettings.findOne({ key: "app" }).select("dollarRate");

    return NextResponse.json(
      {
        customerName: order.customer?.fullName || "Customer",
        dollarRate: settings?.dollarRate || 0,
        products: order.products.map((p) => ({
          name: p.name,
          quantity: p.quantity,
          price: p.price,
          discount: p.discount || 0,
        })),
        total: order.total,
        discountTotal: order.discountTotal || 0,
        taxRate: order.taxRate || 0,
        taxAmount: order.taxAmount || 0,
        status: order.status,
        amountpaid: order.amountpaid || 0,
        remainingBalance: order.remainingBalance ?? order.total,
        createdAt: order.createdAt,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }
}
