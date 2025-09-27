// components/dashboard/DebtCard.jsx
"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard } from "lucide-react";

const fetchDebtData = async () => {
  const response = await axios.get("/api/dashboard/debts");
  return response.data;
};

const DebtCard = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-debt"],
    queryFn: fetchDebtData,
  });

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-red-500">Error loading debt data</div>
        </CardContent>
      </Card>
    );
  }

  const totalDebt = data?.totalDebt || 0;

  return (
    <Card className="shadow-sm border-gray-200 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <CreditCard className="h-5 w-5 text-blue-600" />
          Total Debt
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <>
            <div className="text-2xl font-bold text-red-600">
              ${totalDebt.toLocaleString()}
            </div>
            <p className="text-sm text-gray-500 mt-1">Amount owed by customers</p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DebtCard;