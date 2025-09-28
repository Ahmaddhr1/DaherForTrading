// app/dashboard/customers/page.jsx
"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, User, Trash2, Phone, Users, ChevronLeft, ChevronRight, Loader2, Filter, DollarSign, CheckCircle } from "lucide-react";

export default function CustomersPage() {
  // State for search, pagination, and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [debtFilter, setDebtFilter] = useState("all"); // "all", "hasDebt", "noDebt"
  const queryClient = useQueryClient();

  // Fetch customers data with filters
  const { data, isLoading, error } = useQuery({
    queryKey: ["customers", currentPage, searchTerm, debtFilter],
    queryFn: async () => {
      const params = {
        page: currentPage,
        limit: 20,
        search: searchTerm,
        debtFilter: debtFilter !== "all" ? debtFilter : undefined
      };

      // Remove undefined parameters
      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

      const response = await axios.get("/api/customers", { params });
      return response.data;
    },
  });

  // Delete customer mutation
  const deleteMutation = useMutation({
    mutationFn: async (customerId) => {
      await axios.delete(`/api/customers/${customerId}`);
    },
    onSuccess: () => {
      toast.success("Customer deleted successfully");
      queryClient.invalidateQueries(["customers"]);
    },
    onError: () => {
      toast.error("Failed to delete customer");
    },
  });

  // Handle search with delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, debtFilter]);

  // Show error message if something went wrong
  useEffect(() => {
    if (error) {
      toast.error("Failed to load customers");
    }
  }, [error]);

  // Handle delete customer
  const handleDelete = (customerId, customerName) => {
    if (window.confirm(`Are you sure you want to delete ${customerName}?`)) {
      deleteMutation.mutate(customerId);
    }
  };

  // Extract data from response
  const customers = data?.customers || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.total || 0;

  // Calculate debt statistics
  const hasDebtCount = customers.filter(customer => customer.debt > 0).length;
  const noDebtCount = customers.filter(customer => customer.debt === 0).length;

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4">

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
                <p className="text-gray-600">Manage your customers</p>
              </div>
            </div>

            <Link href="/dashboard/customers/create">
              <Button className="bg-blue-600 hover:bg-blue-700">
                + Add Customer
              </Button>
            </Link>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search customers by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Debt Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 mr-4">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filter by Debt:</span>
            </div>

            <Button
              variant={debtFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setDebtFilter("all")}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              All Customers
              <Badge variant="secondary" className="ml-1">
                {totalCount}
              </Badge>
            </Button>

            <Button
              variant={debtFilter === "hasDebt" ? "default" : "outline"}
              size="sm"
              onClick={() => setDebtFilter("hasDebt")}
              className="flex items-center gap-2"
            >
              <DollarSign className="h-4 w-4" />
              Has Debt
              <Badge variant="secondary" className="ml-1">
                {hasDebtCount}
              </Badge>
            </Button>

            <Button
              variant={debtFilter === "noDebt" ? "default" : "outline"}
              size="sm"
              onClick={() => setDebtFilter("noDebt")}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              No Debt
              <Badge variant="secondary" className="ml-1">
                {noDebtCount}
              </Badge>
            </Button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600">
            Showing {customers.length} of {totalCount} customers
            {debtFilter !== "all" && (
              <span className="ml-2 text-blue-600">
                • Filtered by: {debtFilter === "hasDebt" ? "Has Debt" : "No Debt"}
              </span>
            )}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-600">Loading customers...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-red-500 text-lg mb-2">Error</div>
              <p className="text-gray-600">Failed to load customers. Please try again.</p>
              <Button
                onClick={() => queryClient.refetchQueries(["customers"])}
                className="mt-4"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && customers.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 text-lg mb-2">No customers found</p>
              {searchTerm || debtFilter !== "all" ? (
                <div>
                  <p className="text-gray-400 mb-2">Try adjusting your filters</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setDebtFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <Link href="/dashboard/customers/create">
                  <Button className="mt-2">Add Your First Customer</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Customers Grid */}
        {!isLoading && !error && customers.length > 0 && (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {customers.map((customer, index) => {
                const customerNumber = (currentPage - 1) * 20 + index + 1;
                const hasDebt = customer.debt > 0;

                return (
                  <Link
                    href={`/dashboard/customers/${customer._id}`}
                    key={customer._id}
                  >
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                      <CardContent className="p-4">
                        {/* Customer Avatar */}
                        <div className="flex justify-center mb-3">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${hasDebt ? "bg-red-100" : "bg-green-100"
                            }`}>
                            <User className={`h-8 w-8 ${hasDebt ? "text-red-600" : "text-green-600"}`} />
                          </div>
                        </div>

                        {/* Customer Info */}
                        <div className="text-center mb-3">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            #{customerNumber} - {customer.fullName}
                          </h3>

                          {customer.phoneNumber && (
                            <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.phoneNumber}
                            </p>
                          )}
                        </div>

                        {/* Debt Information */}
                        <div className="text-center mb-4">
                          {hasDebt ? (
                            <div>
                              <p className="text-red-600 font-medium">
                                Debt: ${customer.debt}
                              </p>
                              <div className="flex justify-center gap-2 mt-1">
                                {customer.smallBottlesDebt > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    Small: {customer.smallBottlesDebt}
                                  </Badge>
                                )}
                                {customer.bigBottlesDebt > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    Big: {customer.bigBottlesDebt}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="text-green-600 font-medium">
                                <CheckCircle className="h-4 w-4 inline mr-1" />
                                No debt
                              </div>
                              <div className="flex justify-center gap-2 mt-1">
                                {customer.smallBottlesDebt > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    Small: {customer.smallBottlesDebt}
                                  </Badge>
                                )}
                                {customer.bigBottlesDebt > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    Big: {customer.bigBottlesDebt}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Delete Button */}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            handleDelete(customer._id, customer.fullName);
                          }}
                          disabled={deleteMutation.isPending}
                          className="w-full"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </Button>
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
          </>
        )}
      </div>
    </div>
  );
}