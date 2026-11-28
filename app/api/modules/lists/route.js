import { NextResponse } from "next/server";
import { connectToDB } from "@/core/platform/connectDb";
import { getUserFromCookie } from "@/core/platform/auth";
import { requirePermission } from "@/core/platform/permissions";
import { respondError } from "@/core/shared/serviceError";
import { logActivity } from "@/core/audit/activityLog";
import { requireLists } from "@/modules/lists/guard";
import { getLists, createList } from "@/modules/lists/service";

// GET: every option list this edition uses (sizes, colors, brands...).
export async function GET(req) {
  const off = requireLists();
  if (off) return off;
  await connectToDB();
  try {
    const kind = req.nextUrl?.searchParams.get("kind") || undefined;
    return NextResponse.json({ lists: await getLists({ kind }) });
  } catch (e) {
    return respondError(e, { error: "Couldn't load the lists" });
  }
}

// POST: a new list made by the owner, e.g. "Patterns".
export async function POST(req) {
  const off = requireLists();
  if (off) return off;
  await connectToDB();
  const admin = await getUserFromCookie();
  const forbidden = await requirePermission(admin, "canManageSettings");
  if (forbidden) return forbidden;
  try {
    const list = await createList(await req.json());
    await logActivity({ admin, action: "settings.listCreate", entityType: "Settings", entityLabel: list.name, summary: `Created the list "${list.name}"` });
    return NextResponse.json({ list }, { status: 201 });
  } catch (e) {
    return respondError(e, { error: "Couldn't create the list" });
  }
}
