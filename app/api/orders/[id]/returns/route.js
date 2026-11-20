import { connectToDB } from "@/lib/connectDb";
import Order from "@/models/Orders";
import Customer from "@/models/Customers";
import Product from "@/models/Products";
import StockAdjustment from "@/models/StockAdjustment";
import Return from "@/models/Return";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { requirePermission } from "@/lib/permissions";

export async function GET(_, { params }) {
  await connectToDB();
  try {
    const { id } = await params;
    const returns = await Return.find({ order: id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ returns }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching returns", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req, { params }) {
  await connectToDB();
  const admin = await getUserFromCookie();
  const forbidden = await requirePermission(admin, "canProcessReturns");
  if (forbidden) return forbidden;

  try {
    const { id } = await params;
    const { items, reason, restocked } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Select at least one item to return" }, { status: 400 });
    }

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }
    if (order.status === "draft") {
      return NextResponse.json({ error: "A draft has no sale to return - edit or delete it instead" }, { status: 400 });
    }
    if (!order.customer) {
      return NextResponse.json({ error: "This order has no linked customer to refund" }, { status: 400 });
    }

    const customer = await Customer.findById(order.customer);
    if (!customer) {
      return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    }

    // How much of each line has already been returned, so this request
    // can't return more than was actually sold - keyed by line identity
    // (productId, or name for a custom line with no productId).
    const priorReturns = await Return.find({ order: id }).select("items").lean();
    const alreadyReturned = new Map();
    for (const ret of priorReturns) {
      for (const item of ret.items) {
        const key = item.productId ? String(item.productId) : `custom:${item.name}`;
        alreadyReturned.set(key, (alreadyReturned.get(key) || 0) + item.quantity);
      }
    }

    const shouldRestock = restocked !== false;
    const returnItems = [];
    let totalRefundAmount = 0;
    const stockUpdates = [];

    for (const requested of items) {
      const quantity = parseInt(requested.quantity, 10);
      if (!quantity || quantity <= 0) continue;

      const orderLine = order.products.find((p) =>
        requested.productId
          ? String(p.productId) === String(requested.productId)
          : !p.productId && p.name === requested.name
      );
      if (!orderLine) {
        return NextResponse.json({ error: `"${requested.name}" isn't on this order` }, { status: 400 });
      }

      const key = orderLine.productId ? String(orderLine.productId) : `custom:${orderLine.name}`;
      const alreadyQty = alreadyReturned.get(key) || 0;
      const remaining = orderLine.quantity - alreadyQty;
      if (quantity > remaining) {
        return NextResponse.json(
          { error: `Only ${remaining} of "${orderLine.name}" can still be returned` },
          { status: 400 }
        );
      }

      returnItems.push({
        productId: orderLine.productId || undefined,
        name: orderLine.name,
        quantity,
        unitPrice: orderLine.price,
      });
      totalRefundAmount += orderLine.price * quantity;

      if (shouldRestock && orderLine.productId) {
        stockUpdates.push({ productId: orderLine.productId, name: orderLine.name, quantity });
      }
    }

    if (returnItems.length === 0) {
      return NextResponse.json({ error: "Enter a quantity to return for at least one item" }, { status: 400 });
    }

    if (shouldRestock) {
      for (const update of stockUpdates) {
        const product = await Product.findById(update.productId);
        if (!product) continue;
        const quantityBefore = product.quantity;
        product.quantity += update.quantity;
        await product.save();

        await StockAdjustment.create({
          product: product._id,
          type: "returned",
          quantityChange: update.quantity,
          quantityBefore,
          quantityAfter: product.quantity,
          reason: reason?.trim() || `Customer return (order ${order._id})`,
          admin: admin?.id,
          adminName: admin?.adminname,
        });
      }
    }

    const previousDebt = customer.debt;
    customer.debt = previousDebt - totalRefundAmount;
    await customer.save();

    const returnDoc = await Return.create({
      order: order._id,
      customer: customer._id,
      items: returnItems,
      restocked: shouldRestock,
      totalRefundAmount,
      reason: reason?.trim() || "",
      previousDebt,
      newDebt: customer.debt,
      admin: admin?.id,
      adminName: admin?.adminname,
    });

    await logActivity({
      admin,
      action: "order.return",
      entityType: "Order",
      entityId: order._id,
      summary: `Processed a $${totalRefundAmount.toFixed(2)} return for ${customer.fullName} (order ${order._id})`,
      metadata: { returnId: returnDoc._id, items: returnItems, restocked: shouldRestock },
    });

    return NextResponse.json({ message: "Return processed", return: returnDoc }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error processing return", error: error.message },
      { status: 500 }
    );
  }
}
