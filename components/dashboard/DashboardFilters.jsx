// components/dashboard/DashboardFilters.jsx
"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { getTodayDateString } from "@/lib/dateUtils";
import { CalendarRange, ListFilter, Trophy, Package } from "lucide-react";

const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" },
  { value: "custom", label: "Custom Range" },
];

const PRODUCT_SORT_OPTIONS = [
  { value: "orders", label: "Most Ordered" },
  { value: "profit", label: "Most Profitable" },
];

const LIMIT_OPTIONS = [5, 10, 20];

export default function DashboardFilters({ filters, setFilters }) {
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await axios.get("/api/categories", { params: { all: true } });
      return res.data;
    },
  });

  const update = (patch) => setFilters((prev) => ({ ...prev, ...patch }));

  return (
    <Card className="shadow-sm border-gray-200 mb-8">
      <CardContent className="p-4 space-y-4">
        {/* Date Range */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <CalendarRange className="h-4 w-4 text-blue-600" />
            Date Range:
          </div>
          <select
            value={filters.range}
            onChange={(e) => {
              const nextRange = e.target.value;
              if (nextRange === "custom") {
                update({
                  range: nextRange,
                  startDate: filters.startDate || getTodayDateString(),
                  endDate: filters.endDate || getTodayDateString(),
                });
              } else {
                update({ range: nextRange });
              }
            }}
            className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {filters.range === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => update({ startDate: e.target.value })}
                className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => update({ endDate: e.target.value })}
                className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-6 border-t pt-4">
          {/* Top Products filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Package className="h-4 w-4 text-purple-600" />
              Top Products:
            </div>
            <select
              value={filters.topProductsSort}
              onChange={(e) => update({ topProductsSort: e.target.value })}
              className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PRODUCT_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={filters.topProductsCategory}
              onChange={(e) => update({ topProductsCategory: e.target.value })}
              className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <select
              value={filters.topProductsLimit}
              onChange={(e) => update({ topProductsLimit: parseInt(e.target.value) })}
              className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  Top {n}
                </option>
              ))}
            </select>
          </div>

          {/* Top Customers / Debtors filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Trophy className="h-4 w-4 text-amber-600" />
              Top Debtors:
            </div>
            <select
              value={filters.topCustomersLimit}
              onChange={(e) => update({ topCustomersLimit: parseInt(e.target.value) })}
              className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  Top {n}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <ListFilter className="h-3 w-3" />
              Min debt: $
            </div>
            <input
              type="number"
              min="0"
              value={filters.topCustomersMinDebt}
              onChange={(e) => update({ topCustomersMinDebt: e.target.value })}
              className="border rounded-md text-sm px-2 py-1.5 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
