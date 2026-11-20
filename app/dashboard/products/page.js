// app/dashboard/products/page.jsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton-patterns";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Package, Plus, Edit, Trash2, ChevronLeft, ChevronRight, Loader2, DollarSign, Box, TrendingUp, Wallet, AlertTriangle, LayoutList, LayoutGrid, FileDown, Filter, Tag, X } from "lucide-react";
import ProductGridView from "./ProductGridView";
import GeneratePdfModal from "./GeneratePdfModal";
import CategoryFilterModal from "./CategoryFilterModal";
import BulkPriceUpdateModal from "./BulkPriceUpdateModal";
import BulkCategoryModal from "./BulkCategoryModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCart } from "@/lib/cartContext";
import { useIsOwner } from "@/lib/useIsOwner";

export default function ProductsPage() {
  // State for search and pagination
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  // Several categories can be checked at once on desktop - an empty array
  // means "all categories" (no filter applied).
  const [categoryFilters, setCategoryFilters] = useState([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // "list" | "grid"
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkPriceModalOpen, setBulkPriceModalOpen] = useState(false);
  const [bulkCategoryModalOpen, setBulkCategoryModalOpen] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { addToCart } = useCart();
  const { isOwner } = useIsOwner();
  const queryClient = useQueryClient();

  // The category sidebar's height is capped to match whatever height the
  // table/grid column actually renders at, so a long category list scrolls
  // inside the sidebar instead of growing taller than the table.
  const tableColumnRef = useRef(null);
  const [sidebarMaxHeight, setSidebarMaxHeight] = useState(null);

  const handleAddToCart = (product) => {
    addToCart(product);
    toast.success(`Added "${product.name}" to cart`);
  };

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await axios.get("/api/categories", { params: { all: true } })).data,
  });
  const selectedCategoryLabel =
    categoryFilters.length === 0
      ? "All Categories"
      : categoryFilters.length === 1
        ? categories.find((c) => c._id === categoryFilters[0])?.name || "All Categories"
        : `${categoryFilters.length} categories selected`;

  const toggleCategory = (id) => {
    setCategoryFilters((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  // Fetch products data
  const { data, isLoading, error } = useQuery({
    queryKey: ["products", currentPage, searchTerm, categoryFilters],
    queryFn: async () => {
      const response = await axios.get("/api/products/get", {
        params: {
          page: currentPage,
          limit: 20,
          search: searchTerm,
          category: categoryFilters.length > 0 ? categoryFilters.join(",") : undefined,
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
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete product");
    },
  });

  // Debounce the raw typed input before it drives the request.
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1); // Go back to page 1 when searching
  }, [searchTerm]);

  // Category filter takes effect immediately, no debounce needed
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilters]);

  // A selection only makes sense for the page/filter it was made on.
  useEffect(() => {
    setSelectedIds([]);
  }, [currentPage, searchTerm, categoryFilters]);

  useEffect(() => {
    const el = tableColumnRef.current;
    if (!el) return;
    const updateHeight = () => setSidebarMaxHeight(el.offsetHeight);
    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [data?.products?.length, isLoading, error, viewMode]);

  // Handle delete product
  const [deleteTarget, setDeleteTarget] = useState(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget._id);
    try {
      await deleteMutation.mutateAsync(deleteTarget._id);
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAllOnPage = (products) => {
    const pageIds = products.map((p) => p._id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : pageIds);
  };

  const confirmBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const response = await axios.post("/api/products/bulk", {
        action: "delete",
        productIds: selectedIds,
      });
      const { deleted, skipped } = response.data;
      if (skipped?.length > 0) {
        toast.warning(
          `Deleted ${deleted} product${deleted === 1 ? "" : "s"}, skipped ${skipped.length} already ordered by a customer`
        );
      } else {
        toast.success(`Deleted ${deleted} product${deleted === 1 ? "" : "s"}`);
      }
      queryClient.invalidateQueries(["products"]);
      setSelectedIds([]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Bulk delete failed");
    } finally {
      setBulkDeleting(false);
      setBulkDeleteConfirmOpen(false);
    }
  };

  // Extract data from response
  const products = data?.products || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.total || 0;
  const summary = data?.summary || {
    stockValueCost: 0,
    stockValueSelling: 0,
    potentialProfit: 0,
    totalUnits: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4">
        
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Products</h1>
                <p className="text-gray-600 text-sm sm:text-base truncate">Manage your product inventory</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={() => setPdfModalOpen(true)}
                className="flex items-center gap-2"
              >
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">Generate PDF</span>
              </Button>
              <Link href="/dashboard/products/add">
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Product</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stock value / potential profit summary - hidden in grid view to keep that layout focused on the products */}
        {isOwner && viewMode === "list" && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <Wallet className="h-3.5 w-3.5" />
                Stock Value (Cost)
              </span>
              <span className="text-lg font-bold text-gray-900">
                ${summary.stockValueCost.toLocaleString()}
              </span>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <DollarSign className="h-3.5 w-3.5" />
                Stock Value (Selling)
              </span>
              <span className="text-lg font-bold text-gray-900">
                ${summary.stockValueSelling.toLocaleString()}
              </span>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <TrendingUp className="h-3.5 w-3.5" />
                Potential Profit
              </span>
              <span className={`text-lg font-bold ${summary.potentialProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                ${summary.potentialProfit.toLocaleString()}
              </span>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <Box className="h-3.5 w-3.5" />
                Units in Stock
              </span>
              <span className="text-lg font-bold text-gray-900">
                {summary.totalUnits.toLocaleString()}
              </span>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <AlertTriangle className="h-3.5 w-3.5" />
                Low Stock
              </span>
              <span className={`text-lg font-bold ${summary.lowStockCount > 0 ? "text-yellow-600" : "text-gray-900"}`}>
                {summary.lowStockCount.toLocaleString()}
              </span>
              {summary.outOfStockCount > 0 && (
                <span className="text-xs text-red-600">{summary.outOfStockCount} out of stock</span>
              )}
            </CardContent>
          </Card>
        </div>
        )}

        {/* Mobile: button opening a searchable list modal - desktop has the
            persistent checkbox sidebar instead (below). */}
        <Button
          variant="outline"
          onClick={() => setCategoryModalOpen(true)}
          className="lg:hidden w-full flex items-center gap-2 mb-3"
        >
          <Filter className="h-4 w-4 shrink-0" />
          <span className="truncate">{selectedCategoryLabel}</span>
        </Button>

        {/* Search + view toggle - above both the category sidebar and the table */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative w-full sm:max-w-md sm:flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search products by name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-1 border rounded-md p-1 w-full sm:w-auto sm:shrink-0">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5"
            >
              <LayoutList className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Grid</span>
            </Button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600">
            Showing {products.length} of {totalCount} products
          </p>
        </div>

        {/* Bulk Actions Toolbar - list view only, shown once something is selected */}
        {viewMode === "list" && selectedIds.length > 0 && (
          <Card className="mb-4 shadow-sm border-blue-200 bg-blue-50">
            <CardContent className="p-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-blue-900">
                {selectedIds.length} selected
              </span>
              <div className="flex flex-wrap gap-2 ml-auto">
                <Button size="sm" variant="outline" onClick={() => setBulkPriceModalOpen(true)}>
                  <DollarSign className="h-3.5 w-3.5 mr-1" />
                  Update Price
                </Button>
                <Button size="sm" variant="outline" onClick={() => setBulkCategoryModalOpen(true)}>
                  <Tag className="h-3.5 w-3.5 mr-1" />
                  Reassign Category
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setBulkDeleteConfirmOpen(true)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category sidebar + table/grid row - the sidebar's max-height is
            measured off the table/grid column (see sidebarMaxHeight above)
            so a long category list scrolls inside the sidebar instead of
            growing taller than the table. */}
        <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
          {/* Desktop: always-visible checkbox list beside the table, several
              categories can be checked at once - no selection means "all
              categories". */}
          <div
            className="hidden lg:flex lg:flex-col w-56 shrink-0 min-h-0 border rounded-md bg-white overflow-hidden"
            style={sidebarMaxHeight ? { maxHeight: `${sidebarMaxHeight}px` } : undefined}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
              <span className="text-sm font-medium text-gray-700">Categories</span>
              {categoryFilters.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCategoryFilters([])}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-0.5">
              {categories.length === 0 ? (
                <p className="text-sm text-gray-400 px-2 py-1">No categories yet</p>
              ) : (
                categories.map((cat) => (
                  <label
                    key={cat._id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={categoryFilters.includes(cat._id)}
                      onChange={() => toggleCategory(cat._id)}
                      className="h-4 w-4 rounded border-gray-300 accent-primary"
                    />
                    <span className="truncate">{cat.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Main column: the table/grid itself */}
          <div className="flex-1 min-w-0" ref={tableColumnRef}>
            {/* Loading State */}
            {isLoading && <TableSkeleton rows={8} cols={8} />}

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

            {/* Products Grid */}
            {!isLoading && !error && viewMode === "grid" && (
              <ProductGridView products={products} onAddToCart={handleAddToCart} />
            )}

            {/* Products Table */}
            {!isLoading && !error && viewMode === "list" && (
              <Card>
            <Table>
              <TableCaption>
                {products.length === 0 ? "No products found" : "List of your products"}
              </TableCaption>
              
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 accent-primary"
                      checked={products.length > 0 && products.every((p) => selectedIds.includes(p._id))}
                      onChange={() => toggleSelectAllOnPage(products)}
                      aria-label="Select all products on this page"
                    />
                  </TableHead>
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
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
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
                        {/* Select */}
                        <TableCell>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 accent-primary"
                            checked={selectedIds.includes(product._id)}
                            onChange={() => toggleSelectOne(product._id)}
                            aria-label={`Select ${product.name}`}
                          />
                        </TableCell>
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
                            product.quantity > (product.lowStockThreshold ?? 5)
                              ? "bg-green-100 text-green-800"
                              : product.quantity > 0
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}>
                            <Box className="h-3 w-3 mr-1" />
                            {product?.quantity} {product.unit || "pcs"} in stock
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
                              onClick={() => setDeleteTarget(product)}
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
          </div>
        </div>

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

      <GeneratePdfModal open={pdfModalOpen} onClose={() => setPdfModalOpen(false)} />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete product?"
        description={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        onConfirm={confirmDelete}
        loading={deletingId === deleteTarget?._id}
      />
      <CategoryFilterModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        categories={categories}
        value={categoryFilters.length === 1 ? categoryFilters[0] : ""}
        onChange={(id) => setCategoryFilters(id ? [id] : [])}
      />
      <BulkPriceUpdateModal
        open={bulkPriceModalOpen}
        onClose={() => setBulkPriceModalOpen(false)}
        productIds={selectedIds}
        onDone={() => {
          setBulkPriceModalOpen(false);
          setSelectedIds([]);
        }}
      />
      <BulkCategoryModal
        open={bulkCategoryModalOpen}
        onClose={() => setBulkCategoryModalOpen(false)}
        productIds={selectedIds}
        categories={categories}
        onDone={() => {
          setBulkCategoryModalOpen(false);
          setSelectedIds([]);
        }}
      />
      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        title={`Delete ${selectedIds.length} product${selectedIds.length === 1 ? "" : "s"}?`}
        description="Products already ordered by a customer will be skipped automatically."
        onConfirm={confirmBulkDelete}
        loading={bulkDeleting}
      />
    </div>
  );
}