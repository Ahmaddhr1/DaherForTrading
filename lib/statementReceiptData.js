import { format } from "@/lib/i18n/date";
import { customerStatusConfig } from "@/components/statements/CustomerStatementDoc";
import { groupPurchasesByOrder, groupPurchasesByProduct } from "@/components/statements/CompanyStatementDoc";

// The content of a statement for "Share as PDF" (lib/thermalPdf): title, a
// table and totals. Strings are English - the PDF can't render Arabic.

export function buildCustomerStatementReceipt(statement, periodLabel) {
  return {
    title: "ACCOUNT STATEMENT",
    subtitle: statement.fullName,
    meta: `Generated ${format(new Date(), "MMM d, yyyy h:mm a")}`,
    periodLabel,
    columns: [
      { header: "Date" },
      { header: "Total", align: "right" },
      { header: "Paid", align: "right" },
      { header: "Remaining", align: "right" },
      { header: "Status", align: "center" },
    ],
    rows: statement.orders.map((order) => [
      format(new Date(order.createdAt), "MMM d, yyyy"),
      `$${order.total.toFixed(2)}`,
      `$${order.amountpaid.toFixed(2)}`,
      `$${order.remainingBalance.toFixed(2)}`,
      (customerStatusConfig[order.status] || customerStatusConfig.pending).label,
    ]),
    totals: [
      { label: "Total Billed", value: `$${statement.totals.totalAmount.toFixed(2)}` },
      { label: "Total Paid", value: `$${statement.totals.totalPaid.toFixed(2)}` },
      { label: "Total Owed", value: `$${statement.totals.totalRemaining.toFixed(2)}`, bold: true },
    ],
    footer: "Powered by Invento",
  };
}

export function buildCompanyStatementReceipt(statement, periodLabel, view = "orders") {
  const byProduct = view === "products";
  const base = {
    title: byProduct ? "COMPANY STATEMENT - PRODUCTS" : "COMPANY STATEMENT",
    subtitle: statement.name,
    meta: `Generated ${format(new Date(), "MMM d, yyyy h:mm a")}`,
    periodLabel,
    totals: [
      { label: "Total Purchased", value: `$${statement.totals.totalPurchased.toFixed(2)}` },
      { label: "Total Paid", value: `$${statement.totals.totalPaid.toFixed(2)}` },
      { label: "Total Owed", value: `$${statement.totals.totalOwed.toFixed(2)}`, bold: true },
    ],
    footer: "Powered by Invento",
  };
  if (byProduct) {
    return {
      ...base,
      columns: [
        { header: "Product" },
        { header: "Qty", align: "right" },
        { header: "Total", align: "right" },
        { header: "Owed", align: "right" },
      ],
      rows: groupPurchasesByProduct(statement.purchases).map((r) => [
        r.productName,
        String(r.quantity),
        `$${r.total.toFixed(2)}`,
        `$${r.owed.toFixed(2)}`,
      ]),
    };
  }
  return {
    ...base,
    columns: [
      { header: "Date" },
      { header: "Order / Product" },
      { header: "Total", align: "right" },
      { header: "Status", align: "center" },
    ],
    rows: groupPurchasesByOrder(statement.purchases).flatMap((order, i, all) => [
      [
        format(new Date(order.date), "MMM d, yyyy"),
        `Order #${all.length - i} (${order.items.length} item${order.items.length === 1 ? "" : "s"})`,
        `$${order.total.toFixed(2)}`,
        order.status === "paid" ? "Paid" : order.status === "partial" ? "Partial" : "Unpaid",
      ],
      ...order.items.map((p) => [
        "",
        `  - ${p.productName} ${p.quantity} x $${Number(p.unitPrice || 0).toFixed(2)}`,
        `$${p.total.toFixed(2)}`,
        p.paid ? "Paid" : "Unpaid",
      ]),
    ]),
  };
}
