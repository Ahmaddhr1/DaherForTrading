import { connectToDB } from "@/lib/connectDb";
import AppSettings from "@/models/AppSettings";
import { NextResponse } from "next/server";

// Public, read-only: the business name and phone printed on receipts,
// statements and shared document links (which are viewed without a login).
export async function GET() {
  await connectToDB();
  try {
    const s = await AppSettings.findOne({ key: "app" }).select("businessName businessPhone").lean();
    return NextResponse.json({ name: s?.businessName || "", phone: s?.businessPhone || "" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ name: "", phone: "" }, { status: 200 });
  }
}
