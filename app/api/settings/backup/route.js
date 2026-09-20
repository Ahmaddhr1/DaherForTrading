import { NextResponse } from "next/server";
import { generateBackupPayload } from "@/lib/backup";

// Protected by middleware (owner-only). Deliberately excludes the Admin
// collection - password hashes should never leave the server in a file a
// browser downloads to disk. Shares its data-gathering logic with the
// automated email backup at /api/cron/backup via lib/backup.js, so both
// always produce the exact same shape of file.
export async function GET() {
  try {
    const { filename, json } = await generateBackupPayload();

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Backup failed:", error);
    return NextResponse.json(
      { message: "Backup failed", error: error.message },
      { status: 500 }
    );
  }
}
