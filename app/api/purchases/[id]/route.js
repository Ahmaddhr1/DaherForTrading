import { connectToDB } from "@/lib/connectDb";
import Purchase from "@/models/Purchase";
import { NextResponse } from "next/server";

// GET one purchase, with its company populated - used by the purchase
// receipt page (Print / Thermal Receipt / WhatsApp Share), which needs the
// company's name, phone number, and current total debt.
export async function GET(_, { params }) {
  await connectToDB();
  try {
    const { id } = await params;
    const purchase = await Purchase.findById(id).populate("company");
    if (!purchase) {
      return NextResponse.json({ message: "Purchase not found" }, { status: 404 });
    }
    return NextResponse.json(purchase, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching purchase", error: error.message },
      { status: 500 }
    );
  }
}
