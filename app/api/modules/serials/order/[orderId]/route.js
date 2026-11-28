import { NextResponse } from "next/server";
import { connectToDB } from "@/core/platform/connectDb";
import { getUserFromCookie } from "@/core/platform/auth";
import { requireAnyPermission } from "@/core/platform/permissions";
import { respondError } from "@/core/shared/serviceError";
import { requireModule } from "@/modules/server";
import { unitsForOrder, assignToOrder } from "@/modules/serials/service";

export async function GET(_req, { params }) {
  const off = requireModule("serials");
  if (off) return off;
  await connectToDB();
  const { orderId } = await params;
  return NextResponse.json({ units: await unitsForOrder(orderId) });
}

// POST { productId, unitIds }: the sold units for that order line.
export async function POST(req, { params }) {
  const off = requireModule("serials");
  if (off) return off;
  await connectToDB();
  const admin = await getUserFromCookie();
  const forbidden = await requireAnyPermission(admin, ["canCreateOrders", "canEditOrders"]);
  if (forbidden) return forbidden;
  try {
    const { orderId } = await params;
    const units = await assignToOrder({ orderId, ...(await req.json()) }, admin);
    return NextResponse.json({ count: units.length }, { status: 201 });
  } catch (e) {
    return respondError(e, { error: "Couldn't assign the serial numbers" });
  }
}
