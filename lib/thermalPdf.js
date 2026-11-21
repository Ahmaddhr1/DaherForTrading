import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Builds a full-size (A4) black-and-white statement PDF - a plain monospace
// receipt look (Courier font, no color, dashed/ruled separators) sized for
// a normal printer, with a real multi-column table for the line items.
//
// columns: [{ header, align? }] - align defaults to "left"
// rows: array of arrays of cell strings, one per column
// totals: [{ label, value, bold? }]
// periodLabel: e.g. "Jan 1, 2026 - Nov 20, 2026" or "All Time"
export function generateStatementPdf({ title, subtitle, meta, periodLabel, columns, rows, totals, footer }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;

  let y = 20;
  doc.setFont("courier", "bold");
  doc.setFontSize(18);
  doc.text("Invento", pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.text("-".repeat(70), pageWidth / 2, y, { align: "center" });
  y += 7;

  doc.setFont("courier", "bold");
  doc.setFontSize(13);
  doc.text(title, pageWidth / 2, y, { align: "center" });
  y += 6;

  if (subtitle) {
    doc.setFont("courier", "normal");
    doc.setFontSize(11);
    doc.text(subtitle, pageWidth / 2, y, { align: "center" });
    y += 6;
  }
  if (meta) {
    doc.setFontSize(9);
    doc.text(meta, pageWidth / 2, y, { align: "center" });
    y += 5;
  }
  if (periodLabel) {
    doc.setFontSize(9);
    doc.text(`Period: ${periodLabel}`, pageWidth / 2, y, { align: "center" });
    y += 5;
  }
  y += 2;

  const stampPageNumber = () => {
    const page = doc.internal.getNumberOfPages();
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.text(`Page ${page}`, pageWidth / 2, pageHeight - 10, { align: "center" });
  };

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, bottom: margin },
    head: [columns.map((c) => c.header)],
    body: rows,
    theme: "grid",
    styles: { font: "courier", fontSize: 10, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1, cellPadding: 2.5 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold", lineWidth: 0.1 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: Object.fromEntries(
      columns.map((c, i) => [i, { halign: c.align || "left" }])
    ),
    didDrawPage: stampPageNumber,
  });

  let finalY = doc.lastAutoTable.finalY + 10;
  if (finalY > pageHeight - margin - totals.length * 7 - 12) {
    doc.addPage();
    finalY = margin + 6;
  }

  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.text("-".repeat(70), pageWidth / 2, finalY, { align: "center" });
  finalY += 7;

  totals.forEach((t) => {
    doc.setFont("courier", t.bold ? "bold" : "normal");
    doc.setFontSize(t.bold ? 12 : 10);
    doc.text(t.label, margin, finalY);
    doc.text(t.value, pageWidth - margin, finalY, { align: "right" });
    finalY += 7;
  });

  if (footer) {
    finalY += 4;
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.text(footer, pageWidth / 2, finalY, { align: "center" });
  }

  return doc.output("blob");
}

// Shares a PDF blob as an actual file via the Web Share API (so apps like
// WhatsApp receive the real file, not a link) when the browser/device
// supports sharing files; otherwise falls back to downloading it.
export async function sharePdfOrDownload(blob, filename) {
  const file = new File([blob], filename, { type: "application/pdf" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
      // Fall through to download if sharing fails for any other reason.
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return "downloaded";
}
