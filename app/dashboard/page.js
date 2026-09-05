// app/dashboard/page.jsx
"use client";

import React, { useState } from "react";
import SummaryCards from "@/components/dashboard/SummaryCards";
import DebtCard from "@/components/dashboard/DebtCard";
import OrdersBreakdown from "@/components/dashboard/OrdersBreakdown";
import ProfitChart from "@/components/dashboard/ProfitChart";
import OrdersChart from "@/components/dashboard/OrdersChart";
import TopProducts from "@/components/dashboard/TopProducts";
import TopCustomers from "@/components/dashboard/TopCustomers";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import SalesTrendsChart from "@/components/dashboard/SalesTrendsChart";
import RealProfitChart from "@/components/dashboard/RealProfitChart";
import { getTodayDateString, localDayStartISO, localDayEndISO } from "@/lib/dateUtils";

const DEFAULT_FILTERS = {
  range: "all",
  startDate: getTodayDateString(),
  endDate: getTodayDateString(),
  topProductsSort: "orders",
  topProductsCategory: "",
  topProductsLimit: 10,
  topCustomersLimit: 10,
  topCustomersMinDebt: 0,
};

export default function DashboardPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Resolved to precise UTC instants here (in the browser) rather than
  // sent as bare dates, so "custom" range filtering means the admin's own
  // local calendar day - not whatever timezone the server happens to run
  // in. See lib/dateUtils.js.
  const rangeStart = localDayStartISO(filters.startDate);
  const rangeEnd = localDayEndISO(filters.endDate);

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Business Dashboard</h1>
          <p className="text-gray-600">Overview of your business performance</p>
        </div>

        {/* Filters */}
        <DashboardFilters filters={filters} setFilters={setFilters} />

        {/* Summary Cards */}
        <SummaryCards
          range={filters.range}
          startDate={rangeStart}
          endDate={rangeEnd}
        />

        {/* Debt and Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-1">
            <DebtCard />
          </div>
          <div className="lg:col-span-3">
            <OrdersBreakdown
              range={filters.range}
              startDate={rangeStart}
              endDate={rangeEnd}
            />
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <ProfitChart
            range={filters.range}
            startDate={rangeStart}
            endDate={rangeEnd}
          />
          <OrdersChart
            range={filters.range}
            startDate={rangeStart}
            endDate={rangeEnd}
          />
        </div>

        {/* Trends: sales vs purchases vs profit, and order volume, by day/month/year */}
        <SalesTrendsChart />

        {/* Real profit: sum of (selling price - initial cost) per unit sold */}
        <div className="mb-8">
          <RealProfitChart />
        </div>

        {/* Top Products & Top Debtors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TopProducts
            limit={filters.topProductsLimit}
            sort={filters.topProductsSort}
            category={filters.topProductsCategory}
          />
          <TopCustomers
            limit={filters.topCustomersLimit}
            minDebt={filters.topCustomersMinDebt}
          />
        </div>
      </div>
    </div>
  );
}
