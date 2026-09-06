import { jsPDF } from "jspdf";

const WIDTH_MM = 80;
const MARGIN_MM = 4;
const LINE_HEIGHT_MM = 5;
const DASH_LINE = "-".repeat(34);

// Builds a narrow 80mm-wide receipt-style PDF, matching the look of the
// existing thermal invoice printout (M.D.T header, dashed separators,
// monospace text) - but as an actual PDF file rather than something only
// printable on a thermal printer.
//
// rows: [{ label, amount, sub? }] - one line item per row, `sub` is an
// optional smaller line underneath (e.g. paid/remaining/status detail).
// totals: [{ label, value, bold? }] - summary lines at the end.
export function generateThermalStatementPdf({ title, subtitle, meta, rows, totals, footer }) {
  const lineCount =
    6 + // header block (business name, "Daher For Trading", dashed line, title, subtitle, meta)
    rows.reduce((sum, row) => sum + 1 + (row.sub ? 1 : 0), 0) +
    2 + // dashed line + spacing before totals
    totals.length +
    3; // spacing + footer

  const height = Math.max(60, lineCount * LINE_HEIGHT_MM + 16);
  const doc = new jsPDF({ unit: "mm", format: [WIDTH_MM, height] });

  let y = 8;
  const center = (text, size = 9, bold = false) => {
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(text, WIDTH_MM / 2, y, { align: "center" });
    y += LINE_HEIGHT_MM;
  };
  const dashedLine = () => {
    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    doc.text(DASH_LINE, MARGIN_MM, y);
    y += LINE_HEIGHT_MM;
  };
  const row = (left, right, size = 9, bold = false) => {
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(left, MARGIN_MM, y);
    doc.text(right, WIDTH_MM - MARGIN_MM, y, { align: "right" });
    y += LINE_HEIGHT_MM;
  };

  center("M.D.T", 13, true);
  center("Daher For Trading", 9);
  dashedLine();
  center(title, 10, true);
  if (subtitle) center(subtitle, 9);
  if (meta) center(meta, 8);
  dashedLine();

  rows.forEach((r) => {
    row(truncate(r.label, 22), r.amount);
    if (r.sub) {
      doc.setFont("courier", "normal");
      doc.setFontSize(7);
      doc.text(truncate(r.sub, 44), MARGIN_MM, y);
      y += 4;
    }
  });

  dashedLine();

  totals.forEach((t) => row(t.label, t.value, 9, !!t.bold));

  if (footer) {
    y += 2;
    center(footer, 7);
  }

  return doc.output("blob");
}

function truncate(str, max) {
  if (!str) return "";
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
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
