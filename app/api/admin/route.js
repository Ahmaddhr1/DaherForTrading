import { connectToDB } from "@/lib/connectDb";
import Admin from "@/models/Admin";
import { NextResponse } from "next/server";

// Owner-only (enforced in middleware.js). Lists every admin account.
export async function GET() {
  await connectToDB();

  try {
    const admins = await Admin.find({}, "adminname role active createdAt")
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({ admins });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching admins", error: error.message },
      { status: 500 }
    );
  }
}
