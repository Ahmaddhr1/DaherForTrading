"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Wallet, TrendingUp } from "lucide-react";
import { localDayStartISO, localDayEndISO } from "@/lib/dateUtils";

export default function ProductPurchaseBreakdown({ companyId }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [productId, setProductId] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["products-all"],
    queryFn: async () => {
      const res = await axios.get("/api/products");
      return res.data;
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["company-product-purchases", companyId, startDate, endDate, productId],
    queryFn: async () => {
      const res = await axios.get(`/api/companies/${companyId}/product-purchases`, {
        params: {
          startDate: localDayStartISO(startDate),
          endDate: localDayEndISO(endDate),
          productId: productId || undefined,
        },
      });
      return res.data;
    },
    enabled: !!companyId,
  });

  const items = data?.items || [];
  const totals = data?.totals || { totalQuantity: 0, totalSpent: 0, totalExpectedProfit: 0 };

  return (
    <Card className="shadow-sm border-gray-200 mb-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          Products Purchased From This Company
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <span className="text-sm font-medium text-gray-700">Product</span>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full sm:w-auto border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
          {(startDate || endDate || productId) && (
            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setProductId("");
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline w-fit"
            >
              Clear
            </button>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-40 rounded-lg" />
        ) : error ? (
          <div className="text-red-500 text-center py-6">Failed to load product purchases</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            No products found for this range
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="space-y-2 sm:hidden">
              {items.map((item) => (
                <div key={item.productId || item.name} className="border rounded-lg p-3">
                  <p className="font-medium text-gray-900 mb-2">{item.name}</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Quantity</p>
                      <p className="font-medium">{item.quantity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Amount Spent</p>
                      <p className="font-medium">${item.totalSpent.toFixed(3)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Expected Profit</p>
                      <p className={`font-medium ${item.expectedProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        ${item.expectedProfit.toFixed(3)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block">
              <Table>
                <TableCaption>Amount purchased and expected profit per product from this company</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-center">Amount Spent</TableHead>
                    <TableHead className="text-center">Expected Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.productId || item.name}>
                      <TableCell className="font-medium text-gray-900">{item.name}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-center font-medium">${item.totalSpent.toFixed(3)}</TableCell>
                      <TableCell className={`text-center font-medium ${item.expectedProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        ${item.expectedProfit.toFixed(3)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Grand totals */}
        {!isLoading && !error && items.length > 0 && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="flex flex-col items-center gap-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <Package className="h-3.5 w-3.5" />
                Units Purchased
              </span>
              <span className="text-lg font-bold text-gray-900">{totals.totalQuantity}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <Wallet className="h-3.5 w-3.5" />
                Total Spent
              </span>
              <span className="text-lg font-bold text-gray-900">${totals.totalSpent.toFixed(3)}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <TrendingUp className="h-3.5 w-3.5" />
                Expected Profit
              </span>
              <span className={`text-lg font-bold ${totals.totalExpectedProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                ${totals.totalExpectedProfit.toFixed(3)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
