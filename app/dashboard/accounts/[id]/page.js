import { notFound } from "next/navigation";

// See app/dashboard/accounts/page.js - the accounts feature was removed.
export default function AccountDetailPage() {
  notFound();
}
