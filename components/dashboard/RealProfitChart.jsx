// components/dashboard/RealProfitChart.jsx
"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import { localDayStartISO, localDayEndISO } from "@/lib/dateUtils";
import { LineChart } from "@/components/ui/charts/line-chart";

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
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  const date = new Date(period);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const currencyFormatter = (value) => `$${value.toLocaleString()}`;

export default function RealProfitChart() {
  const t = useT();
  const [granularity, setGranularity] = useState("month");
  const [limit, setLimit] = useState(12);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-real-profit", granularity, limit, useCustomRange, startDate, endDate],
    queryFn: async () => {
      const res = await axios.get("/api/dashboard/real-profit", {
        params: {
          granularity,
          limit: useCustomRange ? undefined : limit,
          startDate: useCustomRange ? localDayStartISO(startDate) : undefined,
          endDate: useCustomRange ? localDayEndISO(endDate) : undefined,
        },
      });
      return res.data;
    },
  });

  const trends = (data?.trends || []).map((row) => ({
    ...row,
    label: formatPeriodLabel(row.period, granularity),
    "Real Profit": row.realProfit,
  }));
  const totalProfit = trends.reduce((sum, row) => sum + row.realProfit, 0);

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-800">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <TrendingUp className="h-5 w-5 text-green-600" />
          {t("Real Profit")}
        </CardTitle>
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value)}
              className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {GRANULARITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{t(opt.label)}</option>
              ))}
            </select>
            {!useCustomRange && (
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {LIMIT_OPTIONS.map((n) => (
                  <option key={n} value={n}>{t("Last")} {n}</option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => setUseCustomRange((v) => !v)}
              className={`text-sm px-2 py-1.5 rounded-md border transition-colors ${
                useCustomRange
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60"
              }`}
            >
              {t("Custom Range")}
            </button>
          </div>
          {useCustomRange && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400 dark:text-gray-500 text-sm">{t("to")}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-72 rounded-lg" />
        ) : error ? (
          <div className="text-red-500 text-center py-10">{t("Failed to load real profit")}</div>
        ) : trends.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-center py-10">{t("No data yet for this range")}</div>
        ) : (
          <>
            <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              {t("Total for this range:")}{" "}
              <span className={`font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                ${totalProfit.toLocaleString()}
              </span>
            </div>
            <LineChart
              data={trends}
              index="label"
              categories={["Real Profit"]}
              colors={["emerald"]}
              valueFormatter={currencyFormatter}
              showLegend={false}
              className="h-72"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
