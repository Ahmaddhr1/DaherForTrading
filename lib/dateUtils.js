// Returns the LOCAL calendar date as "YYYY-MM-DD", suitable as the default
// value for an <input type="date">.
//
// IMPORTANT: don't use `new Date().toISOString().split("T")[0]` for this -
// toISOString() always reports the UTC date, which is the wrong calendar
// day for part of every 24h cycle in any timezone that isn't UTC itself
// (e.g. at 2am in a UTC+3 timezone, it's already "tomorrow" locally but
// toISOString() still reports "today" in UTC terms, one day behind).
export function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Converts a "YYYY-MM-DD" <input type="date"> value into the precise UTC
// instant for the start/end of that calendar day, AS SEEN BY WHOEVER IS
// CALLING THIS - i.e. it must be called from the browser, not the server.
//
// Query params like startDate/endDate need to mean "midnight to midnight
// in the business's own local time", but a server has no reliable way to
// know that timezone (self-hosted MongoDB/Node deployments run in all
// sorts of timezones, and even a UTC server isn't the same as the admin's
// actual local day - Beirut is UTC+2/+3, so the first few hours of every
// local day are still "yesterday" in UTC). The browser, on the other
// hand, always knows its own local timezone exactly. So instead of
// sending a bare date and making the server guess, the date is resolved
// to a precise instant here and sent as a full ISO string - the server
// then just uses that instant directly, with no ambiguity left.
//
// This relies on a real parsing-spec quirk: `new Date("YYYY-MM-DD")` is
// parsed as UTC midnight, but `new Date("YYYY-MM-DDTHH:mm:ss")` (a
// date-TIME string with no timezone offset) is parsed as LOCAL time. That
// difference is exactly what's needed here.
export function localDayStartISO(dateStr) {
  if (!dateStr) return undefined;
  return new Date(`${dateStr}T00:00:00`).toISOString();
}

export function localDayEndISO(dateStr) {
  if (!dateStr) return undefined;
  return new Date(`${dateStr}T23:59:59.999`).toISOString();
}
