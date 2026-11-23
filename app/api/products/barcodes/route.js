import { connectToDB } from "@/core/platform/connectDb";
import Product from "@/core/products/models/Products";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/core/platform/auth";
import { requirePermission } from "@/core/platform/permissions";
import { logActivity } from "@/core/audit/activityLog";
import { generateUniqueBarcodes } from "@/core/products/barcodeGen";

// GET  /api/products/barcodes            -> { barcode } one new unique code
//      (for the product form's "Generate" button; saved with the product).
// POST /api/products/barcodes { productIds } -> gives every listed product
//      that has no barcode yet its own unique code.
export async function GET() {
  await connectToDB();
  const forbidden = await requirePermission(await getUserFromCookie(), "canEditProducts");
  if (forbidden) return forbidden;
  try {
    const [barcode] = await generateUniqueBarcodes(1);
    return NextResponse.json({ barcode }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Error generating barcode", error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  await connectToDB();
  const admin = await getUserFromCookie();
  const forbidden = await requirePermission(admin, "canEditProducts");
  if (forbidden) return forbidden;
  try {
    const { productIds } = await req.json();
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ message: "No products selected" }, { status: 400 });
    }
    const products = await Product.find({
      _id: { $in: productIds.slice(0, 500) },
      $or: [{ barcode: { $exists: false } }, { barcode: null }, { barcode: "" }],
    }).select("name");
    if (products.length === 0) {
      return NextResponse.json({ assigned: 0, message: "All selected products already have barcodes" }, { status: 200 });
    }
    const codes = await generateUniqueBarcodes(products.length);
    let assigned = 0;
    for (let i = 0; i < products.length; i++) {
      try {
        // Only if still empty (another admin may have set one meanwhile).
        const r = await Product.updateOne(
          { _id: products[i]._id, $or: [{ barcode: { $exists: false } }, { barcode: null }, { barcode: "" }] },
          { $set: { barcode: codes[i] } }
        );
        assigned += r.modifiedCount || 0;
      } catch (err) {
        if (err?.code !== 11000) throw err; // duplicate (race) - skip this one
      }
    }
    await logActivity({
      admin,
      action: "product.bulkBarcodes",
      entityType: "Product",
      entityLabel: `${assigned} products`,
      summary: `Generated barcodes for ${assigned} product${assigned === 1 ? "" : "s"}`,
    });
    return NextResponse.json({ assigned }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Error generating barcodes", error: error.message }, { status: 500 });
  }
}
