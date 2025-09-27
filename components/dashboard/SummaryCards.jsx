// components/dashboard/SummaryCards.jsx
"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import DashboardCard from "./DashboardCard";
import { Skeleton } from "@/components/ui/skeleton";

const fetchSummaryData = async () => {
  const response = await axios.get("/api/dashboard/profit");
  return response.data;
};

const SummaryCards = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: fetchSummaryData,
  });

  if (error) {
    return <div className="text-red-500">Error loading summary</div>;
  }

  const profitData = data?.data?.allTime || {};

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-32 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <DashboardCard
        title="Real Profit"
        value={`$${(profitData.realProfit || 0).toLocaleString()}`}
        description="Total profit earned"
        color="green"
      />
      
      <DashboardCard
        title="Expected Profit"
        value={`$${(profitData.expectedProfit || 0).toLocaleString()}`}
        description="Projected profit"
        color="blue"
      />
      
      <DashboardCard
        title="Total Orders"
        value={(profitData.totalAllOrders || 0).toLocaleString()}
        description="All time orders"
        color="purple"
      />
      
      <DashboardCard
        title="Total Revenue"
        value={`$${(profitData.totalAllOrdersValue || 0).toLocaleString()}`}
        description="Total sales amount"
        color="orange"
      />
    </div>
  );
};

export default SummaryCards;