"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart } from "@/components/ui/charts/line-chart";
import { AvailableChartColors } from "@/components/ui/charts/chart-utils";
import { TrendingUp, Percent } from "lucide-react";

const MONTH_OPTIONS = [3, 6, 12];
const TOP_CATEGORY_LIMIT = AvailableChartColors.length;

function formatMonth(monthKey) {
  const [year, month] = monthKey.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

const currencyFormatter = (value) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const percentFormatter = (value) => `${value.toFixed(1)}%`;

export default function ProfitMarginPage() {
  const [months, setMonths] = useState(6);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["profit-margin-report", months],
    queryFn: async () => (await axios.get("/api/reports/profit-margin", { params: { months } })).data,
  });

  const byCategory = data?.byCategory || [];
  const byProduct = data?.byProduct || [];
  const byCategoryOverTime = data?.byCategoryOverTime || [];

  // Only the top N categories by total profit get a line (one per chart
  // color slot - see the dataviz skill's fixed-palette rule, no cycling).
  const topCategoryNames = useMemo(
    () => byCategory.slice(0, TOP_CATEGORY_LIMIT).map((c) => c.categoryName),
    [byCategory]
  );

  const chartData = useMemo(() => {
    const rowsByMonth = new Map();
    for (const entry of byCategoryOverTime) {
      if (!topCategoryNames.includes(entry.categoryName)) continue;
      if (!rowsByMonth.has(entry.month)) {
        rowsByMonth.set(entry.month, { month: entry.month, label: formatMonth(entry.month) });
      }
      rowsByMonth.get(entry.month)[entry.categoryName] = Math.round(entry.marginPercent * 10) / 10;
    }
    return Array.from(rowsByMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [byCategoryOverTime, topCategoryNames]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                Profit Margin Breakdown
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                Margin by category and product over time
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {MONTH_OPTIONS.map((m) => (
              <Button key={m} size="sm" variant={months === m ? "default" : "outline"} onClick={() => setMonths(m)}>
                Last {m}mo
              </Button>
            ))}
          </div>
        </div>

        {error && (
          <div className="text-center py-12 text-red-600">
            Failed to load the profit margin report.
            <Button
              onClick={() => queryClient.refetchQueries(["profit-margin-report"])}
              variant="outline"
              className="mt-4 mx-auto block"
            >
              Try Again
            </Button>
          </div>
        )}

        {!error && (
          <>
            <Card className="mb-6 shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-medium">
                  <Percent className="h-5 w-5 text-emerald-600" />
                  Margin % by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-72 rounded-lg" />
                ) : chartData.length === 0 ? (
                  <div className="text-gray-500 dark:text-gray-400 text-center py-10">
                    No orders in this range yet
                  </div>
                ) : (
                  <LineChart
                    data={chartData}
                    index="label"
                    categories={topCategoryNames}
                    colors={AvailableChartColors.slice(0, topCategoryNames.length)}
                    valueFormatter={percentFormatter}
                    className="h-72"
                  />
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-sm border-gray-200 dark:border-gray-800 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">By Category</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-4"><Skeleton className="h-48 rounded-lg" /></div>
                  ) : byCategory.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No data yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Profit</TableHead>
                          <TableHead className="text-right">Margin</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {byCategory.map((row) => (
                          <TableRow key={row.categoryKey}>
                            <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                              {row.categoryName}
                            </TableCell>
                            <TableCell className="text-right">{currencyFormatter(row.revenue)}</TableCell>
                            <TableCell className={`text-right ${row.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {currencyFormatter(row.profit)}
                            </TableCell>
                            <TableCell className="text-right text-gray-600 dark:text-gray-400">
                              {percentFormatter(row.marginPercent)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm border-gray-200 dark:border-gray-800 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Top Products by Profit</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-4"><Skeleton className="h-48 rounded-lg" /></div>
                  ) : byProduct.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No data yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Profit</TableHead>
                          <TableHead className="text-right">Margin</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {byProduct.slice(0, 20).map((row) => (
                          <TableRow key={row.productKey}>
                            <TableCell>
                              <div className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[160px]">
                                {row.productName}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{row.categoryName}</div>
                            </TableCell>
                            <TableCell className="text-right">{currencyFormatter(row.revenue)}</TableCell>
                            <TableCell className={`text-right ${row.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {currencyFormatter(row.profit)}
                            </TableCell>
                            <TableCell className="text-right text-gray-600 dark:text-gray-400">
                              {percentFormatter(row.marginPercent)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
