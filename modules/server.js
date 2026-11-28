// Route helpers for modules: everything in config.js plus a 404 guard.
import { NextResponse } from "next/server";
import { isEnabled } from "./config";

export * from "./config";

// In a route: `const off = requireModule("serials"); if (off) return off;`
export function requireModule(id) {
  if (isEnabled(id)) return null;
  return NextResponse.json({ error: "This feature isn't part of this edition." }, { status: 404 });
}
