// components/dashboard/TopPartiesChart.jsx
"use client";
import { t } from "@/core/shared/i18n";
import { useT } from "@/core/shared/i18n/LangProvider";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart } from "@/components/ui/charts/bar-chart";
import { getTodayDateString, localDayStartISO, localDayEndISO } from "@/core/shared/dateUtils";

// Shared "Top 10 X" chart used for both customers (what they bought + the
// real profit it made) and companies (what we bought from them + expected
// profit on that stock). Has its own date range so it can be explored
// independently of the dashboard's global filter, like Real Profit.

const RANGE_OPTIONS = [
  { value: "month", label: "This month" },
  { value: "30d", label: "Last 30 days" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

const pad = (n) => String(n).padStart(2, "0");
const toDateString = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function resolveRange(range, customStart, customEnd) {
  const today = new Date();
  switch (range) {
    case "month":
      return { start: toDateString(new Date(today.getFullYear(), today.getMonth(), 1)), end: getTodayDateString() };
    case "30d": {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { start: toDateString(start), end: getTodayDateString() };
    }
    case "year":
      return { start: `${today.getFullYear()}-01-01`, end: getTodayDateString() };
    case "custom":
      return { start: customStart, end: customEnd };
    default:
      return { start: "", end: "" };
  }
}

const money = (value) =>
  `$${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

const shorten = (name, max = 20) => (name.length > max ? `${name.slice(0, max - 1)}…` : name);

export default function TopPartiesChart({
  title,
  icon: Icon,
  iconClassName = "text-blue-600",
  endpoint,
  dataKey,
  purchasedLabel,
  profitLabel,
  countLabel,
  countKey,
  hrefFor,
  footnote,
  emptyText,
}) {
  const t = useT();
  const [range, setRange] = useState("month");
  const [customStart, setCustomStart] = useState(getTodayDateString());
  const [customEnd, setCustomEnd] = useState(getTodayDateString());
  const [sortBy, setSortBy] = useState("purchased");

  const { start, end } = resolveRange(range, customStart, customEnd);

  const { data, isLoading, error } = useQuery({
    queryKey: [endpoint, range, start, end, sortBy],
    queryFn: async () => {
      const res = await axios.get(endpoint, {
        params: {
          limit: 10,
          sortBy,
          startDate: start ? localDayStartISO(start) : undefined,
          endDate: end ? localDayEndISO(end) : undefined,
        },
      });
      return res.data;
    },
  });

  const rows = data?.[dataKey] || [];
  const chartData = useMemo(
    () =>
      rows.map((row) => ({
        label: shorten(row.name),
        [purchasedLabel]: row.purchased,
        [profitLabel]: row.profit,
      })),
    [rows, purchasedLabel, profitLabel]
  );
  const totals = rows.reduce(
    (acc, row) => ({ purchased: acc.purchased + row.purchased, profit: acc.profit + row.profit }),
    { purchased: 0, profit: 0 }
  );

  const selectClass =
    "border rounded-md text-sm px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-800">
      <CardHeader className="flex flex-col gap-3">
        <CardTitle className="flex items-center gap-2 text-lg font-medium whitespace-nowrap">
          {Icon && <Icon className={`h-5 w-5 ${iconClassName}`} />}
          {title}
        </CardTitle>
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <select value={range} onChange={(e) => setRange(e.target.value)} className={selectClass}>
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.label)}
                </option>
              ))}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={selectClass}>
              <option value="purchased">{t("Rank by")} {purchasedLabel.toLowerCase()}</option>
              <option value="profit">{t("Rank by")} {profitLabel.toLowerCase()}</option>
            </select>
          </div>
          {range === "custom" && (
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className={selectClass} />
              <span className="text-gray-400 dark:text-gray-500 text-sm">{t("to")}</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className={selectClass} />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[26rem] rounded-lg" />
        ) : error ? (
          <div className="text-red-500 text-center py-10">{t("Failed to load")} {title.toLowerCase()}</div>
        ) : rows.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-center py-10">{emptyText}</div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
              <span>
                {t("Top")} {rows.length} {purchasedLabel.toLowerCase()}:{" "}
                <span className="font-bold text-blue-600">{money(totals.purchased)}</span>
              </span>
              <span>
                {profitLabel}:{" "}
                <span className={`font-bold ${totals.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {money(totals.profit)}
                </span>
              </span>
            </div>

            <BarChart
              data={chartData}
              index="label"
              categories={[purchasedLabel, profitLabel]}
              colors={["blue", "emerald"]}
              valueFormatter={money}
              layout="vertical"
              yAxisWidth={130}
              barCategoryGap="20%"
              className="h-[26rem]"
            />

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-start text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                    <th className="py-2 pe-2 w-8">#</th>
                    <th className="py-2 pe-2">{t("Name")}</th>
                    <th className="py-2 pe-2 text-end">{countLabel}</th>
                    <th className="py-2 pe-2 text-end">{purchasedLabel}</th>
                    <th className="py-2 text-end">{profitLabel}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map((row, i) => {
                    const href = hrefFor?.(row);
                    return (
                      <tr key={String(row.customerId || row.companyId || i)}>
                        <td className="py-2 pe-2 text-gray-500">{i + 1}</td>
                        <td className="py-2 pe-2 font-medium text-gray-900 dark:text-gray-100">
                          {href ? (
                            <Link href={href} className="hover:underline">
                              {row.name}
                            </Link>
                          ) : (
                            row.name
                          )}
                        </td>
                        <td className="py-2 pe-2 text-end text-gray-600 dark:text-gray-400">{row[countKey]}</td>
                        <td className="py-2 pe-2 text-end font-semibold text-blue-600">{money(row.purchased)}</td>
                        <td className={`py-2 text-end font-semibold ${row.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {money(row.profit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {footnote && <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{footnote}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
