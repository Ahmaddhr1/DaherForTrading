import { connectToDB } from "@/lib/connectDb";
import Disbursement from "@/models/Disbursement";
import { NextResponse } from "next/server";

export async function DELETE(req, { params }) {
  await connectToDB();
  try {
    const { id } = params;
    const deleted = await Disbursement.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: "Disbursement not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Disbursement deleted successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting disbursement", error: error.message },
      { status: 500 }
    );
  }
}
