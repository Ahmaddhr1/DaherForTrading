// components/dashboard/SalesTrendsChart.jsx
"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, ShoppingCart } from "lucide-react";

// Fixed categorical slots from the palette — never cycled or reassigned.
const COLOR_SALES = "#2a78d6"; // slot 1 — blue
const COLOR_PURCHASES = "#eb6834"; // slot 2 — orange
const COLOR_PROFIT = "#1baf7a"; // slot 3 — aqua
const GRID_COLOR = "#e1e0d9";
const AXIS_COLOR = "#898781";

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

const CurrencyTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md p-3 text-sm">
      <p className="font-medium text-gray-900 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }} className="flex justify-between gap-4">
          <span>{entry.name}:</span>
          <span className="font-semibold">${entry.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
};

const CountTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md p-3 text-sm">
      <p className="font-medium text-gray-900 mb-1">{label}</p>
      <p style={{ color: COLOR_SALES }} className="flex justify-between gap-4">
        <span>Orders:</span>
        <span className="font-semibold">{payload[0].value.toLocaleString()}</span>
      </p>
    </div>
  );
};

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
  }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
      {/* Sales vs Purchases vs Profit */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Sales vs Purchases &amp; Profit
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
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={trends} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="label" stroke={AXIS_COLOR} tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: AXIS_COLOR }} />
                <YAxis stroke={AXIS_COLOR} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<CurrencyTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="salesTotal" name="Sales" fill={COLOR_SALES} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="purchasesTotal" name="Purchases" fill={COLOR_PURCHASES} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line dataKey="profit" name="Profit" stroke={COLOR_PROFIT} strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trends} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="label" stroke={AXIS_COLOR} tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: AXIS_COLOR }} />
                <YAxis stroke={AXIS_COLOR} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CountTooltip />} />
                <Bar dataKey="ordersCount" name="Orders" fill={COLOR_SALES} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
