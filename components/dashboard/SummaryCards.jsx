// components/dashboard/SummaryCards.jsx
"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import DashboardCard from "./DashboardCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  ShoppingCart,
  Receipt,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Package,
  Scale,
} from "lucide-react";

const fetchSummaryData = async (range, startDate, endDate) => {
  const response = await axios.get("/api/dashboard/profit", {
    params: { range, startDate: startDate || undefined, endDate: endDate || undefined },
  });
  return response.data;
};

const SectionHeading = ({ children }) => (
  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
    {children}
  </h3>
);

const SummaryCards = ({ range = "all", startDate, endDate }) => {
  const { t } = useLanguage();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-summary", range, startDate, endDate],
    queryFn: () => fetchSummaryData(range, startDate, endDate),
  });

  if (error) {
    return <div className="text-red-500 mb-8">Error loading summary</div>;
  }

  const profitData = data?.data?.selected || {};

  if (isLoading) {
    return (
      <div className="space-y-6 mb-8">
        {[1, 2, 3].map((section) => (
          <div key={section}>
            <Skeleton className="h-4 w-32 mb-3" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-28 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const netRevenue = profitData.netRevenue || 0;
  const revenueInHand = profitData.revenueInHand || 0;
  const salesMinusPayments = profitData.salesMinusPayments || 0;

  const signed = (value) => `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString()}`;

  return (
    <div className="space-y-6 mb-8">
      {/* Sales & Orders */}
      <div>
        <SectionHeading>{t("dashboard.salesAndOrders")}</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DashboardCard
            icon={Package}
            title="Total Orders"
            value={(profitData.totalAllOrders || 0).toLocaleString()}
            description="Orders in selected range"
            color="purple"
          />
          <DashboardCard
            icon={ShoppingCart}
            title="Total Revenue"
            value={`$${(profitData.totalAllOrdersValue || 0).toLocaleString()}`}
            description="Sales amount in selected range"
            color="orange"
          />
          <DashboardCard
            icon={Receipt}
            title="Total Purchases"
            value={`$${(profitData.purchasesTotal || 0).toLocaleString()}`}
            description="Spent restocking from companies"
            color="orange"
          />
        </div>
      </div>

      {/* Profit */}
      <div>
        <SectionHeading>{t("dashboard.profit")}</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DashboardCard
            icon={TrendingUp}
            title="Real Profit"
            value={`$${(profitData.realProfit || 0).toLocaleString()}`}
            description="Profit earned in selected range"
            color="green"
          />
          <DashboardCard
            icon={TrendingUp}
            title="Expected Profit"
            value={`$${(profitData.expectedProfit || 0).toLocaleString()}`}
            description="Projected profit in selected range"
            color="blue"
          />
          <DashboardCard
            icon={Scale}
            title="Profit (Sales − Payments)"
            value={signed(salesMinusPayments)}
            description="Total sales minus payments actually collected"
            color={salesMinusPayments < 0 ? "red" : "yellow"}
          />
        </div>
      </div>

      {/* Cash Flow */}
      <div>
        <SectionHeading>{t("dashboard.cashFlow")}</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DashboardCard
            icon={netRevenue < 0 ? TrendingDown : TrendingUp}
            title="Net Revenue"
            value={signed(netRevenue)}
            description="Revenue minus purchases (can be negative)"
            color={netRevenue < 0 ? "red" : "green"}
          />
          <DashboardCard
            icon={PiggyBank}
            title="Revenue in Hand"
            value={signed(revenueInHand)}
            description="Net revenue minus disbursements (can be negative)"
            color={revenueInHand < 0 ? "red" : "green"}
          />
          <DashboardCard
            icon={Wallet}
            title="Payments Collected"
            value={`$${(profitData.paymentsCollected || 0).toLocaleString()}`}
            description="Cash actually received from customers"
            color="blue"
          />
        </div>
      </div>
    </div>
  );
};

export default SummaryCards;
