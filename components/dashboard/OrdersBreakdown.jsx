// components/dashboard/OrdersBreakdown.jsx
"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import DashboardCard from "./DashboardCard";
import { Skeleton } from "@/components/ui/skeleton";

const fetchOrdersData = async () => {
  const response = await axios.get("/api/dashboard/profit");
  return response.data;
};

const OrdersBreakdown = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-orders"],
    queryFn: fetchOrdersData,
  });

  if (error) {
    return <div className="text-red-500">Error loading orders data</div>;
  }

  const ordersData = data?.data?.allTime || {};

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-32 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <DashboardCard
        title="Paid Orders"
        value={(ordersData.paidOrdersCount || 0).toLocaleString()}
        description={`$${(ordersData.paidOrdersTotal || 0).toLocaleString()}`}
        color="green"
      />
      
      <DashboardCard
        title="Pending Orders"
        value={(ordersData.pendingOrdersCount || 0).toLocaleString()}
        description={`$${(ordersData.pendingOrdersTotal || 0).toLocaleString()}`}
        color="yellow"
      />
      
      <DashboardCard
        title="Partial Orders"
        value={(ordersData.partialOrdersCount || 0).toLocaleString()}
        description={`$${(ordersData.partialOrdersTotal || 0).toLocaleString()}`}
        color="blue"
      />
    </div>
  );
};

export default OrdersBreakdown;