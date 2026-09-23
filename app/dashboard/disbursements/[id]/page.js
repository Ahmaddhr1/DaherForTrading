"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Receipt, Calendar, Printer, MessageCircle, ArrowLeft, TrendingDown } from "lucide-react";
import Link from "next/link";
import DisbursementThermalReceipt from "./DisbursementThermalReceipt";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/ui/skeleton-patterns";
import { useSettings, formatLL } from "@/lib/currency";

const fetchDisbursement = async (id) => {
  const res = await fetch(`/api/disbursements/${id}`);
  if (!res.ok) throw new Error("Failed to fetch disbursement");
  return res.json();
};

export default function DisbursementDetailsPage() {
  const { id } = useParams();

  const { data: disbursement, isLoading, isError } = useQuery({
    queryKey: ["disbursement", id],
    queryFn: () => fetchDisbursement(id),
    enabled: !!id,
  });

  const { data: settings } = useSettings();

  useEffect(() => {
    const handleAfterPrint = () => document.body.classList.remove("printing-thermal");
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  const handlePrintThermal = () => {
    document.body.classList.add("printing-thermal");
    window.print();
  };

  const handleShareWhatsApp = () => {
    const shareUrl = `${window.location.origin}/disbursement-receipt/${disbursement._id}`;
    const message = `Disbursement receipt: ${shareUrl}`;
    // No customer/company phone applies to an internal expense record - open
    // WhatsApp's contact picker so the admin can choose who to send it to.
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/30 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <PageHeaderSkeleton />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (isError || !disbursement) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Disbursement</h3>
            <p className="text-gray-600">Unable to load this disbursement. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-8">
          <Link href="/dashboard/disbursements">
            <Button variant="ghost" className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              Back to Disbursements
            </Button>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Disbursement Receipt</h1>
              <p className="text-gray-600 mt-1">Disbursement #{disbursement._id}</p>
            </div>
            <Badge className="px-3 py-1 text-sm font-medium self-start sm:self-auto bg-green-100 text-green-800">
              Paid
            </Badge>
          </div>
          <div className="flex items-center text-gray-500 text-sm">
            <Calendar className="h-4 w-4 mr-1" />
            {format(new Date(disbursement.createdAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button variant="outline" onClick={() => window.print()} className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" onClick={handlePrintThermal} className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Thermal Receipt
            </Button>
            <Button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="h-4 w-4" />
              Share via WhatsApp
            </Button>
          </div>
        </div>

        <DisbursementThermalReceipt disbursement={disbursement} />

        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg">
              <TrendingDown className="h-5 w-5 mr-2 text-red-600" />
              Details
            </CardTitle>
            <CardDescription>
              An internal expense - no discount, tax, or debt applies to a disbursement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Description</p>
              <p className="text-gray-900">{disbursement.description}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-gray-500">Category</p>
              <Badge variant="outline">{disbursement.category}</Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center pt-2">
              <span className="text-lg font-semibold text-gray-900">Amount</span>
              <span className="text-2xl font-bold text-red-600">-${disbursement.amount.toFixed(2)}</span>
            </div>
            {settings?.dollarRate > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">≈</span>
                <span className="text-gray-500">{formatLL(disbursement.amount, settings.dollarRate)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
