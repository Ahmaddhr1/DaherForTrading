import { NextResponse } from "next/server";
import { listsFor } from "../registry";
import { enabledModules } from "../server";

// Option lists exist only in editions whose modules use them.
export function requireLists() {
  if (listsFor(enabledModules()).length) return null;
  return NextResponse.json({ error: "This feature isn't part of this edition." }, { status: 404 });
}
