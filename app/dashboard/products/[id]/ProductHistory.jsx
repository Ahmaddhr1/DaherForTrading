"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { History, TrendingUp, TrendingDown, ShoppingCart, Truck } from "lucide-react";
import { localDayStartISO, localDayEndISO } from "@/lib/dateUtils";

export default function ProductHistory({ productId }) {
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
    <Card className="shadow-sm border-gray-200 mt-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5 text-blue-600" />
          Sales vs Purchases History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <span className="text-sm font-medium text-gray-700">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-auto border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <span className="text-sm font-medium text-gray-700">To</span>
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
              className="text-sm text-gray-500 hover:text-gray-700 underline w-fit"
            >
              Clear
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-6">Failed to load history</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Sales */}
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2 font-medium text-green-900 mb-3">
                <ShoppingCart className="h-4 w-4" />
                Sales
              </div>
              <div className="space-y-1.5 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-green-700">Units Sold</span>
                  <span className="font-medium text-green-900">{sales.totalQuantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Revenue</span>
                  <span className="font-medium text-green-900">${sales.totalRevenue.toFixed(3)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-green-200">
                  <span className="text-green-700 flex items-center gap-1">
                    {sales.totalProfit >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    Est. Profit
                  </span>
                  <span className={`font-bold ${sales.totalProfit >= 0 ? "text-green-900" : "text-red-700"}`}>
                    ${sales.totalProfit.toFixed(3)}
                  </span>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {sales.entries.length === 0 ? (
                  <p className="text-xs text-green-700/70">No sales in this range</p>
                ) : (
                  sales.entries.map((e, i) => (
                    <div key={i} className="flex justify-between text-xs text-green-800 bg-white/60 rounded px-2 py-1">
                      <span>{e.quantity} x ${e.price.toFixed(3)}</span>
                      <span>{format(new Date(e.createdAt), "MMM d, yyyy")}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Purchases */}
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <div className="flex items-center gap-2 font-medium text-orange-900 mb-3">
                <Truck className="h-4 w-4" />
                Purchases (Restocking)
              </div>
              <div className="space-y-1.5 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-orange-700">Units Purchased</span>
                  <span className="font-medium text-orange-900">{purchases.totalQuantity}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-orange-200">
                  <span className="text-orange-700">Total Cost</span>
                  <span className="font-bold text-orange-900">${purchases.totalCost.toFixed(3)}</span>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {purchases.entries.length === 0 ? (
                  <p className="text-xs text-orange-700/70">No purchases in this range</p>
                ) : (
                  purchases.entries.map((p) => (
                    <div key={p._id} className="flex justify-between text-xs text-orange-800 bg-white/60 rounded px-2 py-1">
                      <span>{p.quantity} x ${p.unitPrice.toFixed(3)}</span>
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
