"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "@/lib/i18n/toast";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CardGridSkeleton } from "@/components/ui/skeleton-patterns";
import {
  Folder,
  Plus,
  ArrowRight,
  Grid3X3,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useHasPermission } from "@/lib/useHasPermission";

const CategoriesPage = () => {
  const t = useT();
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 12;
  const { hasPermission: canCreateCategories } = useHasPermission("canCreateCategories");

  // Fetch categories data
  const { data, isLoading, error } = useQuery({
    queryKey: ["categories", currentPage, searchTerm],
    queryFn: async () => {
      const response = await axios.get("/api/categories", {
        params: { page: currentPage, limit, search: searchTerm },
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
    setCurrentPage(1);
  }, [searchTerm]);

  // Show error message if something went wrong
  useEffect(() => {
    if (error) {
      toast.error("Failed to load categories");
    }
  }, [error]);

  const categories = data?.categories || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.total || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="container mx-auto px-4">

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
                <Grid3X3 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">{t("Categories")}</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base truncate">{t("Organize your products by categories")}</p>
              </div>
            </div>

            {canCreateCategories && (
              <Link href="/dashboard/categories/add">
                <Button className="flex items-center gap-2 shrink-0">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("Add Category")}</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
            <Input
              type="text"
              placeholder={t("Search categories by name...")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="ps-10"
            />
          </div>
        </div>

        {/* Results Count */}
        {!isLoading && !error && (
          <div className="mb-4">
            <p className="text-gray-600 dark:text-gray-400">
              {t("Showing")} {categories.length} {t("of")} {totalCount} {t("categories")}
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && <CardGridSkeleton count={limit} />}

        {/* Error State */}
        {error && !isLoading && (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-red-500 text-lg mb-2">{t("Error Loading Categories")}</div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{t("Unable to load categories. Please try again.")}</p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                {t("Retry")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && categories.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Folder className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {searchTerm ? t("No Categories Found") : t("No Categories Yet")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm
                  ? t("Try adjusting your search.")
                  : t(
                  "Categories help you organize your products. Create your first category to get started."
                )}
              </p>
              {!searchTerm && canCreateCategories && (
                <Link href="/dashboard/categories/add">
                  <Button>
                    <Plus className="h-4 w-4 me-2" />
                    {t("Create First Category")}
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Categories Grid */}
        {!isLoading && !error && categories.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {categories.map((category, index) => {
                const count = category.products?.length || 0;
                return (
                  <Link
                    key={category._id}
                    href={`/dashboard/categories/${category._id}`}
                    className="group block"
                  >
                    {/* Same card design as customers/companies: coloured
                        left edge, number on top, count on the right, action
                        in a footer. */}
                    <Card className="border-s-4 border-s-blue-500 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                      <CardContent className="p-4 flex flex-col h-full">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">
                            #{(currentPage - 1) * limit + index + 1}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              count > 0
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            {count > 0 ? t("In use") : t("Empty")}
                          </span>
                        </div>

                        <div className="mt-2 flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              <Folder className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 break-words">
                                {category.name}
                              </h3>
                              {category.description && (
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                  {t(category.description)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-end shrink-0">
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{count}</p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">{t("products")}</p>
                          </div>
                        </div>

                        <div className="mt-auto pt-3">
                          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                            <span>{t("View Category")}</span>
                            <ArrowRight className="rtl-flip h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={currentPage === 1}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="rtl-flip h-4 w-4" />
                  {t("Previous")}
                </Button>

                <span className="text-gray-600 dark:text-gray-400">
                  {t("Page")} {currentPage} {t("of")} {totalPages}
                </span>

                <Button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {t("Next")}
                  <ChevronRight className="rtl-flip h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CategoriesPage;
