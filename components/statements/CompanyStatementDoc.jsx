"use client";

import { FileText, Calendar } from "lucide-react";
import { format } from "@/lib/i18n/date";
import { useT } from "@/lib/i18n/LangProvider";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// The company (supplier) statement itself (title, purchases table, summary).
// Rendered on the dashboard statement page (follows the app theme) and on
// the print view /print/company-statement/[id] (wrapped in .force-light, so
// it always prints in its light design).
export default function CompanyStatementDoc({ statement, periodLabel, toolbar = null }) {
  const t = useT();
  const { name, purchases, totals } = statement;

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
            {t("Purchase History")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableCaption>{purchases.length === 0 ? t("No purchases on file.") : t("All purchases from this company")}</TableCaption>
              <TableHeader className="bg-gray-50/50 dark:bg-gray-900/40">
                <TableRow>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">{t("Date")}</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">{t("Product")}</TableHead>
                  <TableHead className="text-end font-semibold text-gray-700 dark:text-gray-300">{t("Total")}</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 dark:text-gray-300">{t("Status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((purchase, index) => (
                  <TableRow key={purchase._id} className={index % 2 === 0 ? "bg-gray-50/30 dark:bg-gray-900/30" : ""}>
                    <TableCell className="text-gray-600 dark:text-gray-400 text-sm whitespace-nowrap">
                      {format(new Date(purchase.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{purchase.productName}</TableCell>
                    <TableCell className="text-end font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">${purchase.total.toFixed(2)}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <Badge
                        className={
                          purchase.paid
                            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                        }
                      >
                        {purchase.paid ? t("Paid") : t("Unpaid")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
