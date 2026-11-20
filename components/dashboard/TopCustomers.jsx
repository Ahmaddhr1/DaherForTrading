// components/dashboard/TopCustomers.jsx
"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, User, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 3;

const fetchTopCustomers = async (limit, minDebt) => {
  const response = await axios.get("/api/dashboard/top-customers", {
    params: { limit, minDebt },
  });
  return response.data;
};

const TopCustomers = ({ limit = 10, minDebt = 0 }) => {
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-top-customers", limit, minDebt],
    queryFn: () => fetchTopCustomers(limit, minDebt),
  });

  const topCustomers = data?.topCustomers || [];
  const totalPages = Math.max(1, Math.ceil(topCustomers.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [limit, minDebt]);

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-red-500">Error loading top debtors</div>
        </CardContent>
      </Card>
    );
  }

  const pageItems = topCustomers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <Trophy className="h-5 w-5 text-amber-600" />
          Top {limit} Debtors (High to Low)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : topCustomers.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No customers with outstanding debt
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {pageItems.map((customer, index) => (
                <Link key={customer._id} href={`/dashboard/customers/${customer._id}`}>
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-950 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-amber-500 hover:bg-amber-500 w-7 h-7 rounded-full flex items-center justify-center p-0">
                        {(page - 1) * PAGE_SIZE + index + 1}
                      </Badge>
                      <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <User className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{customer.fullName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{customer.phoneNumber}</p>
                      </div>
                    </div>
                    <div className="text-right font-semibold text-red-600">
                      ${customer.debt.toLocaleString()}
                    </div>
                  </div>
                </Link>
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
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <Button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TopCustomers;
