"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import { ArrowRight } from "lucide-react";
import { formatAuditValue } from "@/lib/auditFields";

// Field-by-field "previous vs current" view of an audit entry's changes.
// `kind` ("create" | "delete" | "change") only adjusts the column headings
// so a creation reads as "— → value" and a deletion as "value → —".
export function ChangesTable({ changes, kind = "change" }) {
  const t = useT();
  if (!changes?.length) return null;

  const beforeHeading = kind === "create" ? "Before (new record)" : "Previous";
  const afterHeading = kind === "delete" ? "After (deleted)" : "Current";

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
      {/* Desktop / tablet: three-column table */}
      <table className="hidden md:table w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900/60 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-4 py-3 font-semibold w-1/4">{t("Field")}</th>
            <th className="px-4 py-3 font-semibold">{beforeHeading}</th>
            <th className="px-2 py-3 w-6" aria-hidden="true" />
            <th className="px-4 py-3 font-semibold">{afterHeading}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {changes.map((change) => (
            <tr key={change.field} className="align-top">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{t(change.label)}</td>
              <td className="px-4 py-3">
                <ValuePill value={change.before} format={change.format} tone="before" />
              </td>
              <td className="px-2 py-3 text-gray-400">
                <ArrowRight className="h-4 w-4 mt-1" />
              </td>
              <td className="px-4 py-3">
                <ValuePill value={change.after} format={change.format} tone="after" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile: one card per field */}
      <ul className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
        {changes.map((change) => (
          <li key={change.field} className="p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t(change.label)}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">{beforeHeading}</p>
                <ValuePill value={change.before} format={change.format} tone="before" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">{afterHeading}</p>
                <ValuePill value={change.after} format={change.format} tone="after" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ValuePill({ value, format, tone }) {
  const empty = value === null || value === undefined || value === "";
  const text = formatAuditValue(value, format);
  if (empty) {
    return <span className="text-gray-400 dark:text-gray-500">—</span>;
  }
  const toneClass =
    tone === "before"
      ? "bg-red-50 text-red-800 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900"
      : "bg-green-50 text-green-800 ring-green-200 dark:bg-green-950/40 dark:text-green-300 dark:ring-green-900";
  return (
    <span className={`inline-block max-w-full break-words rounded-md px-2 py-1 ring-1 ring-inset ${toneClass}`}>
      {text}
    </span>
  );
}

// Compact inline preview for list rows: "Retail price: $1.50 → $1.75".
export function ChangePreview({ changes, total }) {
  const t = useT();
  if (!changes?.length) return null;
  return (
    <ul className="mt-1.5 space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
      {changes.map((c) => (
        <li key={c.field} className="truncate">
          <span className="font-medium text-gray-700 dark:text-gray-300">{c.label.replace(/^Permission: /, "")}:</span>{" "}
          <span className="line-through decoration-red-400/70">{formatAuditValue(c.before, c.format)}</span>
          {" → "}
          <span className="text-green-700 dark:text-green-400">{formatAuditValue(c.after, c.format)}</span>
        </li>
      ))}
      {total > changes.length && (
        <li className="text-gray-500">+{total - changes.length} {t("more…")}</li>
      )}
    </ul>
  );
}
