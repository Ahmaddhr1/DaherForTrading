import { connectToDB } from "@/lib/connectDb";
import Product from "@/models/Products";
import StockAdjustment from "@/models/StockAdjustment";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";

const VALID_TYPES = ["damaged", "lost", "expired", "correction", "other"];

// Record a stock adjustment (damaged/lost/expired/corrected goods) and
// apply it to the product's quantity in one place, so the quantity and
// the audit trail can never drift apart.
export async function POST(req, { params }) {
  await connectToDB();
  try {
    const { id } = params;
    const { type, quantityChange, reason } = await req.json();

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Type must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const parsedChange = parseInt(quantityChange, 10);
    if (isNaN(parsedChange) || parsedChange === 0) {
      return NextResponse.json(
        { error: "Quantity change must be a non-zero whole number." },
        { status: 400 }
      );
    }

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const quantityBefore = product.quantity;
    const quantityAfter = quantityBefore + parsedChange;

    if (quantityAfter < 0) {
      return NextResponse.json(
        {
          error: `That would bring stock below zero (currently ${quantityBefore}).`,
        },
        { status: 400 }
      );
    }

    product.quantity = quantityAfter;
    await product.save();

    const admin = await getUserFromCookie();

    const adjustment = await StockAdjustment.create({
      product: id,
      type,
      quantityChange: parsedChange,
      quantityBefore,
      quantityAfter,
      reason: reason?.trim() || undefined,
      admin: admin?.id,
      adminName: admin?.adminname || "unknown",
    });

    await logActivity({
      admin,
      action: "product.stockAdjustment",
      entityType: "Product",
      entityId: product._id,
      summary: `Adjusted stock of "${product.name}" by ${parsedChange > 0 ? "+" : ""}${parsedChange} (${type}): ${quantityBefore} → ${quantityAfter}`,
      metadata: { type, quantityChange: parsedChange, quantityBefore, quantityAfter, reason },
    });

    return NextResponse.json({ adjustment, product }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error recording stock adjustment", error: error.message },
      { status: 500 }
    );
  }
}

// List adjustment history for a product, newest first.
export async function GET(req, { params }) {
  await connectToDB();
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;

    const query = { product: id };
    const total = await StockAdjustment.countDocuments(query);
    const adjustments = await StockAdjustment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json(
      { adjustments, total, page, totalPages: Math.ceil(total / limit) },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching stock adjustments", error: error.message },
      { status: 500 }
    );
  }
}
