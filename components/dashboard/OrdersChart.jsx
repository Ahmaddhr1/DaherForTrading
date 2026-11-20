// components/dashboard/OrdersChart.jsx
"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart } from "@/components/ui/charts/bar-chart";

const fetchOrdersChartData = async (range, startDate, endDate) => {
  const response = await axios.get("/api/dashboard/stats", {
    params: { range, startDate: startDate || undefined, endDate: endDate || undefined },
  });
  return response.data;
};

const countFormatter = (value) => value.toLocaleString();

const OrdersChart = ({ range = "all", startDate, endDate }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-orders-chart", range, startDate, endDate],
    queryFn: () => fetchOrdersChartData(range, startDate, endDate),
  });

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-red-500">Error loading orders chart</div>
        </CardContent>
      </Card>
    );
  }

  const stats = data || {};
  const orderCounts = stats?.counts?.orders || {};

  // Fixed lookback periods only - the selected-range count already has its
  // own "Total Orders" card in the summary section above, so it isn't
  // repeated here.
  const chartData = [
    { period: "Today", Orders: orderCounts.today || 0 },
    { period: "Last Week", Orders: orderCounts.lastWeek || 0 },
    { period: "All Time", Orders: orderCounts.allTime || 0 },
  ];

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Order Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 rounded-lg" />
        ) : (
          <BarChart
            data={chartData}
            index="period"
            categories={["Orders"]}
            colors={["blue"]}
            valueFormatter={countFormatter}
            showLegend={false}
            allowDecimals={false}
            className="h-64"
          />
        )}
      </CardContent>
    </Card>
  );
};

export default OrdersChart;
