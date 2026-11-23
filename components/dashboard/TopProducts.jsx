// components/dashboard/TopProducts.jsx
"use client";
import { t } from "@/core/shared/i18n";
import { useT } from "@/core/shared/i18n/LangProvider";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 3;

const fetchTopProducts = async (limit, sort, category) => {
  const response = await axios.get("/api/dashboard/top-products", {
    params: { limit, sort, category: category || undefined },
  });
  return response.data;
};

const TopProducts = ({ limit = 10, sort = "orders", category = "" }) => {
  const t = useT();
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-top-products", limit, sort, category],
    queryFn: () => fetchTopProducts(limit, sort, category),
  });

  const topProducts = data?.topProducts || [];
  const totalPages = Math.max(1, Math.ceil(topProducts.length / PAGE_SIZE));

  // Jump back to page 1 whenever the underlying list changes (new filters,
  // new data) so pagination never gets stuck past the end.
  useEffect(() => {
    setPage(1);
  }, [limit, sort, category]);

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-red-500">{t("Error loading top products")}</div>
        </CardContent>
      </Card>
    );
  }

  const pageItems = topProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <Package className="h-5 w-5 text-blue-600" />
          {t("Top")} {limit} {t("Products (")}{sort === "profit" ? t("Most Profitable") : t("Most Ordered")})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : topProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">{t("No products found")}</div>
        ) : (
          <>
            <div className="space-y-4">
              {pageItems.map((product, index) => (
                <div
                  key={product._id || index}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-950 rounded-lg p-4"
                >
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary hover:bg-primary w-7 h-7 rounded-full flex items-center justify-center p-0">
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </Badge>
                    {product.img?.[0] ? (
                      <img
                        src={product.img[0]}
                        alt={product.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                        <Package className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {product.nbOfOrders} {t("orders")}
                      </p>
                    </div>
                  </div>
                  <div className="text-end">
                    {sort === "profit" ? (
                      <p className="font-semibold text-green-600">
                        ${(product.totalProfit || 0).toFixed(2)}
                      </p>
                    ) : (
                      <p className="font-semibold">${product.price}</p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {sort === "profit" ? t("total profit") : t("each")}
                    </p>
                  </div>
                </div>
              ))}
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
};

export default TopProducts;
