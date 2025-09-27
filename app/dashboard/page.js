// app/dashboard/page.jsx
"use client";

import React from "react";
import SummaryCards from "@/components/dashboard/SummaryCards";
import DebtCard from "@/components/dashboard/DebtCard";
import OrdersBreakdown from "@/components/dashboard/OrdersBreakdown";
import ProfitChart from "@/components/dashboard/ProfitChart";
import OrdersChart from "@/components/dashboard/OrdersChart";
import TopProducts from "@/components/dashboard/TopProducts";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Business Dashboard</h1>
          <p className="text-gray-600">Overview of your business performance</p>
        </div>

        {/* Summary Cards */}
        <SummaryCards />

        {/* Debt and Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-1">
            <DebtCard />
          </div>
          <div className="lg:col-span-3">
            <OrdersBreakdown />
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <ProfitChart />
          <OrdersChart />
        </div>

        {/* Top Products */}
        <TopProducts />
      </div>
    </div>
  );
}