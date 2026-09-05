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

// Parses a "YYYY-MM-DD" query param into the start/end instant of that
// calendar day, expressed in UTC.
//
// IMPORTANT: use setUTCHours here, not setHours. `new Date("YYYY-MM-DD")`
// parses the date-only string as UTC midnight per spec, but setHours()
// reads/writes the LOCAL calendar day. On any server running west of UTC,
// that UTC instant falls on the previous local calendar day, so
// setHours(0,0,0,0) would silently rewind the boundary a full day - which
// turns a single-day filter (startDate === endDate) into an empty window
// whenever that shifted day happens to have no data. Anchoring in UTC
// keeps the boundary on the exact calendar day the caller asked for,
// regardless of the server's timezone.
export function startOfDayUTC(dateStr) {
  const d = new Date(dateStr);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function endOfDayUTC(dateStr) {
  const d = new Date(dateStr);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}
