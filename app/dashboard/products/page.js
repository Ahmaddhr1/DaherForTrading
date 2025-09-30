// app/dashboard/products/page.jsx
"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Package, Plus, Edit, Trash2, ChevronLeft, ChevronRight, Loader2, DollarSign, Box } from "lucide-react";

export default function ProductsPage() {
  // State for search and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState(null);
  const queryClient = useQueryClient();

  // Fetch products data
  const { data, isLoading, error } = useQuery({
    queryKey: ["products", currentPage, searchTerm],
    queryFn: async () => {
      const response = await axios.get("/api/products/get", {
        params: { 
          page: currentPage, 
          limit: 20, 
          search: searchTerm 
        }
      });
      return response.data;
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: async (productId) => {
      await axios.delete(`/api/products/${productId}`);
    },
    onSuccess: () => {
      toast.success("Product deleted successfully");
      queryClient.invalidateQueries(["products"]);
    },
    onError: () => {
      toast.error("Failed to delete product");
    },
  });

  // Handle search with delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // Go back to page 1 when searching
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle delete product
  const handleDelete = async (productId, productName) => {
    if (window.confirm(`Are you sure you want to delete "${productName}"?`)) {
      setDeletingId(productId);
      try {
        await deleteMutation.mutateAsync(productId);
      } finally {
        setDeletingId(null);
      }
    }
  };

  // Extract data from response
  const products = data?.products || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.total || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4">
        
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Products</h1>
                <p className="text-gray-600">Manage your product inventory</p>
              </div>
            </div>
            
            <Link href="/dashboard/products/add">
              <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Product
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
              placeholder="Search products by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600">
            Showing {products.length} of {totalCount} products
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-600">Loading products...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-red-500 text-lg mb-2">Error</div>
              <p className="text-gray-600">Failed to load products. Please try again.</p>
              <Button 
                onClick={() => queryClient.refetchQueries(["products"])}
                className="mt-4"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Products Table */}
        {!isLoading && !error && (
          <Card>
            <Table>
              <TableCaption>
                {products.length === 0 ? "No products found" : "List of your products"}
              </TableCaption>
              
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Product Info</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-center">Price</TableHead>
                  <TableHead className="text-center">Cost</TableHead>
                  <TableHead className="text-center">Profit</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p>No products found</p>
                      {searchTerm && <p className="text-sm">Try adjusting your search</p>}
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product, index) => {
                    const productNumber = (currentPage - 1) * 20 + index + 1;
                    const profit = product.price - product.initialPrice;
                    const profitMargin = product.initialPrice > 0 ? (profit / product.initialPrice) * 100 : 0;
                    
                    return (
                      <TableRow key={product._id} className="hover:bg-gray-50">
                        {/* Number */}
                        <TableCell className="font-medium text-gray-500">
                          #{productNumber}
                        </TableCell>
                        
                        {/* Product Info */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.img?.[0] ? (
                              <img
                                src={product.img[0]}
                                alt={product.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                <Package className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">{product.name}</div>
                              <div className="text-sm text-gray-500">
                                {product.category?.name || "No category"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        
                        {/* Stock */}
                        <TableCell className="text-center">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            product.quantity > 10 
                              ? "bg-green-100 text-green-800" 
                              : product.quantity > 0 
                                ? "bg-yellow-100 text-yellow-800" 
                                : "bg-red-100 text-red-800"
                          }`}>
                            <Box className="h-3 w-3 mr-1" />
                            {product?.quantity} in stock
                          </div>
                        </TableCell>
                        
                        {/* Price */}
                        <TableCell className="text-center font-medium text-green-600">
                          <div className="flex items-center justify-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {product.price.toFixed(2)}
                          </div>
                        </TableCell>
                        
                        {/* Cost */}
                        <TableCell className="text-center text-gray-600">
                          ${product.initialPrice.toFixed(2)}
                        </TableCell>
                        
                        {/* Profit */}
                        <TableCell className="text-center">
                          <div className={`font-medium ${
                            profit >= 0 ? "text-green-600" : "text-red-600"
                          }`}>
                            ${profit.toFixed(2)}
                            <div className="text-xs text-gray-500">
                              {profitMargin.toFixed(1)}%
                            </div>
                          </div>
                        </TableCell>
                        
                        {/* Last Updated */}
                        <TableCell className="text-gray-500 text-sm">
                          {format(new Date(product.updatedAt), "MMM d, yyyy")}
                        </TableCell>
                        
                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/dashboard/products/${product._id}`}>
                              <Button variant="outline" size="sm" className="flex items-center gap-1">
                                <Edit className="h-3 w-3" />
                                Edit
                              </Button>
                            </Link>
                            
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(product._id, product.name)}
                              disabled={deletingId === product._id}
                              className="flex items-center gap-1"
                            >
                              {deletingId === product._id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Pagination */}
        {!isLoading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button
              onClick={() => setCurrentPage(currentPage - 1)}
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
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              variant="outline"
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}