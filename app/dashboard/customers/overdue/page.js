"use client";
import { t } from "@/core/shared/i18n";
import { useT } from "@/core/shared/i18n/LangProvider";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { format } from "@/core/shared/i18n/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListSkeleton } from "@/components/ui/skeleton-patterns";
import { AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";

const DAY_OPTIONS = [15, 30, 60, 90];

export default function OverdueDebtPage() {
  const t = useT();
  const [minDays, setMinDays] = useState(30);
  const [page, setPage] = useState(1);
  const limit = 20;
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["customers-overdue", minDays, page],
    queryFn: async () => {
      const response = await axios.get("/api/customers/overdue", {
        params: { minDays, page, limit },
      });
      return response.data;
    },
  });

  useEffect(() => {
    setPage(1);
  }, [minDays]);

  const customers = data?.customers || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{t("Overdue Debt")}</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              {t(
                "Customers with outstanding debt who haven't paid in a while, sorted by amount owed"
              )}
            </p>
          </div>
        </div>

        <Card className="mb-6 shadow-sm border-gray-200 dark:border-gray-800">
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("Hasn't paid in at least")}</span>
            <div className="flex flex-wrap gap-2">
              {DAY_OPTIONS.map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={minDays === d ? "default" : "outline"}
                  onClick={() => setMinDays(d)}
                >
                  {d} {t("days")}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <ListSkeleton rows={6} rowHeight="h-14" />
        ) : error ? (
          <div className="text-center py-12 text-red-600">
            {t("Failed to load overdue customers.")}
            <Button
              onClick={() => queryClient.refetchQueries(["customers-overdue"])}
              variant="outline"
              className="mt-4 mx-auto block"
            >
              {t("Try Again")}
            </Button>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="text-lg">{t("No customers overdue by")} {minDays}{t("+ days")}</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {total} {t("customer")}{total === 1 ? "" : t("s")} {t("overdue by")} {minDays}{t("+ days")}
            </p>
            <Card className="shadow-sm border-gray-200 dark:border-gray-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Customer")}</TableHead>
                    <TableHead>{t("Phone")}</TableHead>
                    <TableHead>{t("Debt")}</TableHead>
                    <TableHead>{t("Last Payment")}</TableHead>
                    <TableHead>{t("Days Overdue")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer._id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/customers/${customer._id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {customer.fullName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400">{customer.phoneNumber}</TableCell>
                      <TableCell className="font-semibold text-red-600">
                        ${customer.debt.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400">
                        {customer.lastPaymentDate
                          ? format(new Date(customer.lastPaymentDate), "MMM d, yyyy")
                          : t("Never paid")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{customer.daysSincePayment} {t("days")}</Badge>
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
