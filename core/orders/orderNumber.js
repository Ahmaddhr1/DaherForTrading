// Human-facing order number: the last 6 characters of the order's id,
// upper-cased (e.g. "4F2A91") - the same number shown on invoices, receipts
// and payment rows. Plain module so both client and server can use it.
export function orderNumber(id) {
  return String(id?._id || id || "").slice(-6).toUpperCase();
}

// If a search term could be (part of) an order number - hex characters,
// optionally typed with a leading "#" - returns it lower-cased for matching
// against the id; otherwise null.
export function orderNumberSearchTerm(search) {
  const term = String(search || "").trim().replace(/^#/, "").toLowerCase();
  return /^[0-9a-f]{3,24}$/.test(term) ? term : null;
}
