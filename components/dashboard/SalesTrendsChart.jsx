// components/dashboard/SalesTrendsChart.jsx
"use client";
import { t, dateLocale } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, ShoppingCart } from "lucide-react";
import { BarChart } from "@/components/ui/charts/bar-chart";

const GRANULARITY_OPTIONS = [
  { value: "day", label: "Daily" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
];

const LIMIT_OPTIONS = [6, 12, 24];

function formatPeriodLabel(period, granularity) {
  if (granularity === "year") return period;
  if (granularity === "month") {
    const [year, month] = period.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString(dateLocale() || "en-US", { month: "short", year: "2-digit" });
  }
  // day
  const date = new Date(period);
  return date.toLocaleDateString(dateLocale() || "en-US", { month: "short", day: "numeric" });
}

const currencyFormatter = (value) => `$${value.toLocaleString()}`;
const countFormatter = (value) => value.toLocaleString();

export default function SalesTrendsChart() {
  const t = useT();
  const [granularity, setGranularity] = useState("month");
  const [limit, setLimit] = useState(12);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-trends", granularity, limit],
    queryFn: async () => {
      const res = await axios.get("/api/dashboard/trends", {
        params: { granularity, limit },
      });
      return res.data;
    },
  });

  const trends = (data?.trends || []).map((row) => ({
    ...row,
    label: formatPeriodLabel(row.period, granularity),
    [t("Sales")]: row.salesTotal,
    [t("Purchases")]: row.purchasesTotal,
    [t("Orders")]: row.ordersCount,
  }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
      {/* Sales vs Purchases */}
      <Card className="shadow-sm border-gray-200 dark:border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            {t("Sales vs Purchases")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value)}
              className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {GRANULARITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{t(opt.label)}</option>
              ))}
            </select>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>{t("Last")} {n}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-72 rounded-lg" />
          ) : error ? (
            <div className="text-red-500 text-center py-10">{t("Failed to load trends")}</div>
          ) : trends.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400 text-center py-10">{t("No data yet for this range")}</div>
          ) : (
            <BarChart
              data={trends}
              index="label"
              categories={[t("Sales"), t("Purchases")]}
              colors={["blue", "amber"]}
              valueFormatter={currencyFormatter}
              className="h-72"
            />
          )}
        </CardContent>
      </Card>

      {/* Orders Volume */}
      <Card className="shadow-sm border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            {t("Orders Volume")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-72 rounded-lg" />
          ) : error ? (
            <div className="text-red-500 text-center py-10">{t("Failed to load trends")}</div>
          ) : trends.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400 text-center py-10">{t("No data yet for this range")}</div>
          ) : (
            <BarChart
              data={trends}
              index="label"
              categories={[t("Orders")]}
              colors={["blue"]}
              valueFormatter={countFormatter}
              showLegend={false}
              allowDecimals={false}
              className="h-72"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
