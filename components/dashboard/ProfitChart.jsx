// components/dashboard/ProfitChart.jsx
"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const fetchProfitChartData = async () => {
  const response = await axios.get("/api/dashboard/profit");
  return response.data;
};

const ProfitChart = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-profit-chart"],
    queryFn: fetchProfitChartData,
  });

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-red-500">Error loading profit chart</div>
        </CardContent>
      </Card>
    );
  }

  const profitData = data?.data || {};

  // Simple chart data
  const chartData = [
    { period: "Today", profit: profitData?.today?.realProfit || 0 },
    { period: "Last Week", profit: profitData?.lastWeek?.realProfit || 0 },
    { period: "Last Month", profit: profitData?.lastMonth?.realProfit || 0 },
  ];

  // Simple bar chart using CSS
  const maxProfit = Math.max(...chartData.map(item => item.profit), 1);

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Profit Trends</CardTitle>
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
                    className="bg-green-500 h-6 rounded-full transition-all duration-300"
                    style={{ width: `${(item.profit / maxProfit) * 100}%` }}
                  ></div>
                </div>
                <div className="w-20 text-right font-medium">
                  ${item.profit.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!isLoading && (
          <div className="mt-4 text-sm text-gray-500">
            Visual representation of profit over different periods
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfitChart;