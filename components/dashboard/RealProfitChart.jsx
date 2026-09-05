// components/dashboard/RealProfitChart.jsx
"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  LineChart,
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
import { TrendingUp } from "lucide-react";
import { localDayStartISO, localDayEndISO } from "@/lib/dateUtils";

const COLOR_PROFIT = "#1baf7a";
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
  const date = new Date(period);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const ProfitTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md p-3 text-sm">
      <p className="font-medium text-gray-900 mb-1">{label}</p>
      <p style={{ color: COLOR_PROFIT }} className="flex justify-between gap-4">
        <span>Real Profit:</span>
        <span className="font-semibold">${payload[0].value.toLocaleString()}</span>
      </p>
    </div>
  );
};

export default function RealProfitChart() {
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

  const trends = (data?.trends || []).map((t) => ({
    ...t,
    label: formatPeriodLabel(t.period, granularity),
  }));
  const totalProfit = trends.reduce((sum, t) => sum + t.realProfit, 0);

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Real Profit
        </CardTitle>
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value)}
              className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {GRANULARITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {!useCustomRange && (
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {LIMIT_OPTIONS.map((n) => (
                  <option key={n} value={n}>Last {n}</option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => setUseCustomRange((v) => !v)}
              className={`text-sm px-2 py-1.5 rounded-md border transition-colors ${
                useCustomRange
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Custom Range
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
              <span className="text-gray-400 text-sm">to</span>
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
          <div className="text-red-500 text-center py-10">Failed to load real profit</div>
        ) : trends.length === 0 ? (
          <div className="text-gray-500 text-center py-10">No data yet for this range</div>
        ) : (
          <>
            <div className="mb-3 text-sm text-gray-600">
              Total for this range:{" "}
              <span className={`font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                ${totalProfit.toLocaleString()}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="label" stroke={AXIS_COLOR} tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: AXIS_COLOR }} />
                <YAxis stroke={AXIS_COLOR} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<ProfitTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line dataKey="realProfit" name="Real Profit" stroke={COLOR_PROFIT} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
