"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CardGridSkeleton } from "@/components/ui/skeleton-patterns";
import {
  Folder,
  Plus,
  ArrowRight,
  FileText,
  Grid3X3,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const CategoriesPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 12;

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

  useEffect(() => {
    const timer = setTimeout(() => setCurrentPage(1), 500);
    return () => clearTimeout(timer);
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
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4">

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <Grid3X3 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Categories</h1>
                <p className="text-gray-600 text-sm sm:text-base truncate">Organize your products by categories</p>
              </div>
            </div>

            <Link href="/dashboard/categories/add">
              <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2 shrink-0">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Category</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search categories by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Results Count */}
        {!isLoading && !error && (
          <div className="mb-4">
            <p className="text-gray-600">
              Showing {categories.length} of {totalCount} categories
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && <CardGridSkeleton count={limit} />}

        {/* Error State */}
        {error && !isLoading && (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-red-500 text-lg mb-2">Error Loading Categories</div>
              <p className="text-gray-600 mb-4">Unable to load categories. Please try again.</p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && categories.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Folder className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? "No Categories Found" : "No Categories Yet"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? "Try adjusting your search."
                  : "Categories help you organize your products. Create your first category to get started."}
              </p>
              {!searchTerm && (
                <Link href="/dashboard/categories/add">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Category
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Categories Grid */}
        {!isLoading && !error && categories.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {categories.map((category) => (
                <Link
                  key={category._id}
                  href={`/dashboard/categories/${category._id}`}
                  className="group block"
                >
                  <Card className="hover:shadow-lg transition-all duration-300 hover:border-blue-300 h-full">
                    <CardContent className="p-6">
                      {/* Category Icon */}
                      <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                          <Folder className="h-8 w-8 text-blue-600" />
                        </div>
                      </div>

                      {/* Category Name */}
                      <h3 className="text-lg font-semibold text-gray-900 text-center mb-2 group-hover:text-blue-600 transition-colors">
                        {category.name}
                      </h3>

                      {/* Category Description */}
                      {category.description && (
                        <p className="text-gray-600 text-sm text-center mb-4 line-clamp-2">
                          {category.description}
                        </p>
                      )}

                      {/* Product Count (if available) */}
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
                        <FileText className="h-4 w-4" />
                        <span>{category.products?.length || 0} products</span>
                      </div>

                      {/* View Button */}
                      <div className="flex items-center justify-center gap-2 text-blue-600 font-medium group-hover:text-blue-700 transition-colors">
                        <span>View Category</span>
                        <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
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
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <span className="text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
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
