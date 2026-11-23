// components/dashboard/OrdersBreakdown.jsx
"use client";
import { t } from "@/core/shared/i18n";
import { useT } from "@/core/shared/i18n/LangProvider";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import DashboardCard from "./DashboardCard";
import { Skeleton } from "@/components/ui/skeleton";

const fetchOrdersData = async (range, startDate, endDate) => {
  const response = await axios.get("/api/dashboard/profit", {
    params: { range, startDate: startDate || undefined, endDate: endDate || undefined },
  });
  return response.data;
};

const OrdersBreakdown = ({ range = "all", startDate, endDate }) => {
  const t = useT();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-orders", range, startDate, endDate],
    queryFn: () => fetchOrdersData(range, startDate, endDate),
  });

  if (error) {
    return <div className="text-red-500">{t("Error loading orders data")}</div>;
  }

  const ordersData = data?.data?.selected || {};

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
        title={t("Paid Orders")}
        value={(ordersData.paidOrdersCount || 0).toLocaleString()}
        description={`$${(ordersData.paidOrdersTotal || 0).toLocaleString()}`}
        color="green"
      />

      <DashboardCard
        title={t("Pending Orders")}
        value={(ordersData.pendingOrdersCount || 0).toLocaleString()}
        description={`$${(ordersData.pendingOrdersTotal || 0).toLocaleString()}`}
        color="yellow"
      />

      <DashboardCard
        title={t("Partial Orders")}
        value={(ordersData.partialOrdersCount || 0).toLocaleString()}
        description={`$${(ordersData.partialOrdersTotal || 0).toLocaleString()}`}
        color="blue"
      />
    </div>
  );
};

export default OrdersBreakdown;
