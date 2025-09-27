
"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, User, Trash2, Phone, Users, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export default function CustomersPage() {
  // State for search and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  // Fetch customers data
  const { data, isLoading, error } = useQuery({
    queryKey: ["customers", currentPage, searchTerm],
    queryFn: async () => {
      const response = await axios.get("/api/customers", {
        params: { 
          page: currentPage, 
          limit: 20, 
          search: searchTerm 
        }
      });
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
      // Refresh the customers list
      queryClient.invalidateQueries(["customers"]);
    },
    onError: () => {
      toast.error("Failed to delete customer");
    },
  });

  // Handle search with delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // Go back to page 1 when searching
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

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

        {/* Search Bar */}
        <div className="mb-6">
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
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600">
            Showing {customers.length} of {totalCount} customers
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
              {searchTerm ? (
                <p className="text-gray-400">Try adjusting your search terms</p>
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
                
                return (
                  <Link 
                    href={`/dashboard/customers/${customer._id}`} 
                    key={customer._id}
                  >
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                      <CardContent className="p-4">
                        {/* Customer Avatar */}
                        <div className="flex justify-center mb-3">
                          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-8 w-8 text-blue-600" />
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
                          {customer.debt > 0 ? (
                            <div>
                              <p className="text-red-600 font-medium">
                                Debt: ${customer.debt}
                              </p>
                              <p className="text-xs text-gray-500">
                                Includes money and bottles
                              </p>
                            </div>
                          ) : (
                            <p className="text-green-600 font-medium">No debt</p>
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
                          disabled={deleteMutation.isLoading}
                          className="w-full"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {deleteMutation.isLoading ? "Deleting..." : "Delete"}
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