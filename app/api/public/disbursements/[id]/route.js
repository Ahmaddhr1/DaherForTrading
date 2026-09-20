import { connectToDB } from "@/lib/connectDb";
import Disbursement from "@/models/Disbursement";
import AppSettings from "@/models/AppSettings";
import { NextResponse } from "next/server";

// Public, unauthenticated, read-only view of a single disbursement (an
// internal expense record) - included for parity with orders/purchases,
// though sharing one outside the business is a rare case.
export async function GET(_, { params }) {
  await connectToDB();
  try {
    const { id } = await params;
    const disbursement = await Disbursement.findById(id);
    if (!disbursement) {
      return NextResponse.json({ message: "Disbursement not found" }, { status: 404 });
    }

    const settings = await AppSettings.findOne({ key: "app" }).select("dollarRate");

    return NextResponse.json(
      {
        _id: disbursement._id,
        description: disbursement.description,
        amount: disbursement.amount,
        category: disbursement.category,
        createdAt: disbursement.createdAt,
        dollarRate: settings?.dollarRate || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching disbursement", error: error.message },
      { status: 500 }
    );
  }
}
