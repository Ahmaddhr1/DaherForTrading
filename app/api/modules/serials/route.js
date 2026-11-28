import { NextResponse } from "next/server";
import { connectToDB } from "@/core/platform/connectDb";
import { getUserFromCookie } from "@/core/platform/auth";
import { requireAnyPermission } from "@/core/platform/permissions";
import { respondError } from "@/core/shared/serviceError";
import { requireModule } from "@/modules/server";
import { listUnits, addUnits } from "@/modules/serials/service";

export async function GET(req) {
  const off = requireModule("serials");
  if (off) return off;
  await connectToDB();
  try {
    const sp = req.nextUrl?.searchParams;
    return NextResponse.json(
      await listUnits({
        productId: sp?.get("productId") || undefined,
        status: sp?.get("status") || undefined,
        q: sp?.get("q") || undefined,
        page: Math.max(1, parseInt(sp?.get("page") || "1", 10) || 1),
      })
    );
  } catch (e) {
    return respondError(e, { error: "Couldn't load serial numbers" });
  }
}

// POST { productId, serials: "one per line" | [..], supplier?, note? }
export async function POST(req) {
  const off = requireModule("serials");
  if (off) return off;
  await connectToDB();
  const admin = await getUserFromCookie();
  const forbidden = await requireAnyPermission(admin, ["canEditProducts", "canRecordPurchases"]);
  if (forbidden) return forbidden;
  try {
    const units = await addUnits(await req.json(), admin);
    return NextResponse.json({ count: units.length }, { status: 201 });
  } catch (e) {
    return respondError(e, { error: "Couldn't record the serial numbers" });
  }
}
