
"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Folder, Plus, ArrowRight, Loader2, Tag, FileText, Grid3X3 } from "lucide-react";

const CategoriesPage = () => {
  // Fetch categories data
  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await axios.get("/api/categories");
      return response.data;
    },
  });

  // Show error message if something went wrong
  React.useEffect(() => {
    if (error) {
      toast.error("Failed to load categories");
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4">
        
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Grid3X3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
                <p className="text-gray-600">Organize your products by categories</p>
              </div>
            </div>
            
            <Link href="/dashboard/categories/add">
              <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-gray-600">Loading categories...</p>
            </div>
          </div>
        )}

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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Categories Yet</h3>
              <p className="text-gray-600 mb-4">
                Categories help you organize your products. Create your first category to get started.
              </p>
              <Link href="/dashboard/categories/add">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Category
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Categories Grid */}
        {!isLoading && !error && categories.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {categories.map((category, index) => (
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
        )}

        {/* Quick Stats */}
        {!isLoading && !error && categories.length > 0 && (
          <div className="mt-8 p-6 bg-white rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{categories.length}</div>
                <div className="text-sm text-gray-600">Total Categories</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {categories.filter(cat => cat.products?.length > 0).length}
                </div>
                <div className="text-sm text-gray-600">Active Categories</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {categories.filter(cat => !cat.products?.length || cat.products?.length === 0).length}
                </div>
                <div className="text-sm text-gray-600">Empty Categories</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoriesPage;