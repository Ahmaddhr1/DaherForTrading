import { NextResponse } from "next/server";
import { connectToDB } from "@/core/platform/connectDb";
import { getUserFromCookie } from "@/core/platform/auth";
import { requirePermission } from "@/core/platform/permissions";
import { respondError } from "@/core/shared/serviceError";
import { requireModule } from "@/modules/server";
import { listStyles, createStyle } from "@/modules/variants/service";

export async function GET(req) {
  const off = requireModule("variants");
  if (off) return off;
  await connectToDB();
  try {
    const sp = req.nextUrl?.searchParams;
    return NextResponse.json(await listStyles({ q: sp?.get("q") || "", page: Math.max(1, parseInt(sp?.get("page") || "1", 10) || 1) }));
  } catch (e) {
    return respondError(e, { error: "Couldn't load styles" });
  }
}

// POST: a style + every chosen combination as its own product.
export async function POST(req) {
  const off = requireModule("variants");
  if (off) return off;
  await connectToDB();
  const admin = await getUserFromCookie();
  const forbidden = await requirePermission(admin, "canCreateProducts");
  if (forbidden) return forbidden;
  try {
    const { group, variants } = await createStyle(await req.json(), admin);
    return NextResponse.json({ group, count: variants.length }, { status: 201 });
  } catch (e) {
    return respondError(e, { error: "Couldn't create the style" });
  }
}
