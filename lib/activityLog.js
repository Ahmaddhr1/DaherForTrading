import ActivityLog from "@/models/ActivityLog";

// Best-effort activity logging: a failure here must never break the
// underlying business write (creating an order, recording a payment,
// etc.), so every error is swallowed after being logged to the server
// console. Callers don't need to (and shouldn't) wrap this in try/catch.
//
// admin: the value returned by lib/auth.js's getUserFromCookie() - i.e.
// the JWT payload, which has { id, adminname, role }.
export async function logActivity({ admin, action, entityType, entityId, summary, metadata }) {
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
      summary,
      metadata,
    });
  } catch (error) {
    console.error(`Failed to record activity log for action "${action}":`, error.message);
  }
}
