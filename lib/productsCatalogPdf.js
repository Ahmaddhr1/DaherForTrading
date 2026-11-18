import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Each entry is a selectable column for the catalog PDF - `key` matches the
// checkbox id in the "Generate PDF" dialog, `get` reads the display value
// off a populated product document.
export const CATALOG_FIELDS = [
  { key: "stock", label: "Stock", get: (p) => `${p.quantity ?? 0} ${p.unit || "pcs"}` },
  { key: "priceRetail", label: "Retail Price", get: (p) => `$${Number(p.price ?? 0).toFixed(2)}` },
  { key: "priceWholesale", label: "Wholesale Price", get: (p) => `$${Number(p.priceWholesale ?? p.price ?? 0).toFixed(2)}` },
  { key: "priceDistributor", label: "Distributor Price", get: (p) => `$${Number(p.priceDistributor ?? p.price ?? 0).toFixed(2)}` },
  { key: "priceVip", label: "VIP Price", get: (p) => `$${Number(p.priceVip ?? p.price ?? 0).toFixed(2)}` },
];

// Builds a full A4 product catalog PDF, grouped by category, showing only
// the columns the user chose (stock and/or each price tier) alongside the
// product name.
export function generateProductsCatalogPdf({ products, selectedFields }) {
  const columns = CATALOG_FIELDS.filter((f) => selectedFields[f.key]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Product Catalog", margin, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Daher For Trading", margin, 24);
  doc.text(new Date().toLocaleDateString(), pageWidth - margin, 24, { align: "right" });
  doc.setTextColor(0);

  const byCategory = new Map();
  for (const product of products) {
    const name = product.category?.name || "Uncategorized";
    if (!byCategory.has(name)) byCategory.set(name, []);
    byCategory.get(name).push(product);
  }
  const categoryNames = Array.from(byCategory.keys()).sort((a, b) => a.localeCompare(b));

  const stampPageNumber = () => {
    const page = doc.internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${page}`, pageWidth / 2, pageHeight - 8, { align: "center" });
    doc.setTextColor(0);
  };

  let y = 32;

  categoryNames.forEach((categoryName) => {
    const categoryProducts = byCategory.get(categoryName);

    // Keep a category's header from being stranded alone at the bottom of
    // a page with its table pushed onto the next one.
    if (y + 16 > pageHeight - margin) {
      doc.addPage();
      y = margin + 4;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(categoryName, margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin, bottom: margin },
      head: [["Product", ...columns.map((c) => c.label)]],
      body: categoryProducts.map((p) => [p.name, ...columns.map((c) => c.get(p))]),
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59] },
      didDrawPage: stampPageNumber,
    });

    y = doc.lastAutoTable.finalY + 10;
  });

  return doc.output("blob");
}
