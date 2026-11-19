// components/dashboard/SalesTrendsChart.jsx
"use client";

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
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  // day
  const date = new Date(period);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const currencyFormatter = (value) => `$${value.toLocaleString()}`;
const countFormatter = (value) => value.toLocaleString();

export default function SalesTrendsChart() {
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

  const trends = (data?.trends || []).map((t) => ({
    ...t,
    label: formatPeriodLabel(t.period, granularity),
    Sales: t.salesTotal,
    Purchases: t.purchasesTotal,
    Orders: t.ordersCount,
  }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
      {/* Sales vs Purchases */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Sales vs Purchases
          </CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value)}
              className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {GRANULARITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>Last {n}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-72 rounded-lg" />
          ) : error ? (
            <div className="text-red-500 text-center py-10">Failed to load trends</div>
          ) : trends.length === 0 ? (
            <div className="text-gray-500 text-center py-10">No data yet for this range</div>
          ) : (
            <BarChart
              data={trends}
              index="label"
              categories={["Sales", "Purchases"]}
              colors={["blue", "amber"]}
              valueFormatter={currencyFormatter}
              className="h-72"
            />
          )}
        </CardContent>
      </Card>

      {/* Orders Volume */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            Orders Volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-72 rounded-lg" />
          ) : error ? (
            <div className="text-red-500 text-center py-10">Failed to load trends</div>
          ) : trends.length === 0 ? (
            <div className="text-gray-500 text-center py-10">No data yet for this range</div>
          ) : (
            <BarChart
              data={trends}
              index="label"
              categories={["Orders"]}
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
