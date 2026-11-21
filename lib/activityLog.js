import ActivityLog from "@/models/ActivityLog";

// Best-effort activity logging: a failure here must never break the
// underlying business write (creating an order, recording a payment,
// etc.), so every error is swallowed after being logged to the server
// console. Callers don't need to (and shouldn't) wrap this in try/catch.
//
// admin: the value returned by lib/auth.js's getUserFromCookie() - i.e.
// the JWT payload, which has { id, adminname, role }.
// changes: the exact per-field differences from lib/audit.js (diffViews,
// snapshotChanges, diffOrderLines, extraChange) - falsy entries are dropped.
// entityLabel: readable name of the affected record (product name, etc.).
export async function logActivity({ admin, action, entityType, entityId, entityLabel, summary, metadata, changes }) {
  try {
    if (!admin?.id) {
      console.warn(`logActivity called without an admin for action "${action}" - skipping`);
      return;
    }

    await ActivityLog.create({
      admin: admin.id,
      adminName: admin.adminname || "unknown",
      action,
      entityType,
      entityId,
      entityLabel,
      summary,
      metadata,
      changes: (changes || []).filter(Boolean),
    });
  } catch (error) {
    console.error(`Failed to record activity log for action "${action}":`, error.message);
  }
}
