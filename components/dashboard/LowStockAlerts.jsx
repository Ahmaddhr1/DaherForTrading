// components/dashboard/LowStockAlerts.jsx
"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

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
  const t = useT();
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
    <Card className="shadow-sm border-gray-200 dark:border-gray-800 mb-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          {t("Low Stock Alerts")}
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
            {t("All products are sufficiently stocked.")}
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {pageItems.map((product) => {
                const threshold = product.lowStockThreshold ?? 5;
                const outOfStock = product.quantity === 0;
                return (
                  <Link
                    key={product._id}
                    href={`/dashboard/products/${product._id}`}
                    className="flex items-center justify-between py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Box className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{product.name}</div>
                        {product.category?.name && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{product.category.name}</div>
                        )}
                      </div>
                    </div>
                    <Badge
                      className={
                        outOfStock
                          ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 shrink-0"
                          : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 shrink-0"
                      }
                    >
                      {product.quantity} {t(product.unit || "pcs")} {t("left")}
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
                  <ChevronLeft className="rtl-flip h-4 w-4" />
                  {t("Previous")}
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t("Page")} {page} {t("of")} {totalPages}
                </span>
                <Button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {t("Next")}
                  <ChevronRight className="rtl-flip h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
