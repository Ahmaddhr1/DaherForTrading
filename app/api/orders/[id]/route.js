import { connectToDB } from "@/lib/connectDb";
import Customer from "@/models/Customers";
import Order from "@/models/Orders";
import Product from "@/models/Products";
import { NextResponse } from "next/server";

// GET one
export async function GET(_, { params }) {
  await connectToDB();
  try {
    
    const {id} = await params;
    const order = await Order.findById(id)
      .populate("customer")
      .populate("products");
    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching order", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  await connectToDB();

  try {
    const { id } = params; 
    console.log("Deleting order with ID:", id);

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    // Only allow deleting pending orders and drafts
    if (order.status !== "pending" && order.status !== "draft") {
      return NextResponse.json(
        { message: "Only pending orders or drafts can be deleted" },
        { status: 400 }
      );
    }

    // A draft never touched stock or debt, so there's nothing to roll back -
    // just detach it from the customer and remove it.
    if (order.status === "pending") {
      for (const item of order.products) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: {
            quantity: item.quantity,
            nbOfOrders: -item.quantity,
          },
        });
      }

      await Customer.findByIdAndUpdate(order.customer, {
        $inc: { debt: -order.total },
        $pull: { orders: order._id },
      });
    } else {
      await Customer.findByIdAndUpdate(order.customer, {
        $pull: { orders: order._id },
      });
    }

    // Delete the order itself
    await Order.findByIdAndDelete(id);

    return NextResponse.json(
      { message: "Order deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.log("ERROR deleting order:", error.message);
    return NextResponse.json(
      { message: "Error deleting order", error: error.message },
      { status: 500 }
    );
  }
}

