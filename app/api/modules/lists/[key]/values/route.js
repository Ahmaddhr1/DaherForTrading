import { NextResponse } from "next/server";
import { connectToDB } from "@/core/platform/connectDb";
import { getUserFromCookie } from "@/core/platform/auth";
import { requireAnyPermission } from "@/core/platform/permissions";
import { respondError } from "@/core/shared/serviceError";
import { requireLists } from "@/modules/lists/guard";
import { addValue } from "@/modules/lists/service";

// POST { value, hex? }: "+ Add new size" right from the product form. Saved
// to the same list Settings manages, so it's offered next time too.
export async function POST(req, { params }) {
  const off = requireLists();
  if (off) return off;
  await connectToDB();
  const forbidden = await requireAnyPermission(await getUserFromCookie(), ["canManageSettings", "canCreateProducts", "canEditProducts"]);
  if (forbidden) return forbidden;
  try {
    const { key } = await params;
    return NextResponse.json({ list: await addValue(key, await req.json()) }, { status: 201 });
  } catch (e) {
    return respondError(e, { error: "Couldn't add the value" });
  }
}
