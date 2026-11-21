import { connectToDB } from "@/lib/connectDb";
import Customer from "@/models/Customers";
import Order from "@/models/Orders";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activityLog";
import { getUserFromCookie } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

// Attaches a real customer to a draft that only has a hand-typed
// customerNameText (from the product-grid cart's "type a name" checkout).
// Stays a draft afterward - linking never finalizes it; that's still a
// separate explicit action (PUT /api/orders/[id]/finalize).
export async function PATCH(req, { params }) {
  await connectToDB();
  const forbidden = await requirePermission(await getUserFromCookie(), "canEditOrders");
  if (forbidden) return forbidden;

  try {
    const { id } = await params;
    const { customerId } = await req.json();

    if (!customerId) {
      return NextResponse.json({ message: "A customerId is required" }, { status: 400 });
    }

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }
    if (order.status !== "draft") {
      return NextResponse.json(
        { message: "Only drafts can be linked to a customer" },
        { status: 400 }
      );
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    }

    order.customer = customer._id;
    await order.save();

    await Customer.findByIdAndUpdate(customer._id, {
      $push: { orders: order._id },
    });

    await logActivity({
      admin: await getUserFromCookie(),
      action: "order.edit",
      entityType: "Order",
      entityId: order._id,
      summary: `Linked draft order to customer "${customer.fullName}"`,
    });

    return NextResponse.json({ message: "Customer linked successfully", order }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error linking customer", error: error.message },
      { status: 500 }
    );
  }
}
