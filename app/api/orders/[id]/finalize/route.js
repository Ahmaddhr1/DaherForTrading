import { connectToDB } from "@/lib/connectDb";
import Customer from "@/models/Customers";
import Order from "@/models/Orders";
import Product from "@/models/Products";
import { NextResponse } from "next/server";

// Converts a draft into a real pending order: validates stock against the
// draft's saved line items (stock was never reserved while it was a draft),
// deducts it, and only then counts the order toward the customer's debt.
export async function PUT(_, { params }) {
  await connectToDB();

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

    const productUpdates = [];
    for (const item of order.products) {
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

    await Product.bulkWrite(productUpdates);

    order.status = "pending";
    order.remainingBalance = order.total;
    await order.save();

    await Customer.findByIdAndUpdate(order.customer, {
      $inc: { debt: order.total },
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
