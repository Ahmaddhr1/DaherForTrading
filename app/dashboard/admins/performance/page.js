"use client";
import { t } from "@/core/shared/i18n";
import { useT } from "@/core/shared/i18n/LangProvider";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListSkeleton } from "@/components/ui/skeleton-patterns";
import { BarChart3, X, Users } from "lucide-react";
import { localDayStartISO, localDayEndISO } from "@/core/shared/dateUtils";
import { DateRangeFilter } from "@/app/dashboard/orders/components/DateRangeFilter";

export default function EmployeePerformancePage() {
  const t = useT();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["activity-performance", startDate, endDate],
    queryFn: async () => {
      const response = await axios.get("/api/activity/performance", {
        params: {
          startDate: localDayStartISO(startDate),
          endDate: localDayEndISO(endDate),
        },
      });
      return response.data;
    },
  });

  const performance = data?.performance || [];
  const hasDateFilter = startDate || endDate;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <BarChart3 className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                {t("Employee Performance")}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                {t("Orders, payments, and other activity handled by each admin")}
              </p>
            </div>
          </div>
        </div>

        <Card className="mb-6 shadow-sm border-gray-200 dark:border-gray-800">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
            {hasDateFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="flex items-center gap-1 text-gray-500 dark:text-gray-400 self-start sm:self-auto"
              >
                <X className="h-3.5 w-3.5" />
                {t("Clear")}
              </Button>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <ListSkeleton rows={4} rowHeight="h-16" />
        ) : error ? (
          <div className="text-center py-12 text-red-600">
            {t("Failed to load performance data.")}
            <Button
              onClick={() => queryClient.refetchQueries(["activity-performance"])}
              variant="outline"
              className="mt-4 mx-auto block"
            >
              {t("Try Again")}
            </Button>
          </div>
        ) : performance.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
            <p className="text-lg">{t("No admin activity in this range")}</p>
          </div>
        ) : (
          <Card className="shadow-sm border-gray-200 dark:border-gray-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Admin")}</TableHead>
                  <TableHead className="text-center">{t("Orders")}</TableHead>
                  <TableHead className="text-center">{t("Orders Value")}</TableHead>
                  <TableHead className="text-center">{t("Profit")}</TableHead>
                  <TableHead className="text-center">{t("Payments")}</TableHead>
                  <TableHead className="text-center">{t("Payments Value")}</TableHead>
                  <TableHead className="text-center">{t("Disbursements")}</TableHead>
                  <TableHead className="text-center">{t("Products Added")}</TableHead>
                  <TableHead className="text-center">{t("Purchases")}</TableHead>
                  <TableHead className="text-center">{t("Total Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performance.map((row) => (
                  <TableRow key={row.adminId}>
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                      {row.adminName}
                    </TableCell>
                    <TableCell className="text-center">{row.ordersCreated}</TableCell>
                    <TableCell className="text-center text-green-600 font-medium">
                      ${row.ordersValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center text-green-600">
                      ${row.ordersProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">{row.paymentsRecorded}</TableCell>
                    <TableCell className="text-center">
                      ${row.paymentsValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">{row.disbursementsRecorded}</TableCell>
                    <TableCell className="text-center">{row.productsCreated}</TableCell>
                    <TableCell className="text-center">{row.purchasesRecorded}</TableCell>
                    <TableCell className="text-center font-semibold text-gray-900 dark:text-gray-100">
                      {row.totalActions}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
