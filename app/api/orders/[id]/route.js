import { connectToDB } from "@/core/platform/connectDb";
import { createCustomerOrder } from "@/core/orders/orderService";
import { respondError } from "@/core/shared/serviceError";
import Customer from "@/core/customers/models/Customers";
import Order from "@/core/orders/models/Orders";
import Product from "@/core/products/models/Products";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/core/platform/auth";
import { logActivity } from "@/core/audit/activityLog";
import { auditView, diffViews, snapshotChanges, diffOrderLines, extraChange, describeChanges, orderLabel } from "@/core/audit/audit";
import { priceOrderItems, PricingError } from "@/core/orders/orderPricing";
import { requirePermission, hasPermission } from "@/core/platform/permissions";

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

    const deletedView = await auditView("Order", order);
    const debtBeforeDelete =
      order.status === "pending" && order.customer
        ? (await Customer.findById(order.customer).select("debt").lean())?.debt
        : null;

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
      entityLabel: orderLabel(order),
      summary: `Deleted ${order.status === "draft" ? "a draft" : "an order"} worth $${order.total}${
        deletedView.customer ? ` for ${deletedView.customer}` : ""
      }`,
      changes: [
        ...snapshotChanges("Order", deletedView, "delete"),
        ...diffOrderLines(order.products, []),
        debtBeforeDelete != null
          ? extraChange("customer.debt", "Customer debt", debtBeforeDelete, debtBeforeDelete - order.total, "money")
          : null,
      ],
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
  const forbiddenPermission = await requirePermission(await getUserFromCookie(), "canEditOrders");
  if (forbiddenPermission) return forbiddenPermission;

  try {
    const { id } = await params;
    const { products, taxRate, notes } = await req.json();

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

    const beforeView = await auditView("Order", order);
    const beforeLines = order.products.map((p) => p.toObject());

    const effectiveTaxRate = taxRate !== undefined ? taxRate : order.taxRate;
    if (typeof notes === "string") order.notes = notes.trim().slice(0, 1000);

    // Needed to re-derive the correct price for a submitted line item
    // without override permission - see priceOrderItems.
    const user = await getUserFromCookie();
    const orderCustomer = order.customer ? await Customer.findById(order.customer) : null;
    const pricingContext = {
      canOverridePricing: hasPermission(user, "canOverrideOrderPricing"),
      priceTier: orderCustomer?.priceTier || 1,
    };

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

      const draftChanges = [
        ...diffOrderLines(beforeLines, order.products),
        ...diffViews("Order", beforeView, await auditView("Order", order)),
      ];
      await logActivity({
        admin: await getUserFromCookie(),
        action: "order.edit",
        entityType: "Order",
        entityId: order._id,
        entityLabel: orderLabel(order),
        summary: `Edited draft ${orderLabel(order)}: ${describeChanges(draftChanges) || "no changes"}`,
        changes: draftChanges,
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

    const orderChanges = [
      ...diffOrderLines(beforeLines, order.products),
      ...diffViews("Order", beforeView, await auditView("Order", order)),
      orderCustomer
        ? extraChange("customer.debt", "Customer debt", orderCustomer.debt, orderCustomer.debt + debtDelta, "money")
        : null,
    ];
    await logActivity({
      admin: await getUserFromCookie(),
      action: "order.edit",
      entityType: "Order",
      entityId: order._id,
      entityLabel: orderLabel(order),
      summary: `Edited ${orderLabel(order)}: ${describeChanges(orderChanges) || "no changes"}`,
      metadata: { before: previousTotal, after: priced.total },
      changes: orderChanges,
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
  const user = await getUserFromCookie();
  const forbiddenPermission = await requirePermission(user, "canCreateOrders");
  if (forbiddenPermission) return forbiddenPermission;

  try {
    const input = await req.json();
    const newOrder = await createCustomerOrder({ customerId: params.id, input, user });
    return NextResponse.json(
      { message: input.asDraft ? "Draft saved successfully" : "Order created successfully", order: newOrder },
      { status: 201 }
    );
  } catch (error) {
    return respondError(error, { message: "Error creating order" });
  }
}
