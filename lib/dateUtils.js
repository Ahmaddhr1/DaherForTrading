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
