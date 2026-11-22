"use client";

import { Fragment } from "react";
import { FileText, Calendar } from "lucide-react";
import { format } from "@/lib/i18n/date";
import { useT } from "@/lib/i18n/LangProvider";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// The company (supplier) statement itself (title, purchases table, summary).
// Two views: "orders" lists every purchase; "products" totals the purchases
// per product (quantity, average price, amount, still owed).
// Rendered on the dashboard statement page (follows the app theme) and on
// the print view /print/company-statement/[id] (wrapped in .force-light, so
// it always prints in its light design).
// Purchases grouped into orders: everything recorded together (same batch
// id), or - for older purchases without one - everything on the same day.
// Newest order first; products inside an order in the order they were added.
export function groupPurchasesByOrder(purchases) {
  const dayKey = (d) => {
    const x = new Date(d);
    return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`;
  };
  const map = new Map();
  for (const p of purchases) {
    const key = p.batchId ? `b:${p.batchId}` : `d:${dayKey(p.createdAt)}`;
    const order = map.get(key) || { key, date: p.createdAt, items: [], total: 0, owed: 0 };
    order.items.push(p);
    order.total += Number(p.total) || 0;
    if (!p.paid) order.owed += Number(p.total) || 0;
    if (new Date(p.createdAt) < new Date(order.date)) order.date = p.createdAt;
    map.set(key, order);
  }
  const orders = [...map.values()].sort((a, b) => new Date(b.date) - new Date(a.date));
  orders.forEach((o) => {
    o.items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    o.status = o.owed <= 0 ? "paid" : o.owed >= o.total - 0.005 ? "unpaid" : "partial";
  });
  return orders;
}

// Purchases grouped by product, biggest spend first.
export function groupPurchasesByProduct(purchases) {
  const map = new Map();
  for (const p of purchases) {
    const key = p.productName || "-";
    const row = map.get(key) || { productName: key, count: 0, quantity: 0, total: 0, owed: 0 };
    row.count += 1;
    row.quantity += Number(p.quantity) || 0;
    row.total += Number(p.total) || 0;
    if (!p.paid) row.owed += Number(p.total) || 0;
    map.set(key, row);
  }
  return [...map.values()]
    .map((r) => ({ ...r, avgPrice: r.quantity ? r.total / r.quantity : 0 }))
    .sort((a, b) => b.total - a.total);
}

export default function CompanyStatementDoc({ statement, periodLabel, view = "orders", toolbar = null }) {
  const t = useT();
  const { name, purchases, totals } = statement;
  const byProduct = view === "products";
  const products = byProduct ? groupPurchasesByProduct(purchases) : [];
  const orders = byProduct ? [] : groupPurchasesByOrder(purchases);
  const statusBadge = {
    paid: ["Paid", "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"],
    partial: ["Partially Paid", "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200"],
    unpaid: ["Unpaid", "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"],
  };
  const head = "font-semibold text-gray-700 dark:text-gray-300";
  const cellMain = "font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap";

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t("Company Statement")}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{name}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-500 dark:text-gray-400 text-sm mt-2">
          <span className="flex items-center">
            <Calendar className="h-4 w-4 me-1" />
            {t("Generated")} {format(new Date(), "EEEE, MMMM d, yyyy")}
          </span>
          {periodLabel && (
            <span>
              {t("Period:")} {periodLabel}
            </span>
          )}
        </div>
        {toolbar}
      </div>

      <Card className="shadow-sm border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-lg">
            <FileText className="h-5 w-5 me-2 text-blue-600 dark:text-blue-400" />
            {byProduct ? t("Purchases by Product") : t("Purchase History")}
          </CardTitle>
          {!byProduct && purchases.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {orders.length} {orders.length === 1 ? t("order") : t("orders")} · {purchases.length}{" "}
              {purchases.length === 1 ? t("item") : t("items")}
            </p>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {byProduct ? (
              <Table>
                <TableCaption>{products.length === 0 ? t("No purchases on file.") : t("Totals per product for this period")}</TableCaption>
                <TableHeader className="bg-gray-50/50 dark:bg-gray-900/40">
                  <TableRow>
                    <TableHead className={head}>{t("Product")}</TableHead>
                    <TableHead className={`text-end ${head}`}>{t("Purchases")}</TableHead>
                    <TableHead className={`text-end ${head}`}>{t("Quantity")}</TableHead>
                    <TableHead className={`text-end ${head}`}>{t("Avg. Price")}</TableHead>
                    <TableHead className={`text-end ${head}`}>{t("Total")}</TableHead>
                    <TableHead className={`text-end ${head}`}>{t("Owed")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((row, index) => (
                    <TableRow key={row.productName} className={index % 2 === 0 ? "bg-gray-50/30 dark:bg-gray-900/30" : ""}>
                      <TableCell className={cellMain}>{row.productName}</TableCell>
                      <TableCell className="text-end text-gray-600 dark:text-gray-400 whitespace-nowrap">{row.count}</TableCell>
                      <TableCell className="text-end text-gray-600 dark:text-gray-400 whitespace-nowrap">{row.quantity}</TableCell>
                      <TableCell className="text-end text-gray-600 dark:text-gray-400 whitespace-nowrap">${row.avgPrice.toFixed(2)}</TableCell>
                      <TableCell className={`text-end ${cellMain}`}>${row.total.toFixed(2)}</TableCell>
                      <TableCell
                        className={`text-end font-medium whitespace-nowrap ${row.owed > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}
                      >
                        ${row.owed.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
            <Table>
              <TableCaption>{purchases.length === 0 ? t("No purchases on file.") : t("All orders from this company, with what was bought in each")}</TableCaption>
              <TableHeader className="bg-gray-50/50 dark:bg-gray-900/40">
                <TableRow>
                  <TableHead className={head}>{t("Date")}</TableHead>
                  <TableHead className={head}>{t("Order")}</TableHead>
                  <TableHead className={`text-end ${head}`}>{t("Total")}</TableHead>
                  <TableHead className={`text-center ${head}`}>{t("Status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order, index) => {
                  const [statusLabel, statusClass] = statusBadge[order.status];
                  return (
                    <Fragment key={order.key}>
                      <TableRow className="bg-gray-50 dark:bg-gray-900/50 border-t-2 border-gray-200 dark:border-gray-800">
                        <TableCell className="text-gray-700 dark:text-gray-300 text-sm font-medium whitespace-nowrap">
                          {format(new Date(order.date), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className={cellMain}>
                          {t("Order")} #{orders.length - index}
                          <span className="ms-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                            {order.items.length} {order.items.length === 1 ? t("item") : t("items")}
                          </span>
                        </TableCell>
                        <TableCell className={`text-end ${cellMain}`}>${order.total.toFixed(2)}</TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <Badge className={statusClass}>{t(statusLabel)}</Badge>
                        </TableCell>
                      </TableRow>
                      {order.items.map((purchase) => (
                        <TableRow key={purchase._id} className="text-sm">
                          <TableCell />
                          <TableCell className="whitespace-nowrap text-gray-700 dark:text-gray-300">
                            <span className="text-gray-400 dark:text-gray-500 me-1.5">↳</span>
                            {purchase.productName}
                            <span className="ms-2 text-xs text-gray-500 dark:text-gray-400 ltr-text">
                              {purchase.quantity} × ${Number(purchase.unitPrice || 0).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="text-end text-gray-700 dark:text-gray-300 whitespace-nowrap">${purchase.total.toFixed(2)}</TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            <span className={`text-xs font-medium ${purchase.paid ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                              {purchase.paid ? t("Paid") : t("Unpaid")}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-gray-200 dark:border-gray-800 mt-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t("Summary")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">{t("Total Purchased")}</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">${totals.totalPurchased.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-gray-600 dark:text-gray-400">{t("Total Paid")}</span>
            <span className="text-green-600 dark:text-green-400 font-medium">${totals.totalPaid.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-semibold text-gray-900 dark:text-gray-100">{t("Total Owed")}</span>
            <span className={`font-semibold ${totals.totalOwed > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>
              ${totals.totalOwed.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t("Order management system • Powered by Ahmad Daher")}</p>
      </div>
    </>
  );
}
