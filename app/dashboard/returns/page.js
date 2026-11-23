"use client";
import { t } from "@/core/shared/i18n";
import { useT } from "@/core/shared/i18n/LangProvider";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { format } from "@/core/shared/i18n/date";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListSkeleton } from "@/components/ui/skeleton-patterns";
import { RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";

export default function ReturnsPage() {
  const t = useT();
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ["returns", page],
    queryFn: async () => (await axios.get("/api/returns", { params: { page, limit } })).data,
  });

  const returns = data?.returns || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <RotateCcw className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{t("Returns")}</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              {t("Stock customers have sent back, across every order")}
            </p>
          </div>
        </div>

        {isLoading ? (
          <ListSkeleton rows={6} rowHeight="h-16" />
        ) : error ? (
          <div className="text-center py-12 text-red-600">{t("Failed to load returns.")}</div>
        ) : returns.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <RotateCcw className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
            <p className="text-lg">{t("No returns processed yet")}</p>
          </div>
        ) : (
          <>
            <Card className="shadow-sm border-gray-200 dark:border-gray-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Date")}</TableHead>
                    <TableHead>{t("Customer")}</TableHead>
                    <TableHead>{t("Items")}</TableHead>
                    <TableHead className="text-center">{t("Restocked")}</TableHead>
                    <TableHead className="text-end">{t("Refund")}</TableHead>
                    <TableHead className="text-end">{t("Order")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.map((ret) => (
                    <TableRow key={ret._id}>
                      <TableCell className="text-gray-500 dark:text-gray-400 text-sm">
                        {format(new Date(ret.createdAt), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                        {ret.customer?.fullName || t("Unknown")}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {ret.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                      </TableCell>
                      <TableCell className="text-center">
                        {ret.restocked ? t("Yes") : t("No")}
                      </TableCell>
                      <TableCell className="text-end font-semibold text-green-600">
                        -${ret.totalRefundAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-end">
                        <Link href={`/dashboard/invoices/${ret.order}`}>
                          <Button variant="outline" size="sm">{t("View Order")}</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <Button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="rtl-flip h-4 w-4" />
                  {t("Previous")}
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t("Page")} {page} {t("of")} {totalPages}
                </span>
                <Button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {t("Next")}
                  <ChevronRight className="rtl-flip h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
