// components/dashboard/AccountsSummary.jsx
"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Landmark, Banknote } from "lucide-react";

const fetchAccounts = async () => (await axios.get("/api/accounts")).data;

export default function AccountsSummary() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
  });

  const accounts = (data?.accounts || []).filter((a) => a.active);
  // Sum only the active accounts actually listed below - the API's
  // totalBalance includes inactive accounts too, which would make this
  // figure not match what's shown when an inactive account still carries
  // a nonzero computed balance.
  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  if (error) return null;

  return (
    <Card className="shadow-sm border-gray-200 mb-8">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <Landmark className="h-5 w-5 text-emerald-600" />
          Cash &amp; Bank
        </CardTitle>
        <Link href="/dashboard/accounts" className="text-sm text-emerald-700 hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">
            No accounts set up yet.{" "}
            <Link href="/dashboard/accounts" className="text-emerald-700 hover:underline">
              Add one
            </Link>{" "}
            to start tracking real cash/bank balances.
          </p>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {accounts.map((account) => (
                <Link
                  key={account._id}
                  href={`/dashboard/accounts/${account._id}`}
                  className="flex items-center justify-between py-2.5 hover:bg-gray-50 -mx-2 px-2 rounded-md transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {account.type === "bank" ? (
                      <Landmark className="h-4 w-4 text-blue-600 shrink-0" />
                    ) : (
                      <Banknote className="h-4 w-4 text-emerald-600 shrink-0" />
                    )}
                    <span className="font-medium text-gray-900 truncate">{account.name}</span>
                  </div>
                  <span className={`font-semibold shrink-0 ${account.balance < 0 ? "text-red-600" : "text-gray-900"}`}>
                    ${account.balance.toLocaleString()}
                  </span>
                </Link>
              ))}
            </div>
            <div className="flex items-center justify-between pt-3 mt-1 border-t">
              <span className="text-sm font-medium text-gray-700">Total</span>
              <span className={`font-bold ${totalBalance < 0 ? "text-red-600" : "text-emerald-700"}`}>
                ${totalBalance.toLocaleString()}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
