"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

// Readable labels for route segments that aren't already a nice word on
// their own (slugs, verbs, multi-word routes). Anything not listed here
// just gets title-cased from its own text (see humanize()).
const SEGMENT_LABELS = {
  add: "Add",
  create: "Create",
  edit: "Edit",
  addorder: "Add Order",
  addpurchase: "Add Purchase",
  "profit-margin": "Profit Margin",
  "supplier-price-trends": "Supplier Trends",
  "stock-history": "Stock History",
  overdue: "Overdue Debt",
};

// Mongo ObjectIds (and similar opaque ids) aren't a label anyone wants to
// read in a breadcrumb - every page's own heading already names the
// specific record, so the crumb just says what kind of page it is.
const ID_PATTERN = /^[0-9a-fA-F]{24}$/;

function humanize(segment) {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  if (ID_PATTERN.test(segment)) return "Details";
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Single global replacement for the "Back to X" button every dashboard
// page used to hand-roll inline. Mounted once in app/dashboard/layout.js
// so every page gets a consistent, clickable breadcrumb trail (e.g.
// "Customers / Edit Customer") back up to Dashboard, without repeating
// this per page.
export function PageBackBar() {
  const t = useT();
  const pathname = usePathname();

  if (pathname === "/dashboard") return null;

  const segments = pathname.split("/").filter(Boolean).filter((segment) => segment !== "dashboard");
  if (segments.length === 0) return null;

  let href = "/dashboard";
  const crumbs = [
    { label: "Dashboard", href: "/dashboard" },
    ...segments.map((segment) => {
      href += `/${segment}`;
      return { label: humanize(segment), href };
    }),
  ];

  return (
    <nav aria-label={t("Breadcrumb")} className="mb-4 flex flex-wrap items-center gap-1 text-sm font-medium">
      {crumbs.map((crumb, index) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="rtl-flip h-3.5 w-3.5 text-gray-400 dark:text-gray-600" />}
          <Link
            href={crumb.href}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:underline"
          >
            {t(crumb.label)}
          </Link>
        </span>
      ))}
    </nav>
  );
}
