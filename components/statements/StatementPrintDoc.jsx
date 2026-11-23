"use client";

import { useT } from "@/lib/i18n/LangProvider";

// The black-and-white statement (same content as the PDF - see
// lib/statementReceiptData.js) as a printable page: plain black text on
// white, monospace, full page width. Used by the statement print pages.
export default function StatementPrintDoc({ data }) {
  const t = useT();
  if (!data) return null;
  const { title, subtitle, meta, periodLabel, columns, rows, totals, footer } = data;
  const align = (c) => (c?.align === "right" ? "text-end" : c?.align === "center" ? "text-center" : "text-start");
  const isSub = (row) => row[0] === "" && typeof row[1] === "string" && row[1].startsWith("  - ");
  const isOrderRow = (row) => columns[1]?.header === "Order / Product" && !isSub(row);

  return (
    <div className="statement-print mx-auto max-w-3xl bg-white font-mono text-[13px] leading-relaxed text-black">
      <div className="text-center">
        <p className="text-2xl font-bold">Invento</p>
        <div className="my-2 border-t border-dashed border-black" />
        <p className="text-lg font-bold">{t(title)}</p>
        {subtitle && <p className="text-base">{subtitle}</p>}
        {meta && <p className="text-xs">{t("Generated")} {meta.replace(/^Generated\s*/, "")}</p>}
        {periodLabel && (
          <p className="text-xs">
            {t("Period:")} {periodLabel}
          </p>
        )}
      </div>

      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr className="border-y border-black">
            {columns.map((c) => (
              <th key={c.header} className={`${align(c)} px-1.5 py-1.5 font-bold`}>
                {t(c.header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`align-top ${isOrderRow(row) && i > 0 ? "border-t border-dashed border-black" : ""}`}>
              {row.map((cell, j) => (
                <td key={j} className={`${align(columns[j])} px-1.5 py-1 ${j === 0 || columns[j]?.align === "right" ? "whitespace-nowrap" : ""} ${isOrderRow(row) ? "font-bold" : ""}`}>
                  {isSub(row) && j === 1 ? <span className="ps-4">{cell.replace(/^\s+-\s/, "• ")}</span> : t(cell)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="py-3 text-center">
                {t("No records for this period.")}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-2 border-t border-black pt-2">
        {totals.map((row) => (
          <div key={row.label} className={`flex justify-between py-0.5 ${row.bold ? "font-bold" : ""}`}>
            <span>{t(row.label)}</span>
            <span>{row.value}</span>
          </div>
        ))}
      </div>

      {footer && <p className="mt-6 border-t border-dashed border-black pt-2 text-center text-xs">{footer}</p>}
    </div>
  );
}
