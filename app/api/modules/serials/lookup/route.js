import { NextResponse } from "next/server";
import { connectToDB } from "@/core/platform/connectDb";
import { respondError } from "@/core/shared/serviceError";
import { requireModule } from "@/modules/server";
import { lookup } from "@/modules/serials/service";

// GET ?serial=...: which product, who bought it, when, and warranty left.
export async function GET(req) {
  const off = requireModule("serials");
  if (off) return off;
  await connectToDB();
  try {
    return NextResponse.json(await lookup(req.nextUrl?.searchParams.get("serial") || ""));
  } catch (e) {
    return respondError(e, { error: "Lookup failed" });
  }
}
