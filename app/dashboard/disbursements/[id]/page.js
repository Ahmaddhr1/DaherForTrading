"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";
import { isTouchDevice } from "@/lib/isTouchDevice";
import { applyThermalPageSize } from "@/lib/thermalPageSize";
import DirectPrintButton, { useDirectPrint } from "@/components/DirectPrintButton";
import { useRouter } from "next/navigation";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { format } from "@/lib/i18n/date";
import { Receipt, Calendar, Printer, MessageCircle, TrendingDown } from "lucide-react";
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
  const t = useT();
  // Computers with Chrome/Edge print straight to the thermal printer.
  const directPrint = useDirectPrint();
  const router = useRouter();
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
    if (isTouchDevice()) {
      router.push(`/print/disbursement/${id}`);
      return;
    }
    document.body.classList.add("printing-thermal");
    applyThermalPageSize();
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
      <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/30 py-8">
        <div className="container mx-auto px-4">
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t("Error Loading Disbursement")}</h3>
            <p className="text-gray-600 dark:text-gray-400">{t("Unable to load this disbursement. Please try again.")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/30 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t("Disbursement Receipt")}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{t("Disbursement #")}{disbursement._id}</p>
            </div>
            <Badge className="px-3 py-1 text-sm font-medium self-start sm:self-auto bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
              {t("Paid")}
            </Badge>
          </div>
          <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
            <Calendar className="h-4 w-4 me-1" />
            {format(new Date(disbursement.createdAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {/* Direct (one-click) printing on computers, plus the normal
                thermal print through the print dialog - e.g. for a wired
                printer installed in Windows. */}
            {directPrint && <DirectPrintButton />}
            <Button variant="outline" onClick={handlePrintThermal} className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              {t("Thermal Receipt")}
            </Button>
            <Button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="h-4 w-4" />
              {t("Share via WhatsApp")}
            </Button>
          </div>
        </div>

        <DisbursementThermalReceipt disbursement={disbursement} />

        <Card className="shadow-sm border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg">
              <TrendingDown className="h-5 w-5 me-2 text-red-600" />
              {t("Details")}
            </CardTitle>
            <CardDescription>
              {t(
                "An internal expense - no discount, tax, or debt applies to a disbursement"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("Description")}</p>
              <p className="text-gray-900 dark:text-gray-100">{t(disbursement.description)}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("Category")}</p>
              <Badge variant="outline">{t(disbursement.category)}</Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center pt-2">
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("Amount")}</span>
              <span className="text-2xl font-bold text-red-600">-${disbursement.amount.toFixed(2)}</span>
            </div>
            {settings?.dollarRate > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 dark:text-gray-500">≈</span>
                <span className="text-gray-500 dark:text-gray-400">{formatLL(disbursement.amount, settings.dollarRate)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t("Powered by Invento")}</p>
        </div>
      </div>
    </div>
  );
}
