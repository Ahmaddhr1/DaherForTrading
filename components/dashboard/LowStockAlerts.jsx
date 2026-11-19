// components/dashboard/LowStockAlerts.jsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, PackageCheck, Box, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 3;

const fetchLowStock = async () => {
  const { data } = await axios.get("/api/products/low-stock", { params: { limit: 10 } });
  return data;
};

export default function LowStockAlerts() {
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["low-stock-products"],
    queryFn: fetchLowStock,
  });

  const products = data?.products || [];
  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const pageItems = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (error) return null;

  return (
    <Card className="shadow-sm border-gray-200 mb-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Low Stock Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-green-700 py-2">
            <PackageCheck className="h-4 w-4" />
            All products are sufficiently stocked.
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {pageItems.map((product) => {
                const threshold = product.lowStockThreshold ?? 5;
                const outOfStock = product.quantity === 0;
                return (
                  <Link
                    key={product._id}
                    href={`/dashboard/products/${product._id}`}
                    className="flex items-center justify-between py-2.5 hover:bg-gray-50 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Box className="h-4 w-4 text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{product.name}</div>
                        {product.category?.name && (
                          <div className="text-xs text-gray-500 truncate">{product.category.name}</div>
                        )}
                      </div>
                    </div>
                    <Badge
                      className={
                        outOfStock
                          ? "bg-red-100 text-red-800 shrink-0"
                          : "bg-yellow-100 text-yellow-800 shrink-0"
                      }
                    >
                      {product.quantity} {product.unit || "pcs"} left
                      {!outOfStock && ` (≤ ${threshold})`}
                    </Badge>
                  </Link>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <Button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
