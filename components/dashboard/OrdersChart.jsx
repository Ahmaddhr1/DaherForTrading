// components/dashboard/OrdersChart.jsx
"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const fetchOrdersChartData = async (range, startDate, endDate) => {
  const response = await axios.get("/api/dashboard/stats", {
    params: { range, startDate: startDate || undefined, endDate: endDate || undefined },
  });
  return response.data;
};

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
    { period: "Today", orders: orderCounts.today || 0 },
    { period: "Last Week", orders: orderCounts.lastWeek || 0 },
    { period: "All Time", orders: orderCounts.allTime || 0 },
  ];

  const maxOrders = Math.max(...chartData.map(item => item.orders), 1);

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Order Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 rounded-lg" />
        ) : (
          <div className="space-y-4">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-24 text-sm text-gray-600">{item.period}</div>
                <div className="flex-1">
                  <div 
                    className="bg-blue-500 h-6 rounded-full transition-all duration-300"
                    style={{ width: `${(item.orders / maxOrders) * 100}%` }}
                  ></div>
                </div>
                <div className="w-20 text-right font-medium">
                  {item.orders.toLocaleString()} orders
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!isLoading && (
          <div className="mt-4 text-sm text-gray-500">
            Order volume across different time periods
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrdersChart;