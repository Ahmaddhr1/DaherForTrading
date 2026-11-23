import { connectToDB } from "@/core/platform/connectDb";
import Return from "@/core/orders/models/Return";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/core/platform/auth";
import { requirePermission } from "@/core/platform/permissions";
import { processReturn } from "@/core/orders/returnService";
import { respondError } from "@/core/shared/serviceError";

export async function GET(_, { params }) {
  await connectToDB();
  try {
    const { id } = await params;
    const returns = await Return.find({ order: id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ returns }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching returns", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req, { params }) {
  await connectToDB();
  const admin = await getUserFromCookie();
  const forbidden = await requirePermission(admin, "canProcessReturns");
  if (forbidden) return forbidden;

  try {
    const { id } = await params;
    const returnDoc = await processReturn({ orderId: id, input: await req.json(), admin });
    return NextResponse.json({ message: "Return processed", return: returnDoc }, { status: 201 });
  } catch (error) {
    return respondError(error, { message: "Error processing return" });
  }
}
