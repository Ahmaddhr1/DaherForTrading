"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/skeleton-patterns";
import { PackageSearch, Search, Package, ChevronLeft, ChevronRight } from "lucide-react";

// Entry point for "I want to see a product's stock history but don't
// already have its detail page open" - search/browse products here, pick
// one, and it jumps straight into that product's existing Stock History
// page (app/dashboard/products/[id]/history) with the product already
// selected. Visiting that page directly from a product's own detail page
// (via its "Full Stock Ledger" link) still works exactly as before -
// this page is just an additional way in, not a replacement.
export default function StockHistoryIndexPage() {
  const t = useT();
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ["stock-history-products", page, searchTerm],
    queryFn: async () => {
      const response = await axios.get("/api/products/get", {
        params: { page, limit, search: searchTerm },
      });
      return response.data;
    },
  });

  // Debounce the raw typed input before it drives the request.
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const products = data?.products || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <PackageSearch className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{t("Stock History")}</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              {t(
                "Search for a product to see every purchase, sale, and stock adjustment made to it"
              )}
            </p>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
          <Input
            type="text"
            placeholder={t("Search products by name...")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {isLoading ? (
          <ListSkeleton rows={6} rowHeight="h-16" />
        ) : error ? (
          <div className="text-center py-12 text-red-600">{t("Failed to load products.")}</div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Package className="h-12 w-12 mx-auto mb-3" />
            <p>{t("No products found")}{searchTerm ? t(" matching your search") : ""}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((product) => (
              <Card
                key={product._id}
                className="shadow-sm border-gray-200 dark:border-gray-800 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => router.push(`/dashboard/products/${product._id}/history`)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  {product.img?.[0] ? (
                    <img
                      src={product.img[0]}
                      alt={product.name}
                      className="h-10 w-10 rounded-md object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{product.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {product.quantity} {product.unit || t("pcs")} {t("in stock")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
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
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
