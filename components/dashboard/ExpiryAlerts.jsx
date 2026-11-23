"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarClock, CalendarCheck, Box, ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n/LangProvider";
import { format } from "@/lib/i18n/date";

const PAGE_SIZE = 5;

// Whole days from today to the expiry date (negative = already expired).
function daysLeft(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

// Dashboard alert: every product inside its own alert window (set per
// product, or the default from Settings) or already expired, closest first.
// Paginated on the server (/api/products/expiring).
export default function ExpiryAlerts() {
  const t = useT();
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["expiring-products", page],
    queryFn: async () => (await axios.get("/api/products/expiring", { params: { page, limit: PAGE_SIZE } })).data,
    placeholderData: keepPreviousData,
  });

  if (error) return null;
  const products = data?.products || [];
  const totalPages = data?.totalPages || 1;
  const days = data?.days || 30;

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-800 mb-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex flex-wrap items-center gap-2">
          <CalendarClock className="h-5 w-5 text-orange-600" />
          {t("Expiry Alerts")}
          {data?.total > 0 && (
            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">{data.total}</Badge>
          )}
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            {t("Each product's own alert window (default {0} days)", { 0: days })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 py-2">
            <CalendarCheck className="h-4 w-4" />
            {t("No products expiring soon.")}
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {products.map((product) => {
                const left = daysLeft(product.expiryDate);
                const tone =
                  left < 0
                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                    : left <= 7
                      ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
                const label =
                  left < -1
                    ? t("Expired {0} days ago", { 0: -left })
                    : left === -1
                      ? t("Expired yesterday")
                      : left === 0
                        ? t("Expires today")
                        : left === 1
                          ? t("1 day left")
                          : t("{0} days left", { 0: left });
                return (
                  <Link
                    key={product._id}
                    href={`/dashboard/products/${product.productId || product._id}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Box className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{product.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {format(new Date(product.expiryDate), "MMM d, yyyy")} · {product.quantity} {t(product.unit || "pcs")}
                          {product.batchDate ? ` · ${t("batch of {0}", { 0: format(new Date(product.batchDate), "MMM d") })}` : ""}
                          {product.category?.name ? ` · ${product.category.name}` : ""}
                        </div>
                      </div>
                    </div>
                    <Badge className={`${tone} shrink-0`}>{label}</Badge>
                  </Link>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <Button onClick={() => setPage((p) => p - 1)} disabled={page === 1} variant="outline" size="sm" className="flex items-center gap-2">
                  <ChevronLeft className="rtl-flip h-4 w-4" />
                  {t("Previous")}
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t("Page")} {page} {t("of")} {totalPages}
                </span>
                <Button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} variant="outline" size="sm" className="flex items-center gap-2">
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