// Edit the products/quantities/prices of a draft or still-pending order.
// A draft never touched stock or debt, so it's just overwritten in place. A
// pending order rebuilds its line items from scratch: stock and nbOfOrders
// are computed as a net delta against the order's current items (so
// switching a row's product or quantity nets out correctly against a single
// product touched twice), and everything is validated against that net
// delta before any write happens.
export async function PUT(req, { params }) {
  await connectToDB();

  try {
    const { id } = await params;
    const { products } = await req.json();

    if (!products?.length) {
      return NextResponse.json(
        { message: "No products provided" },
        { status: 400 }
      );
    }

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    if (order.status !== "pending" && order.status !== "draft") {
      return NextResponse.json(
        { message: "Only pending orders or drafts can be updated" },
        { status: 400 }
      );
    }

    if (order.status === "draft") {
      const enrichedProducts = [];
      let totalProfit = 0;
      let total = 0;

      for (const item of products) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return NextResponse.json(
            { message: `Product with ID ${item.productId} not found.` },
            { status: 404 }
          );
        }
        if (typeof item.price !== "number" || isNaN(item.price)) {
          return NextResponse.json(
            { message: `Invalid price for product ${product.name}` },
            { status: 400 }
          );
        }

        totalProfit += (item.price - product.initialPrice) * item.quantity;
        total += item.price * item.quantity;

        enrichedProducts.push({
          productId: item.productId,
          name: product.name,
          quantity: item.quantity,
          price: item.price,
        });
      }

      order.products = enrichedProducts;
      order.total = total;
      order.profit = totalProfit;
      await order.save();

      return NextResponse.json(
        { message: "Draft updated successfully", order },
        { status: 200 }
      );
    }

    const oldQtyByProduct = new Map();
    for (const item of order.products) {
      const key = item.productId.toString();
      oldQtyByProduct.set(key, (oldQtyByProduct.get(key) || 0) + item.quantity);
    }

    const newQtyByProduct = new Map();
    for (const item of products) {
      newQtyByProduct.set(
        item.productId,
        (newQtyByProduct.get(item.productId) || 0) + item.quantity
      );
    }

    const enrichedProducts = [];
    let totalProfit = 0;
    let total = 0;

    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return NextResponse.json(
          { message: `Product with ID ${item.productId} not found.` },
          { status: 404 }
        );
      }

      if (typeof item.price !== "number" || isNaN(item.price)) {
        return NextResponse.json(
          { message: `Invalid price for product ${product.name}` },
          { status: 400 }
        );
      }

      const availableStock = product.quantity + (oldQtyByProduct.get(item.productId) || 0);
      if (availableStock < newQtyByProduct.get(item.productId)) {
        return NextResponse.json(
          {
            message: `Insufficient stock for "${product.name}". Available: ${availableStock}, requested: ${newQtyByProduct.get(item.productId)}`,
          },
          { status: 400 }
        );
      }

      const itemProfit = (item.price - product.initialPrice) * item.quantity;
      totalProfit += itemProfit;
      total += item.price * item.quantity;

      enrichedProducts.push({
        productId: item.productId,
        name: product.name,
        quantity: item.quantity,
        price: item.price,
      });
    }

    const touchedProductIds = new Set([
      ...oldQtyByProduct.keys(),
      ...newQtyByProduct.keys(),
    ]);
    const productUpdates = Array.from(touchedProductIds).map((productId) => {
      const oldQty = oldQtyByProduct.get(productId) || 0;
      const newQty = newQtyByProduct.get(productId) || 0;
      return {
        updateOne: {
          filter: { _id: productId },
          update: {
            $inc: {
              quantity: oldQty - newQty,
              nbOfOrders: newQty - oldQty,
            },
          },
        },
      };
    });
    await Product.bulkWrite(productUpdates);

    const debtDelta = total - order.total;

    order.products = enrichedProducts;
    order.total = total;
    order.profit = totalProfit;
    order.remainingBalance = total - (order.amountpaid || 0);
    await order.save();

    await Customer.findByIdAndUpdate(order.customer, {
      $inc: { debt: debtDelta },
    });

    return NextResponse.json(
      { message: "Order updated successfully", order },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating order", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req, { params }) {
  await connectToDB();

  try {
    const customerId = params.id;
    const { products, total, asDraft } = await req.json();

    if (!products?.length) {
      return NextResponse.json(
        { message: "No products provided" },
        { status: 400 }
      );
    }

    const enrichedProducts = [];
    const productUpdates = [];
    let totalProfit = 0; // Track total profit

    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return NextResponse.json(
          { message: `Product with ID ${item.productId} not found.` },
          { status: 404 }
        );
      }

      // Validate price
      if (typeof item.price !== "number" || isNaN(item.price)) {
        return NextResponse.json(
          { message: `Invalid price for product ${product.name}` },
          { status: 400 }
        );
      }

      // A draft doesn't touch stock, so it's exempt from the stock check -
      // it's only enforced once the draft is finalized into a real order.
      if (!asDraft && product.quantity < item.quantity) {
        return NextResponse.json(
          {
            message: `Insufficient stock for "${product.name}". Available: ${product.quantity}, requested: ${item.quantity}`,
          },
          { status: 400 }
        );
      }

      // Calculate profit: If sent price differs from current product price
      let itemProfit = 0;
      if (item.price !== product.price) {
        // Subtract sent price from initial price * quantity
        itemProfit = (item.price - product.initialPrice) * item.quantity;
      } else {
        itemProfit = (product.price - product.initialPrice) * item.quantity;
      }
      totalProfit += itemProfit;

      enrichedProducts.push({
        productId: item.productId,
        name: product.name,
        quantity: item.quantity,
        price: item.price,
      });

      if (!asDraft) {
        productUpdates.push({
          updateOne: {
            filter: { _id: product._id },
            update: {
              $inc: {
                quantity: -item.quantity,
                nbOfOrders: item.quantity,
              },
            },
          },
        });
      }
    }

    const newOrder = await Order.create({
      customer: customerId,
      products: enrichedProducts,
      total,
      status: asDraft ? "draft" : "pending",
      remainingBalance: asDraft ? undefined : total,
      profit: totalProfit, // store calculated profit
    });

    // A draft never reserves stock or counts toward debt until finalized.
    if (!asDraft) {
      await Product.bulkWrite(productUpdates);
    }

    await Customer.findByIdAndUpdate(customerId, {
      $push: { orders: newOrder._id },
      ...(asDraft ? {} : { $inc: { debt: newOrder.total } }),
    });

    return NextResponse.json(
      { message: asDraft ? "Draft saved successfully" : "Order created successfully", order: newOrder },
      { status: 201 }
    );
  } catch (error) {
    console.log(error.message);
    return NextResponse.json(
      { message: "Error creating order", error: error.message },
      { status: 500 }
    );
  }
}

