import { NextResponse } from "next/server";
import { connectToDB } from "@/core/platform/connectDb";
import { getUserFromCookie } from "@/core/platform/auth";
import { requirePermission } from "@/core/platform/permissions";
import { respondError } from "@/core/shared/serviceError";
import { requireModule } from "@/modules/server";
import { addOptionValues } from "@/modules/variants/service";

// POST { list, values, variants? }: e.g. add size XXL to a style.
export async function POST(req, { params }) {
  const off = requireModule("variants");
  if (off) return off;
  await connectToDB();
  const admin = await getUserFromCookie();
  const forbidden = await requirePermission(admin, "canCreateProducts");
  if (forbidden) return forbidden;
  try {
    const { id } = await params;
    const { variants } = await addOptionValues(id, await req.json(), admin);
    return NextResponse.json({ count: variants.length }, { status: 201 });
  } catch (e) {
    return respondError(e, { error: "Couldn't add the values" });
  }
}
