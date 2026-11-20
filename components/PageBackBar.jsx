"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

// Single global replacement for the "Back to X" button every dashboard
// page used to hand-roll inline. Mounted once in app/dashboard/layout.js
// so every page gets consistent back-navigation without repeating it.
export function PageBackBar() {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === "/dashboard") return null;

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  );
}
