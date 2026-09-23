"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Receipt, TrendingUp, Wallet } from "lucide-react";

// Total $ / profit summary for whatever set of orders the caller is
// currently showing (a status tab, a date range, or both combined) - the
// figures are computed server-side over every matching order, not just the
// current page, so this stays correct across pagination.
//
// `collectedAmount` is optional - when the caller passes it, a third stat
// is shown: actual cash collected (full total for Paid orders, just the
// amount paid so far for Partially Paid ones). Callers that don't pass it
// keep the original 2-stat layout.
export function OrdersTotalsCard({ totalAmount = 0, totalProfit = 0, collectedAmount, label = "Total Sales" }) {
  const showCollected = collectedAmount !== undefined;
  return (
    <Card className="shadow-sm border-gray-200">
      <CardContent className={`p-4 grid gap-4 ${showCollected ? "grid-cols-3" : "grid-cols-2"}`}>
        <div className="flex flex-col items-center sm:items-start gap-1">
          <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <Receipt className="h-3.5 w-3.5" />
            {label}
          </span>
          <span className="text-lg font-bold text-gray-900">
            ${totalAmount.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col items-center sm:items-start gap-1">
          <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <TrendingUp className="h-3.5 w-3.5" />
            Profit Made
          </span>
          <span className={`text-lg font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${totalProfit.toLocaleString()}
          </span>
        </div>
        {showCollected && (
          <div className="flex flex-col items-center sm:items-start gap-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <Wallet className="h-3.5 w-3.5" />
              Paid + Partially Paid
            </span>
            <span className="text-lg font-bold text-blue-600">
              ${collectedAmount.toLocaleString()}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
