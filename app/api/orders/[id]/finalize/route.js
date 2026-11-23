import { connectToDB } from "@/core/platform/connectDb";
import Customer from "@/core/customers/models/Customers";
import Order from "@/core/orders/models/Orders";
import Product from "@/core/products/models/Products";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/core/platform/auth";
import { requirePermission } from "@/core/platform/permissions";
import { logActivity } from "@/core/audit/activityLog";
import { auditView, diffViews, snapshotChanges, diffOrderLines, extraChange, describeChanges, orderLabel } from "@/core/audit/audit";

// Converts a draft into a real pending order: validates stock against the
// draft's saved line items (stock was never reserved while it was a draft),
// deducts it, and only then counts the order toward the customer's debt.
export async function PUT(_, { params }) {
  await connectToDB();
  const forbidden = await requirePermission(await getUserFromCookie(), "canFinalizeOrders");
  if (forbidden) return forbidden;

  try {
    const { id } = await params;

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    if (order.status !== "draft") {
      return NextResponse.json(
        { message: "Only drafts can be finalized" },
        { status: 400 }
      );
    }

    if (!order.customer) {
      return NextResponse.json(
        { message: "Link a customer before finalizing this draft." },
        { status: 400 }
      );
    }

    const productUpdates = [];
    for (const item of order.products) {
      // A custom line never touched inventory, so there's nothing to check
      // or deduct for it.
      if (item.isCustom) continue;
      const product = await Product.findById(item.productId);
      if (!product) {
        return NextResponse.json(
          { message: `Product "${item.name}" no longer exists.` },
          { status: 404 }
        );
      }
      if (product.quantity < item.quantity) {
        return NextResponse.json(
          {
            message: `Insufficient stock for "${product.name}". Available: ${product.quantity}, requested: ${item.quantity}`,
          },
          { status: 400 }
        );
      }
      productUpdates.push({
        updateOne: {
          filter: { _id: product._id },
          update: { $inc: { quantity: -item.quantity, nbOfOrders: item.quantity } },
        },
      });
    }

    if (productUpdates.length) {
      await Product.bulkWrite(productUpdates);
    }

    const beforeView = await auditView("Order", order);
    const debtBefore = (await Customer.findById(order.customer).select("debt").lean())?.debt ?? 0;

    order.status = "pending";
    order.remainingBalance = order.total;
    await order.save();

    await Customer.findByIdAndUpdate(order.customer, {
      $inc: { debt: order.total },
    });

    await logActivity({
      admin: await getUserFromCookie(),
      action: "order.finalize",
      entityType: "Order",
      entityId: order._id,
      entityLabel: orderLabel(order),
      summary: `Finalized draft ${orderLabel(order)} into an order worth $${order.total.toFixed(2)}`,
      changes: [
        ...diffViews("Order", beforeView, await auditView("Order", order)),
        extraChange("customer.debt", "Customer debt", debtBefore, debtBefore + order.total, "money"),
      ],
    });

    return NextResponse.json(
      { message: "Order finalized successfully", order },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error finalizing order", error: error.message },
      { status: 500 }
    );
  }
}
