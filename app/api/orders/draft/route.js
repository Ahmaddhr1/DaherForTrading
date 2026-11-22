import { connectToDB } from "@/lib/connectDb";
import Order from "@/models/Orders";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { auditView, diffViews, snapshotChanges, diffOrderLines, extraChange, describeChanges, orderLabel } from "@/lib/audit";
import { priceOrderItems, PricingError } from "@/lib/orderPricing";
import { requirePermission, hasPermission } from "@/lib/permissions";

// Creates a draft order with no real customer yet - just a hand-typed name,
// for the product-grid cart's "type a name" checkout path. The customer
// picked from the existing list takes the normal
// POST /api/orders/[customerId] path instead (unchanged).
export async function POST(req) {
  await connectToDB();
  const forbidden = await requirePermission(await getUserFromCookie(), "canCreateOrders");
  if (forbidden) return forbidden;

  try {
    const { products, taxRate, customerNameText, notes } = await req.json();

    if (!products?.length) {
      return NextResponse.json({ message: "No products provided" }, { status: 400 });
    }
    if (!customerNameText?.trim()) {
      return NextResponse.json({ message: "A customer name is required" }, { status: 400 });
    }

    const user = await getUserFromCookie();

    let priced;
    try {
      // No linked customer yet, so there's no price tier to apply - prices
      // out at tier 1 (Retail) for anyone without canOverrideOrderPricing,
      // same default as a brand-new customer.
      priced = await priceOrderItems(products, taxRate, {
        canOverridePricing: hasPermission(user, "canOverrideOrderPricing"),
        priceTier: 1,
      });
    } catch (err) {
      if (err instanceof PricingError) {
        return NextResponse.json({ message: err.message }, { status: err.status });
      }
      throw err;
    }

    const newOrder = await Order.create({
      customerNameText: customerNameText.trim(),
      products: priced.enrichedProducts,
      total: priced.total,
      discountTotal: priced.discountTotal,
      taxRate: priced.taxRate,
      taxAmount: priced.taxAmount,
      notes: typeof notes === "string" ? notes.trim().slice(0, 1000) : "",
      status: "draft",
      profit: priced.profit,
    });

    await logActivity({
      admin: user,
      action: "order.create",
      entityType: "Order",
      entityId: newOrder._id,
      entityLabel: orderLabel(newOrder),
      changes: [
        ...snapshotChanges("Order", await auditView("Order", newOrder), "create"),
        ...diffOrderLines([], newOrder.products),
      ],
      summary: `Saved a draft order worth $${priced.total.toFixed(2)} for "${newOrder.customerNameText}" (no customer linked yet)`,
    });

    return NextResponse.json(
      { message: "Draft saved successfully", order: newOrder },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error creating draft order", error: error.message },
      { status: 500 }
    );
  }
}
