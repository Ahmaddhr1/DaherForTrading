import { NextResponse } from "next/server";
import { connectToDB } from "@/core/platform/connectDb";
import { getUserFromCookie } from "@/core/platform/auth";
import { requireAnyPermission } from "@/core/platform/permissions";
import { respondError } from "@/core/shared/serviceError";
import { requireModule } from "@/modules/server";
import { setStatus } from "@/modules/serials/service";

// PUT { status: returned | in_stock | defective, note? }
export async function PUT(req, { params }) {
  const off = requireModule("serials");
  if (off) return off;
  await connectToDB();
  const admin = await getUserFromCookie();
  const forbidden = await requireAnyPermission(admin, ["canEditProducts", "canProcessReturns"]);
  if (forbidden) return forbidden;
  try {
    const { id } = await params;
    return NextResponse.json({ unit: await setStatus(id, await req.json(), admin) });
  } catch (e) {
    return respondError(e, { error: "Couldn't update the unit" });
  }
}
