import { notFound } from "next/navigation";

// The cash/bank accounts feature was removed at Ahmad's request. This route
// is kept only so the URL 404s cleanly instead of serving stale UI - the
// underlying files (models/Account.js, lib/accountBalances.js, etc.) are
// safe to delete from disk whenever convenient; nothing references them.
export default function AccountsPage() {
  notFound();
}
