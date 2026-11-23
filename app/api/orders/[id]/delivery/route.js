import { connectToDB } from "@/lib/connectDb";
import Order from "@/models/Orders";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activityLog";
import { auditView, diffViews, describeChanges } from "@/lib/audit";
import { DELIVERY_VALUES } from "@/lib/delivery";

// Set / change / clear an order's optional delivery: status and delivery
// person. Needs canManageDeliveries (owners always pass). Doesn't touch
// stock, totals or the payment status.
// PATCH /api/orders/[id]/delivery { deliveryStatus: ""|preparing|..., deliveryPerson }
export async function PATCH(req, { params }) {
  await connectToDB();
  const admin = await getUserFromCookie();
  const forbidden = await requirePermission(admin, "canManageDeliveries");
  if (forbidden) return forbidden;
  try {
    const { id } = await params;
    const { deliveryStatus, deliveryPerson } = await req.json();
    if (deliveryStatus !== undefined && deliveryStatus !== "" && deliveryStatus !== null && !DELIVERY_VALUES.includes(deliveryStatus)) {
      return NextResponse.json({ message: "Invalid delivery status" }, { status: 400 });
    }
    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
    if (order.status === "draft") {
      return NextResponse.json({ message: "Finalize the draft before delivering it" }, { status: 400 });
    }

    const before = await auditView("Order", order);
    if (deliveryStatus !== undefined) {
      const next = deliveryStatus || null;
      if (next !== order.deliveryStatus) {
        order.deliveryStatus = next;
        order.deliveredAt = next === "delivered" ? new Date() : null;
      }
    }
    if (deliveryPerson !== undefined) {
      order.deliveryPerson = String(deliveryPerson || "").trim().slice(0, 60);
    }
    await order.save();

    const changes = diffViews("Order", before, await auditView("Order", order));
    if (changes.length) {
      await logActivity({
        admin,
        action: "order.delivery",
        entityType: "Order",
        entityId: order._id,
        entityLabel: `order #${String(order._id).slice(-6)}`,
        changes,
        summary: `Updated delivery: ${describeChanges(changes)}`,
      });
    }
    return NextResponse.json(
      { deliveryStatus: order.deliveryStatus, deliveryPerson: order.deliveryPerson, deliveredAt: order.deliveredAt },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ message: "Error updating delivery", error: error.message }, { status: 500 });
  }
}
