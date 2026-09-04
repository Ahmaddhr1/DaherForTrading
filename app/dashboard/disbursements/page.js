// app/dashboard/disbursements/page.jsx
"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
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
import {
  Search,
  Receipt,
  Loader2,
  Plus,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  TrendingDown,
} from "lucide-react";
import { format } from "date-fns";

const CATEGORY_OPTIONS = ["Salaries", "Rent", "Utilities", "Maintenance", "Transport", "Other"];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "amountDesc", label: "Amount: High to Low" },
  { value: "amountAsc", label: "Amount: Low to High" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function DisbursementsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["disbursements", currentPage, pageSize, searchTerm, category, startDate, endDate, sortBy],
    queryFn: async () => {
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        category: category || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sort: sortBy,
      };
      Object.keys(params).forEach((key) => params[key] === undefined && delete params[key]);
      const res = await axios.get("/api/disbursements", { params });
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await axios.delete(`/api/disbursements/${id}`);
    },
    onSuccess: () => {
      toast.success("Disbursement deleted");
      queryClient.invalidateQueries(["disbursements"]);
    },
    onError: () => toast.error("Failed to delete disbursement"),
  });

  useEffect(() => {
    const timer = setTimeout(() => setCurrentPage(1), 500);
    return () => clearTimeout(timer);
  }, [searchTerm, category, startDate, endDate, sortBy, pageSize]);

  useEffect(() => {
    if (error) toast.error("Failed to load disbursements");
  }, [error]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setCategory("");
    setStartDate("");
    setEndDate("");
    setSortBy("newest");
  };

  const handleDelete = (id, description) => {
    if (window.confirm(`Delete disbursement "${description}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreated = () => {
    setIsModalOpen(false);
    queryClient.invalidateQueries(["disbursements"]);
    queryClient.invalidateQueries(["dashboard-summary"]);
  };

  const disbursements = data?.disbursements || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.total || 0;
  const totalAmount = data?.totalAmount || 0;
  const hasActiveFilters = searchTerm || category || startDate || endDate || sortBy !== "newest";

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Disbursements</h1>
                <p className="text-gray-600">Cash paid out — deducted from revenue in hand</p>
              </div>
            </div>

            <Button onClick={() => setIsModalOpen(true)} className="bg-red-600 hover:bg-red-700 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Disbursement
            </Button>
          </div>
        </div>

        {/* Summary */}
        <Card className="shadow-sm border-gray-200 mb-6">
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Receipt className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">
                {totalCount} disbursement{totalCount === 1 ? "" : "s"} matching current filters
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Total Disbursed:{" "}
              <span className="font-bold text-red-600">${totalAmount.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="shadow-sm border-gray-200 mb-6">
          <CardContent className="p-4 space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Category:</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">All Categories</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(parseInt(e.target.value))}
                  className="border rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="flex items-center gap-1 text-gray-500">
                  <X className="h-3 w-3" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        {isLoading ? (
          <TableSkeleton rows={pageSize} cols={6} />
        ) : error ? (
          <Card>
            <CardContent className="pt-6 text-center text-red-500">Failed to load disbursements.</CardContent>
          </Card>
        ) : disbursements.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-lg mb-2">No disbursements found</p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={handleClearFilters}>Clear Filters</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm border-gray-200">
            <Table>
              <TableCaption>Disbursement history</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disbursements.map((item, index) => (
                  <TableRow key={item._id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-500">
                      {(currentPage - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">{item.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.category}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold text-red-600">
                      -${item.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {format(new Date(item.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(item._id, item.description)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 p-4 border-t">
                <Button
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
                <Button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Disbursement"
        description="Record cash paid out of the business"
        maxWidth="max-w-md"
      >
        <AddDisbursementForm onSuccess={handleCreated} />
      </Modal>
    </div>
  );
}

function AddDisbursementForm({ onSuccess }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post("/api/disbursements", {
        description,
        amount: parseFloat(amount),
        category,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Disbursement recorded successfully");
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Failed to record disbursement");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Input
          id="description"
          placeholder="e.g. Staff salaries for September"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full p-2 border rounded-md focus:border-red-500"
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount ($) *</Label>
        <Input
          id="amount"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          required
        />
      </div>

      <Button
        type="submit"
        disabled={mutation.isPending}
        className="w-full bg-red-600 hover:bg-red-700"
      >
        {mutation.isPending ? (
          <span className="flex items-center gap-2 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Recording...
          </span>
        ) : (
          "Record Disbursement"
        )}
      </Button>
    </form>
  );
}
