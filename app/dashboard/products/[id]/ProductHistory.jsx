"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { format } from "@/lib/i18n/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { History, TrendingUp, TrendingDown, ShoppingCart, Truck, ListOrdered } from "lucide-react";
import { localDayStartISO, localDayEndISO } from "@/lib/dateUtils";
import Link from "next/link";

export default function ProductHistory({ productId }) {
  const t = useT();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["product-history", productId, startDate, endDate],
    queryFn: async () => {
      const res = await axios.get(`/api/products/${productId}/history`, {
        params: {
          startDate: localDayStartISO(startDate),
          endDate: localDayEndISO(endDate),
        },
      });
      return res.data;
    },
    enabled: !!productId,
  });

  const sales = data?.sales || { entries: [], totalQuantity: 0, totalRevenue: 0, totalProfit: 0 };
  const purchases = data?.purchases || { entries: [], totalQuantity: 0, totalCost: 0 };

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-800 mt-6">
      <CardHeader className="pb-4 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5 text-blue-600" />
          {t("Sales vs Purchases History")}
        </CardTitle>
        <Button asChild variant="outline" size="sm" className="flex items-center gap-1.5">
          <Link href={`/dashboard/products/${productId}/history`}>
            <ListOrdered className="h-3.5 w-3.5" />
            {t("Full Stock Ledger")}
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("From")}</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-auto border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("To")}</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-auto border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline w-fit"
            >
              {t("Clear")}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-6">{t("Failed to load history")}</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Sales */}
            <div className="rounded-lg border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20 p-4">
              <div className="flex items-center gap-2 font-medium text-green-900 dark:text-green-300 mb-3">
                <ShoppingCart className="h-4 w-4" />
                {t("Sales")}
              </div>
              <div className="space-y-1.5 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-green-700">{t("Units Sold")}</span>
                  <span className="font-medium text-green-900 dark:text-green-300">{sales.totalQuantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">{t("Revenue")}</span>
                  <span className="font-medium text-green-900 dark:text-green-300">${sales.totalRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-green-200 dark:border-green-900/50">
                  <span className="text-green-700 flex items-center gap-1">
                    {sales.totalProfit >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    {t("Est. Profit")}
                  </span>
                  <span className={`font-bold ${sales.totalProfit >= 0 ? "text-green-900 dark:text-green-300" : "text-red-700"}`}>
                    ${sales.totalProfit.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {sales.entries.length === 0 ? (
                  <p className="text-xs text-green-700/70">{t("No sales in this range")}</p>
                ) : (
                  sales.entries.map((e, i) => (
                    <div key={i} className="flex justify-between text-xs text-green-800 dark:text-green-400 bg-white/60 dark:bg-gray-900/60 rounded px-2 py-1">
                      <span>{e.quantity} {t("x $")}{e.price.toFixed(2)}</span>
                      <span>{format(new Date(e.createdAt), "MMM d, yyyy")}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Purchases */}
            <div className="rounded-lg border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/20 p-4">
              <div className="flex items-center gap-2 font-medium text-orange-900 dark:text-orange-300 mb-3">
                <Truck className="h-4 w-4" />
                {t("Purchases (Restocking)")}
              </div>
              <div className="space-y-1.5 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-orange-700">{t("Units Purchased")}</span>
                  <span className="font-medium text-orange-900 dark:text-orange-300">{purchases.totalQuantity}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-orange-200 dark:border-orange-900/50">
                  <span className="text-orange-700">{t("Total Cost")}</span>
                  <span className="font-bold text-orange-900 dark:text-orange-300">${purchases.totalCost.toFixed(2)}</span>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {purchases.entries.length === 0 ? (
                  <p className="text-xs text-orange-700/70">{t("No purchases in this range")}</p>
                ) : (
                  purchases.entries.map((p) => (
                    <div key={p._id} className="flex justify-between text-xs text-orange-800 dark:text-orange-400 bg-white/60 dark:bg-gray-900/60 rounded px-2 py-1">
                      <span>{p.quantity} {t("x $")}{p.unitPrice.toFixed(2)}</span>
                      <span>{format(new Date(p.createdAt), "MMM d, yyyy")}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
