// components/dashboard/ProfitChart.jsx
"use client";
import { t } from "@/core/shared/i18n";
import { useT } from "@/core/shared/i18n/LangProvider";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart } from "@/components/ui/charts/bar-chart";

const fetchProfitChartData = async (range, startDate, endDate) => {
  const response = await axios.get("/api/dashboard/profit", {
    params: { range, startDate: startDate || undefined, endDate: endDate || undefined },
  });
  return response.data;
};

const currencyFormatter = (value) => `$${value.toLocaleString()}`;

const ProfitChart = ({ range = "all", startDate, endDate }) => {
  const t = useT();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-profit-chart", range, startDate, endDate],
    queryFn: () => fetchProfitChartData(range, startDate, endDate),
  });

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-red-500">{t("Error loading profit chart")}</div>
        </CardContent>
      </Card>
    );
  }

  const profitData = data?.data || {};

  // Fixed lookback periods only - the selected-range figure already has its
  // own card in the Profit summary section above, so it isn't repeated here.
  const chartData = [
    { period: t("Today"), [t("Profit")]: profitData?.today?.realProfit || 0 },
    { period: t("Last Week"), [t("Profit")]: profitData?.lastWeek?.realProfit || 0 },
    { period: t("Last Month"), [t("Profit")]: profitData?.lastMonth?.realProfit || 0 },
  ];

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="text-lg font-medium">{t("Profit Trends")}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 rounded-lg" />
        ) : (
          <BarChart
            data={chartData}
            index="period"
            categories={[t("Profit")]}
            colors={["emerald"]}
            valueFormatter={currencyFormatter}
            showLegend={false}
            className="h-64"
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ProfitChart;
