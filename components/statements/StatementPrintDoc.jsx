"use client";

import { useEffect } from "react";
import { useT } from "@/core/shared/i18n/LangProvider";
import { useBusiness } from "@/core/shared/business";

// The black-and-white statement as a printable A4 page - the same layout
// as the PDF from "PDF" (core/printing/thermalPdf.js generateStatementPdf): Courier,
// centred header, a grid table with alternate grey rows, dashed rules,
// totals and footer. Used by the statement print pages (/print/statement,
// /print/company-statement).
export default function StatementPrintDoc({ data }) {
  const t = useT();
  const business = useBusiness();

  // Always print on A4 (portrait), never the thermal roll size.
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "statement-a4-page";
    style.textContent = "@page { size: A4 portrait; margin: 16mm; }";
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  if (!data) return null;
  const { title, subtitle, meta, periodLabel, columns, rows, totals, footer } = data;
  const align = (c) => (c?.align === "right" ? "right" : c?.align === "center" ? "center" : "left");
  const rule = "-".repeat(70);

  return (
    <div
      className="statement-a4 mx-auto bg-white text-black"
      style={{ fontFamily: '"Courier New", Courier, monospace', width: "100%", maxWidth: "178mm" }}
    >
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 18, fontWeight: 700, margin: "0 0 2px" }}>{business.name}</p>
        {business.phone && <p style={{ fontSize: 10, margin: "0 0 6px" }} className="ltr-text">{business.phone}</p>}
        <p style={{ fontSize: 9, margin: "0 0 10px", overflow: "hidden", whiteSpace: "nowrap" }}>{rule}</p>
        <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>{t(title)}</p>
        {subtitle && <p style={{ fontSize: 11, margin: "0 0 4px" }}>{subtitle}</p>}
        {meta && <p style={{ fontSize: 9, margin: "0 0 3px" }}>{t("Generated")} {meta.replace(/^Generated\s*/, "")}</p>}
        {periodLabel && (
          <p style={{ fontSize: 9, margin: "0 0 10px" }}>
            {t("Period:")} {periodLabel}
          </p>
        )}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.header}
                style={{ border: "0.3mm solid #000", padding: "2.5mm", textAlign: align(c), fontWeight: 700, background: "#fff" }}
              >
                {t(c.header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#f5f5f5" : "#fff" }}>
              {row.map((cell, j) => (
                <td key={j} style={{ border: "0.3mm solid #000", padding: "2.5mm", textAlign: align(columns[j]), verticalAlign: "top", whiteSpace: j === 0 ? "nowrap" : "pre-wrap" }}>
                  {typeof cell === "string" && /^\s+-\s/.test(cell) ? cell : t(cell)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ border: "0.3mm solid #000", padding: "2.5mm", textAlign: "center" }}>
                {t("No records for this period.")}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <p style={{ fontSize: 9, textAlign: "center", margin: "10mm 0 4mm", overflow: "hidden", whiteSpace: "nowrap" }}>{rule}</p>
      {totals.map((row) => (
        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: row.bold ? 12 : 10, fontWeight: row.bold ? 700 : 400, margin: "0 0 3mm" }}>
          <span>{t(row.label)}</span>
          <span>{row.value}</span>
        </div>
      ))}
      {footer && <p style={{ fontSize: 8, textAlign: "center", marginTop: "5mm" }}>{footer}</p>}
    </div>
  );
}
