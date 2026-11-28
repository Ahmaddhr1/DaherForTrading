// app/dashboard/page.jsx
"use client";
import { t } from "@/core/shared/i18n";
import { useT } from "@/core/shared/i18n/LangProvider";

import React, { useState } from "react";
import SummaryCards from "@/components/dashboard/SummaryCards";
import LowStockAlerts from "@/components/dashboard/LowStockAlerts";
import ExpiryAlerts from "@/components/dashboard/ExpiryAlerts";
import { useModule } from "@/modules/ModulesProvider";
import DebtCard from "@/components/dashboard/DebtCard";
import OrdersBreakdown from "@/components/dashboard/OrdersBreakdown";
import ProfitChart from "@/components/dashboard/ProfitChart";
import OrdersChart from "@/components/dashboard/OrdersChart";
import TopProducts from "@/components/dashboard/TopProducts";
import TopCustomers from "@/components/dashboard/TopCustomers";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import SalesTrendsChart from "@/components/dashboard/SalesTrendsChart";
import RealProfitChart from "@/components/dashboard/RealProfitChart";
import TopPartiesChart from "@/components/dashboard/TopPartiesChart";
import { Users, Building2 } from "lucide-react";
import { getTodayDateString, localDayStartISO, localDayEndISO } from "@/core/shared/dateUtils";

const DEFAULT_FILTERS = {
  range: "all",
  startDate: getTodayDateString(),
  endDate: getTodayDateString(),
  topProductsSort: "orders",
  topProductsCategory: "",
  topProductsLimit: 10,
  topCustomersLimit: 10,
  topCustomersMinDebt: 0,
};

export default function DashboardPage() {
  const t = useT();
  const hasExpiry = useModule("expiry");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Resolved to precise UTC instants here (in the browser) rather than
  // sent as bare dates, so "custom" range filtering means the admin's own
  // local calendar day - not whatever timezone the server happens to run
  // in. See core/shared/dateUtils.js.
  const rangeStart = localDayStartISO(filters.startDate);
  const rangeEnd = localDayEndISO(filters.endDate);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t("Business Dashboard")}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t("Overview of your business performance")}</p>
        </div>

        {/* Filters */}
        <DashboardFilters filters={filters} setFilters={setFilters} />

        {/* Summary Cards */}
        <SummaryCards
          range={filters.range}
          startDate={rangeStart}
          endDate={rangeEnd}
        />

        {/* Low Stock Alerts */}
        <LowStockAlerts />

        {/* Expiring products (owner-chosen window, closest first) */}
        {hasExpiry && <ExpiryAlerts />}

        {/* Debt and Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-1">
            <DebtCard />
          </div>
          <div className="lg:col-span-3">
            <OrdersBreakdown
              range={filters.range}
              startDate={rangeStart}
              endDate={rangeEnd}
            />
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <ProfitChart
            range={filters.range}
            startDate={rangeStart}
            endDate={rangeEnd}
          />
          <OrdersChart
            range={filters.range}
            startDate={rangeStart}
            endDate={rangeEnd}
          />
        </div>

        {/* Trends: sales vs purchases vs profit, and order volume, by day/month/year */}
        <SalesTrendsChart />

        {/* Real profit: sum of (selling price - initial cost) per unit sold */}
        <div className="mb-8">
          <RealProfitChart />
        </div>

        {/* Top 10 customers (what they bought + real profit) and top 10
            companies (what we bought from them + expected profit) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          <TopPartiesChart
            title={t("Top 10 Customers")}
            icon={Users}
            iconClassName="text-blue-600"
            endpoint="/api/dashboard/top-buyers"
            dataKey="topBuyers"
            purchasedLabel={t("Purchased")}
            profitLabel={t("Profit")}
            countLabel={t("Orders")}
            countKey="ordersCount"
            hrefFor={(row) => `/dashboard/customers/${row.customerId}/orders`}
            emptyText={t("No orders in this range")}
            footnote={t(
              "Purchased = total of their orders (drafts excluded). Profit = the real margin those orders made (selling price minus cost at the time of sale)."
            )}
          />
          <TopPartiesChart
            title={t("Top 10 Companies")}
            icon={Building2}
            iconClassName="text-violet-600"
            endpoint="/api/dashboard/top-suppliers"
            dataKey="topSuppliers"
            purchasedLabel={t("Bought")}
            profitLabel={t("Expected profit")}
            countLabel={t("Purchases")}
            countKey="purchasesCount"
            hrefFor={(row) => `/dashboard/companies/${row.companyId}/purchases`}
            emptyText={t("No purchases in this range")}
            footnote={t(
              "Bought = total of your purchases from them. Expected profit = that stock sold at today's prices minus what you paid - an estimate, since prices can change before it sells."
            )}
          />
        </div>

        {/* Top Products & Top Debtors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TopProducts
            limit={filters.topProductsLimit}
            sort={filters.topProductsSort}
            category={filters.topProductsCategory}
          />
          <TopCustomers
            limit={filters.topCustomersLimit}
            minDebt={filters.topCustomersMinDebt}
          />
        </div>
      </div>
    </div>
  );
}
