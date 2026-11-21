import { connectToDB } from "@/lib/connectDb";
import Customer from "@/models/Customers";
import Order from "@/models/Orders";
import Product from "@/models/Products";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { priceOrderItems, PricingError } from "@/lib/orderPricing";
import { requirePermission } from "@/lib/permissions";

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
    // just detach it from the customer and remove it, and (unlike a real
    // pending order below) no special permission is needed: discarding
    // your own in-progress draft is low-risk, not "deleting a record".
    if (order.status === "pending") {
      const forbidden = await requirePermission(await getUserFromCookie(), "canDelete");
      if (forbidden) return forbidden;

      for (const item of order.products) {
        // A custom line never touched inventory, so there's no stock to
        // restore for it.
        if (item.isCustom) continue;
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
    } else if (order.customer) {
      // A draft with no customer linked yet (created from the product-grid
      // cart with just a typed name) was never pushed into any customer's
      // `orders` array, so there's nothing to detach.
      await Customer.findByIdAndUpdate(order.customer, {
        $pull: { orders: order._id },
      });
    }

    // Delete the order itself
    await Order.findByIdAndDelete(id);

    await logActivity({
      admin: await getUserFromCookie(),
      action: "order.delete",
      entityType: "Order",
      entityId: id,
      summary: `Deleted ${order.status === "draft" ? "a draft" : "an order"} worth $${order.total}`,
    });

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

// Edit the products/quantities/prices/discounts/tax of a draft or still-pending order.
// A draft never touched stock or debt, so it's just overwritten in place. A
// pending order rebuilds its line items from scratch: stock and nbOfOrders
// are computed as a net delta against the order's current items (so
// switching a row's product or quantity nets out correctly against a single
// product touched twice), and everything is validated against that net
// delta before any write happens.
export async function PUT(req, { params }) {
  await connectToDB();
  const forbiddenPermission = await requirePermission(await getUserFromCookie(), "canCreateOrders");
  if (forbiddenPermission) return forbiddenPermission;

  try {
    const { id } = await params;
    const { products, taxRate } = await req.json();

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

    const effectiveTaxRate = taxRate !== undefined ? taxRate : order.taxRate;

    // Needed to re-derive the correct price for a non-owner's submitted
    // line items - see priceOrderItems.
    const user = await getUserFromCookie();
    const orderCustomer = order.customer ? await Customer.findById(order.customer) : null;
    const pricingContext = { role: user?.role, priceTier: orderCustomer?.priceTier || 1 };

    if (order.status === "draft") {
      let priced;
      try {
        priced = await priceOrderItems(products, effectiveTaxRate, pricingContext);
      } catch (err) {
        if (err instanceof PricingError) {
          return NextResponse.json({ message: err.message }, { status: err.status });
        }
        throw err;
      }

      order.products = priced.enrichedProducts;
      order.total = priced.total;
      order.discountTotal = priced.discountTotal;
      order.taxRate = priced.taxRate;
      order.taxAmount = priced.taxAmount;
      order.profit = priced.profit;
      await order.save();

      await logActivity({
        admin: await getUserFromCookie(),
        action: "order.edit",
        entityType: "Order",
        entityId: order._id,
        summary: `Edited a draft order (now $${priced.total.toFixed(2)})`,
      });

      return NextResponse.json(
        { message: "Draft updated successfully", order },
        { status: 200 }
      );
    }

    // Custom lines never touched inventory, so they're excluded from every
    // stock computation below - only real catalog products participate.
    const oldQtyByProduct = new Map();
    for (const item of order.products) {
      if (item.isCustom || !item.productId) continue;
      const key = item.productId.toString();
      oldQtyByProduct.set(key, (oldQtyByProduct.get(key) || 0) + item.quantity);
    }

    const newQtyByProduct = new Map();
    for (const item of products) {
      if (item.isCustom) continue;
      newQtyByProduct.set(
        item.productId,
        (newQtyByProduct.get(item.productId) || 0) + item.quantity
      );
    }

    // Stock check happens against the net delta before pricing runs.
    for (const item of products) {
      if (item.isCustom) continue;
      const product = await Product.findById(item.productId);
      if (!product) {
        return NextResponse.json(
          { message: `Product with ID ${item.productId} not found.` },
          { status: 404 }
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
    }

    let priced;
    try {
      priced = await priceOrderItems(products, effectiveTaxRate, pricingContext);
    } catch (err) {
      if (err instanceof PricingError) {
        return NextResponse.json({ message: err.message }, { status: err.status });
      }
      throw err;
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

    const debtDelta = priced.total - order.total;
    const previousTotal = order.total;

    order.products = priced.enrichedProducts;
    order.total = priced.total;
    order.discountTotal = priced.discountTotal;
    order.taxRate = priced.taxRate;
    order.taxAmount = priced.taxAmount;
    order.profit = priced.profit;
    order.remainingBalance = priced.total - (order.amountpaid || 0);
    await order.save();

    await Customer.findByIdAndUpdate(order.customer, {
      $inc: { debt: debtDelta },
    });

    await logActivity({
      admin: await getUserFromCookie(),
      action: "order.edit",
      entityType: "Order",
      entityId: order._id,
      summary: `Edited order (total changed from $${previousTotal.toFixed(2)} to $${priced.total.toFixed(2)})`,
      metadata: { before: previousTotal, after: priced.total },
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
  const forbiddenPermission = await requirePermission(await getUserFromCookie(), "canCreateOrders");
  if (forbiddenPermission) return forbiddenPermission;

  try {
    const customerId = params.id;
    const { products, taxRate, asDraft } = await req.json();

    if (!products?.length) {
      return NextResponse.json(
        { message: "No products provided" },
        { status: 400 }
      );
    }

    // Needed to re-derive the correct price for a non-owner's submitted
    // line items - see priceOrderItems.
    const user = await getUserFromCookie();
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    }

    let priced;
    try {
      priced = await priceOrderItems(products, taxRate, {
        role: user?.role,
        priceTier: customer.priceTier || 1,
      });
    } catch (err) {
      if (err instanceof PricingError) {
        return NextResponse.json({ message: err.message }, { status: err.status });
      }
      throw err;
    }

    // A draft doesn't touch stock, so it's exempt from the stock check -
    // it's only enforced once the draft is finalized into a real order.
    // Custom lines never touched inventory, so they're skipped here too.
    if (!asDraft) {
      for (let i = 0; i < priced.enrichedProducts.length; i++) {
        const item = priced.enrichedProducts[i];
        if (item.isCustom) continue;
        const product = priced.productLookups[i];
        if (product.quantity < item.quantity) {
          return NextResponse.json(
            {
              message: `Insufficient stock for "${product.name}". Available: ${product.quantity}, requested: ${item.quantity}`,
            },
            { status: 400 }
          );
        }
      }
    }

    const newOrder = await Order.create({
      customer: customerId,
      products: priced.enrichedProducts,
      total: priced.total,
      discountTotal: priced.discountTotal,
      taxRate: priced.taxRate,
      taxAmount: priced.taxAmount,
      status: asDraft ? "draft" : "pending",
      remainingBalance: asDraft ? undefined : priced.total,
      profit: priced.profit,
    });

    // A draft never reserves stock or counts toward debt until finalized.
    // Custom lines are excluded - there's no stock to deduct for them.
    if (!asDraft) {
      const productUpdates = priced.enrichedProducts
        .filter((item) => !item.isCustom)
        .map((item) => ({
          updateOne: {
            filter: { _id: item.productId },
            update: { $inc: { quantity: -item.quantity, nbOfOrders: item.quantity } },
          },
        }));
      if (productUpdates.length) {
        await Product.bulkWrite(productUpdates);
      }
    }

    await Customer.findByIdAndUpdate(customerId, {
      $push: { orders: newOrder._id },
      ...(asDraft ? {} : { $inc: { debt: newOrder.total } }),
    });

    await logActivity({
      admin: await getUserFromCookie(),
      action: "order.create",
      entityType: "Order",
      entityId: newOrder._id,
      summary: asDraft
        ? `Saved a draft order worth $${priced.total.toFixed(2)}`
        : `Created an order worth $${priced.total.toFixed(2)}`,
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
