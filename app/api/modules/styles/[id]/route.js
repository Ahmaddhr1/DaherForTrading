import { NextResponse } from "next/server";
import { connectToDB } from "@/core/platform/connectDb";
import { getUserFromCookie } from "@/core/platform/auth";
import { requirePermission } from "@/core/platform/permissions";
import { respondError } from "@/core/shared/serviceError";
import { requireModule } from "@/modules/server";
import { getStyle, updateStyle, deleteStyle } from "@/modules/variants/service";

export async function GET(_req, { params }) {
  const off = requireModule("variants");
  if (off) return off;
  await connectToDB();
  try {
    const { id } = await params;
    return NextResponse.json(await getStyle(id));
  } catch (e) {
    return respondError(e, { error: "Couldn't load the style" });
  }
}

export async function PUT(req, { params }) {
  const off = requireModule("variants");
  if (off) return off;
  await connectToDB();
  const admin = await getUserFromCookie();
  const forbidden = await requirePermission(admin, "canEditProducts");
  if (forbidden) return forbidden;
  try {
    const { id } = await params;
    return NextResponse.json(await updateStyle(id, await req.json(), admin));
  } catch (e) {
    return respondError(e, { error: "Couldn't save the style" });
  }
}

export async function DELETE(_req, { params }) {
  const off = requireModule("variants");
  if (off) return off;
  await connectToDB();
  const admin = await getUserFromCookie();
  const forbidden = await requirePermission(admin, "canDelete");
  if (forbidden) return forbidden;
  try {
    const { id } = await params;
    await deleteStyle(id, admin);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respondError(e, { error: "Couldn't delete the style" });
  }
}
