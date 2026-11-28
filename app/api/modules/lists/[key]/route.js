import { NextResponse } from "next/server";
import { connectToDB } from "@/core/platform/connectDb";
import { getUserFromCookie } from "@/core/platform/auth";
import { requirePermission } from "@/core/platform/permissions";
import { respondError } from "@/core/shared/serviceError";
import { logActivity } from "@/core/audit/activityLog";
import { requireLists } from "@/modules/lists/guard";
import { updateList, deleteList } from "@/modules/lists/service";

// PUT { name?, values? }: rename, reorder, recolor, hide or remove values.
export async function PUT(req, { params }) {
  const off = requireLists();
  if (off) return off;
  await connectToDB();
  const admin = await getUserFromCookie();
  const forbidden = await requirePermission(admin, "canManageSettings");
  if (forbidden) return forbidden;
  try {
    const { key } = await params;
    const list = await updateList(key, await req.json());
    await logActivity({ admin, action: "settings.listEdit", entityType: "Settings", entityLabel: list.name, summary: `Edited the list "${list.name}"` });
    return NextResponse.json({ list });
  } catch (e) {
    return respondError(e, { error: "Couldn't save the list" });
  }
}

export async function DELETE(_req, { params }) {
  const off = requireLists();
  if (off) return off;
  await connectToDB();
  const admin = await getUserFromCookie();
  const forbidden = await requirePermission(admin, "canManageSettings");
  if (forbidden) return forbidden;
  try {
    const { key } = await params;
    await deleteList(key);
    await logActivity({ admin, action: "settings.listDelete", entityType: "Settings", entityLabel: key, summary: `Deleted the list "${key}"` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respondError(e, { error: "Couldn't delete the list" });
  }
}
