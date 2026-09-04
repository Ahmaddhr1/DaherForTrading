"use client";

import React, { useState } from "react";
import {
  Table,
  TableCaption,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, History } from "lucide-react";
import { TableSkeleton } from "@/components/ui/skeleton-patterns";
import { format } from "date-fns";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

export default function CompanyPurchasesPage() {
  const router = useRouter();
  const { id } = useParams();
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["company-purchases", id, page],
    queryFn: async () => {
      const res = await axios.get(`/api/companies/${id}/purchases`, {
        params: { page, limit },
      });
      return res.data;
    },
    enabled: !!id,
  });

  const purchases = data?.purchases || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Company
          </Button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <History className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Purchase History {data?.companyName ? `— ${data.companyName}` : ""}
                </h1>
                <p className="text-gray-600">All restocking purchases from this company</p>
              </div>
            </div>

            <Link href={`/dashboard/companies/${id}/addpurchase`}>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Purchase
              </Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={limit} cols={7} />
        ) : isError ? (
          <div className="text-center py-10 text-red-600">Failed to load purchases.</div>
        ) : (
          <div className="bg-white rounded-lg border">
            <Table>
              <TableCaption>{purchases.length === 0 ? "No purchases yet." : "Purchase history"}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Unit Price</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6">
                      No purchases found.
                    </TableCell>
                  </TableRow>
                ) : (
                  purchases.map((purchase, index) => (
                    <TableRow key={purchase._id}>
                      <TableCell>{(page - 1) * limit + index + 1}</TableCell>
                      <TableCell className="font-medium">{purchase.productName}</TableCell>
                      <TableCell className="text-center">${purchase.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{purchase.quantity}</TableCell>
                      <TableCell className="text-center font-medium">${purchase.total.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={purchase.paid ? "default" : "destructive"} className={purchase.paid ? "bg-green-100 text-green-800" : ""}>
                          {purchase.paid ? "Paid" : "Unpaid"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {format(new Date(purchase.createdAt), "MMM d, yyyy HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 p-4 border-t">
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
                <span className="text-sm text-gray-600">
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
          </div>
        )}
      </div>
    </div>
  );
}
