import { connectToDB } from "@/lib/connectDb";
import Purchase from "@/models/Purchase";
import { NextResponse } from "next/server";

// Public, unauthenticated, read-only view of a single purchase - meant for
// sharing with the supplier (e.g. via a WhatsApp link). Only the fields a
// supplier needs to see are returned - never the company's full debt figure
// with other suppliers, credentials, etc.
export async function GET(_, { params }) {
  await connectToDB();
  try {
    const { id } = await params;
    const purchase = await Purchase.findById(id).populate("company", "name");
    if (!purchase) {
      return NextResponse.json({ message: "Purchase not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        _id: purchase._id,
        companyName: purchase.company?.name || "Unknown Supplier",
        productName: purchase.productName,
        unitPrice: purchase.unitPrice,
        quantity: purchase.quantity,
        discount: purchase.discount,
        taxRate: purchase.taxRate,
        taxAmount: purchase.taxAmount,
        total: purchase.total,
        paid: purchase.paid,
        createdAt: purchase.createdAt,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching purchase", error: error.message },
      { status: 500 }
    );
  }
}
