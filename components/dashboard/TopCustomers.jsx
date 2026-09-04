// components/dashboard/TopCustomers.jsx
"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Trophy, User } from "lucide-react";

const fetchTopCustomers = async (limit, minDebt) => {
  const response = await axios.get("/api/dashboard/top-customers", {
    params: { limit, minDebt },
  });
  return response.data;
};

const TopCustomers = ({ limit = 10, minDebt = 0 }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-top-customers", limit, minDebt],
    queryFn: () => fetchTopCustomers(limit, minDebt),
  });

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-red-500">Error loading top debtors</div>
        </CardContent>
      </Card>
    );
  }

  const topCustomers = data?.topCustomers || [];

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <Trophy className="h-5 w-5 text-amber-600" />
          Top {limit} Debtors (High to Low)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : topCustomers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No customers with outstanding debt
          </div>
        ) : (
          <div className="space-y-3">
            {topCustomers.map((customer, index) => (
              <Link key={customer._id} href={`/dashboard/customers/${customer._id}`}>
                <div className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-amber-500 hover:bg-amber-500 w-7 h-7 rounded-full flex items-center justify-center p-0">
                      {index + 1}
                    </Badge>
                    <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{customer.fullName}</p>
                      <p className="text-sm text-gray-500">{customer.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="text-right font-semibold text-red-600">
                    ${customer.debt.toLocaleString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopCustomers;
