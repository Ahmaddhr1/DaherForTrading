// components/dashboard/SummaryCards.jsx
"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import DashboardCard from "./DashboardCard";
import { Skeleton } from "@/components/ui/skeleton";

const fetchSummaryData = async (range, startDate, endDate) => {
  const response = await axios.get("/api/dashboard/profit", {
    params: { range, startDate: startDate || undefined, endDate: endDate || undefined },
  });
  return response.data;
};

const SummaryCards = ({ range = "all", startDate, endDate }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-summary", range, startDate, endDate],
    queryFn: () => fetchSummaryData(range, startDate, endDate),
  });

  if (error) {
    return <div className="text-red-500">Error loading summary</div>;
  }

  const profitData = data?.data?.selected || {};

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
          <Skeleton key={item} className="h-32 rounded-lg" />
        ))}
      </div>
    );
  }

  const netRevenue = profitData.netRevenue || 0;
  const revenueInHand = profitData.revenueInHand || 0;
  const salesMinusPayments = profitData.salesMinusPayments || 0;

  const signed = (value) => `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString()}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <DashboardCard
        title="Real Profit"
        value={`$${(profitData.realProfit || 0).toLocaleString()}`}
        description="Profit earned in selected range"
        color="green"
      />

      <DashboardCard
        title="Expected Profit"
        value={`$${(profitData.expectedProfit || 0).toLocaleString()}`}
        description="Projected profit in selected range"
        color="blue"
      />

      <DashboardCard
        title="Total Orders"
        value={(profitData.totalAllOrders || 0).toLocaleString()}
        description="Orders in selected range"
        color="purple"
      />

      <DashboardCard
        title="Total Revenue"
        value={`$${(profitData.totalAllOrdersValue || 0).toLocaleString()}`}
        description="Sales amount in selected range"
        color="orange"
      />

      <DashboardCard
        title="Total Purchases"
        value={`$${(profitData.purchasesTotal || 0).toLocaleString()}`}
        description="Spent restocking from companies"
        color="orange"
      />

      <DashboardCard
        title="Net Revenue"
        value={signed(netRevenue)}
        description="Revenue minus purchases (can be negative)"
        color={netRevenue < 0 ? "red" : "green"}
      />

      <DashboardCard
        title="Revenue in Hand"
        value={signed(revenueInHand)}
        description="Net revenue minus disbursements (can be negative)"
        color={revenueInHand < 0 ? "red" : "green"}
      />

      <DashboardCard
        title="Profit (Sales − Payments)"
        value={signed(salesMinusPayments)}
        description="Total sales minus payments actually collected"
        color={salesMinusPayments < 0 ? "red" : "yellow"}
      />
    </div>
  );
};

export default SummaryCards;
