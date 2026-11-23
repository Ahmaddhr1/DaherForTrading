import { connectToDB } from "@/core/platform/connectDb";
import Order from "@/core/orders/models/Orders";
import Purchase from "@/core/suppliers/models/Purchase";
import Product from "@/core/products/models/Products";
import StockAdjustment from "@/core/products/models/StockAdjustment";
import { NextResponse } from "next/server";

// Full chronological stock ledger for one product: every purchase, sale,
// and manual stock adjustment that has ever touched its quantity, each
// annotated with the stock level immediately before and after it (e.g.
// "on 9/9 you purchased 20, stock went from 5 to 25").
//
// There's no dedicated stock-movement log in this app - quantity is
// mutated directly by three different flows (purchases, order
// create/edit/delete/finalize, and stock adjustments). So this
// reconstructs the ledger after the fact: it starts from the product's
// CURRENT quantity, subtracts every known delta to find the stock level
// before the earliest tracked event ("Starting stock" below - typically 0
// for a product first stocked through a purchase, or whatever was typed
// in in the product form if it started with existing stock), then replays
// every event in chronological order to compute a running before/after
// balance for each one.
//
// Known approximation: if a pending order was later EDITED (its quantity
// or product changed after the order was first created), this ledger
// shows the order's CURRENT line items dated to the order's original
// creation date - the order document doesn't keep a history of its own
// edits, so an edited order's true original quantity on that date isn't
// recoverable. Purchases and stock adjustments are exact - neither is
// ever edited in place in this app.
export async function GET(req, { params }) {
  await connectToDB();
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;

    const product = await Product.findById(id).select("name unit quantity");
    if (!product) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    const [purchases, orders, adjustments] = await Promise.all([
      Purchase.find({ product: id })
        .populate({ path: "company", select: "name" })
        .select("quantity unitPrice total company createdAt")
        .lean(),
      // Drafts never touched stock, so they're excluded - same rule every
      // other stock-affecting query in this app already follows.
      Order.find({ "products.productId": product._id, status: { $ne: "draft" } })
        .populate({ path: "customer", select: "fullName" })
        .select("products customer createdAt")
        .lean(),
      StockAdjustment.find({ product: id })
        .select("type quantityChange reason adminName createdAt")
        .lean(),
    ]);

    const events = [];

    for (const p of purchases) {
      events.push({
        type: "purchase",
        date: p.createdAt,
        delta: p.quantity,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        total: p.total,
        company: p.company?.name || null,
        sourceId: p._id,
      });
    }

    for (const o of orders) {
      for (const line of o.products || []) {
        if (line.isCustom) continue;
        if (!line.productId || String(line.productId) !== String(product._id)) continue;
        events.push({
          type: "sale",
          date: o.createdAt,
          delta: -line.quantity,
          quantity: line.quantity,
          price: line.price,
          free: !!line.free,
          customer: o.customer?.fullName || "Deleted Customer",
          sourceId: o._id,
        });
      }
    }

    for (const a of adjustments) {
      events.push({
        type: "adjustment",
        date: a.createdAt,
        delta: a.quantityChange,
        adjustmentType: a.type,
        reason: a.reason || null,
        adminName: a.adminName || null,
        sourceId: a._id,
      });
    }

    // Oldest first, so a running balance can be computed in order.
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    const totalDelta = events.reduce((sum, e) => sum + e.delta, 0);
    let running = product.quantity - totalDelta; // stock level before the earliest tracked event
    const startingStock = running;

    for (const e of events) {
      e.stockBefore = running;
      running += e.delta;
      e.stockAfter = running;
    }

    // Newest first for display.
    events.reverse();

    const gte = startDateParam ? new Date(startDateParam) : null;
    const lte = endDateParam ? new Date(endDateParam) : null;
    const filtered = events.filter((e) => {
      const d = new Date(e.date);
      if (gte && d < gte) return false;
      if (lte && d > lte) return false;
      return true;
    });

    const total = filtered.length;
    const start = (page - 1) * limit;
    const pageItems = filtered.slice(start, start + limit);

    return NextResponse.json({
      product: {
        _id: product._id,
        name: product.name,
        unit: product.unit,
        quantity: product.quantity,
      },
      startingStock,
      events: pageItems,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching product ledger", error: error.message },
      { status: 500 }
    );
  }
}
