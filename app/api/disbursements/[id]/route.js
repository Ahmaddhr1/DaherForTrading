import { connectToDB } from "@/lib/connectDb";
import Disbursement from "@/models/Disbursement";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";

// GET one disbursement - used by the disbursement receipt page.
export async function GET(_, { params }) {
  await connectToDB();
  try {
    const { id } = await params;
    const disbursement = await Disbursement.findById(id);
    if (!disbursement) {
      return NextResponse.json({ message: "Disbursement not found" }, { status: 404 });
    }
    return NextResponse.json(disbursement, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching disbursement", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  await connectToDB();
  try {
    const { id } = params;
    const deleted = await Disbursement.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: "Disbursement not found" }, { status: 404 });
    }

    await logActivity({
      admin: await getUserFromCookie(),
      action: "disbursement.delete",
      entityType: "Disbursement",
      entityId: id,
      summary: `Deleted a $${deleted.amount} disbursement (${deleted.category}): ${deleted.description}`,
    });

    return NextResponse.json({ message: "Disbursement deleted successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting disbursement", error: error.message },
      { status: 500 }
    );
  }
}
