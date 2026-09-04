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

const getTodayString = () => new Date().toISOString().split("T")[0];

const DEFAULT_FILTERS = {
  range: "all",
  startDate: getTodayString(),
  endDate: getTodayString(),
  topProductsSort: "orders",
  topProductsCategory: "",
  topProductsLimit: 10,
  topCustomersLimit: 10,
  topCustomersMinDebt: 0,
};

export default function DashboardPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

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
          startDate={filters.startDate}
          endDate={filters.endDate}
        />

        {/* Debt and Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-1">
            <DebtCard />
          </div>
          <div className="lg:col-span-3">
            <OrdersBreakdown
              range={filters.range}
              startDate={filters.startDate}
              endDate={filters.endDate}
            />
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <ProfitChart
            range={filters.range}
            startDate={filters.startDate}
            endDate={filters.endDate}
          />
          <OrdersChart
            range={filters.range}
            startDate={filters.startDate}
            endDate={filters.endDate}
          />
        </div>

        {/* Trends: sales vs purchases vs profit, and order volume, by day/month/year */}
        <SalesTrendsChart />

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
