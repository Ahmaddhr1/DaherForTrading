"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/i18n/LangProvider";

// An account / company statement as an 80mm thermal receipt, from the same
// data as "Share as PDF" (see lib/statementReceiptData.js). Portalled into
// #thermal-receipt-root like the order receipt, so the same thermal print
// flow (desktop print dialog / phone print page) prints it.
export default function StatementThermalReceipt({ data }) {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !data) return null;

  const { title, subtitle, periodLabel, columns, rows, totals } = data;
  const align = (c) => (c.align === "right" ? "text-end" : c.align === "center" ? "text-center" : "text-start");
  const isSub = (row) => row[0] === "" && typeof row[1] === "string" && row[1].startsWith("  - ");

  return createPortal(
    <div id="thermal-receipt-root">
      <div className="thermal-receipt mx-auto w-[80mm] px-[3mm] py-2 font-mono text-[13px] font-normal leading-snug text-black bg-white">
        <div className="text-center mb-2">
          <p className="text-lg font-bold">{t("Invento")}</p>
          <p className="font-bold">{t(title)}</p>
          {subtitle && <p>{subtitle}</p>}
          <p className="text-[11px]">
            {t("Generated")} {new Date().toLocaleString()}
          </p>
          {periodLabel && (
            <p className="text-[11px]">
              {t("Period:")} {periodLabel}
            </p>
          )}
        </div>

        <div className="thermal-rule my-1" />

        <table className="w-full border-collapse text-[11px] leading-snug">
          <thead>
            <tr className="font-bold">
              {columns.map((c) => (
                <th key={c.header} className={`${align(c)} font-bold pb-0.5 px-0.5 align-bottom`}>
                  {t(c.header)}
                </th>
              ))}
            </tr>
            <tr>
              <td colSpan={columns.length} className="pb-0.5">
                <div className="thermal-rule" />
              </td>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const sub = isSub(row);
              return (
                <tr key={i} className={`align-top ${!sub && i > 0 && rows[i - 1] && isSub(rows[i - 1]) ? "border-t border-black/30" : ""}`}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`${align(columns[j] || {})} px-0.5 py-0.5 break-words ${!sub && columns.length === 4 && columns[1].header === "Order / Product" ? "font-bold" : ""}`}
                    >
                      {sub && j === 1 ? <span className="ps-2">{cell.replace(/^\s+-\s/, "• ")}</span> : t(cell)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="text-center py-2">{t("No records for this period.")}</p>}

        <div className="thermal-rule my-1" />

        {totals.map((row) => (
          <div key={row.label} className={`flex justify-between ${row.bold ? "font-bold" : ""}`}>
            <span>{t(row.label)}</span>
            <span>{row.value}</span>
          </div>
        ))}

        <div className="thermal-rule my-1" />
        <p className="text-center mt-2">{t("Thank you for your business!")}</p>
      </div>
    </div>,
    document.body
  );
}
