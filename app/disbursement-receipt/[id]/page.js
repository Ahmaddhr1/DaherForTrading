"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Calendar, Loader2, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatLL } from "@/lib/currency";

const fetchPublicDisbursement = async (id) => {
  const res = await fetch(`/api/public/disbursements/${id}`);
  if (!res.ok) throw new Error("Failed to fetch disbursement");
  return res.json();
};

// Public, unauthenticated, read-only disbursement receipt - mirrors
// app/invoice/[id]/page.js and app/purchase-receipt/[id]/page.js.
export default function PublicDisbursementReceiptPage() {
  const { id } = useParams();

  const { data: disbursement, isLoading, isError } = useQuery({
    queryKey: ["public-disbursement", id],
    queryFn: () => fetchPublicDisbursement(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError || !disbursement) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">This receipt link is invalid or no longer available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Receipt className="h-5 w-5 text-blue-600" />
                Disbursement Receipt
              </CardTitle>
              <Badge className="bg-green-100 text-green-800">Paid</Badge>
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(disbursement.createdAt), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Description</p>
              <p className="font-medium text-gray-900">{disbursement.description}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Category</p>
              <Badge variant="outline">{disbursement.category}</Badge>
            </div>

            <Separator />

            <div className="flex justify-between">
              <span className="text-gray-600">Amount</span>
              <span className="font-semibold text-gray-900">${disbursement.amount.toFixed(2)}</span>
            </div>
            {disbursement.dollarRate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">≈</span>
                <span className="text-gray-500">{formatLL(disbursement.amount, disbursement.dollarRate)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
