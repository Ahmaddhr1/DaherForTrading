"use client";
import { useT } from "@/lib/i18n/LangProvider";
import { whatsappNumber } from "@/lib/whatsapp";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { format } from "@/lib/i18n/date";
import { Printer, MessageCircle, Receipt, Loader2 } from "lucide-react";
import { toast } from "@/lib/i18n/toast";
import { generateStatementPdf } from "@/lib/thermalPdf";
import PdfPreviewDialog from "@/components/PdfPreviewDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeleton-patterns";
import CustomerStatementDoc from "@/components/statements/CustomerStatementDoc";
import { statementApiQuery, statementPeriodLabel } from "@/lib/statementPeriod";
import { buildCustomerStatementReceipt } from "@/lib/statementReceiptData";

const fetchStatement = async (id, startDate, endDate) => {
  const res = await fetch(`/api/customers/${id}/statement${statementApiQuery(startDate, endDate)}`);
  if (!res.ok) throw new Error("Failed to fetch statement");
  return res.json();
};

function CustomerStatementPageInner() {
  const t = useT();
  const { id } = useParams();
  const search = useSearchParams();
  const [startDate, setStartDate] = useState(search.get("from") || "");
  const [endDate, setEndDate] = useState(search.get("to") || "");

  const { data: statement, isLoading, isError } = useQuery({
    queryKey: ["customer-statement", id, startDate, endDate],
    queryFn: () => fetchStatement(id, startDate, endDate),
    enabled: !!id,
  });

  const periodLabel = statementPeriodLabel(startDate, endDate);
  // Content of "Share as PDF".
  const receiptData = statement ? buildCustomerStatementReceipt(statement, periodLabel) : null;


  // Printing happens on a dedicated print view (like the thermal receipts):
  // it shows only the statement, in its light design, with its own Print
  // button.

  const handleShareWhatsApp = () => {
    const phoneDigits = whatsappNumber(statement?.phoneNumber);
    if (!phoneDigits) {
      toast.error("This customer has no phone number on file");
      return;
    }

    const shareUrl = `${window.location.origin}/statement/${id}`;
    const message = `Hello ${statement.fullName || ""}, here is your account statement: ${shareUrl}`;
    const waUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  // Black-and-white PDF statement: shown in a window with Print (choose a
  // printer), Share and Download.
  const [pdf, setPdf] = useState(null);
  const handleShareThermalPdf = () => {
    try {
      setPdf({
        blob: generateStatementPdf(receiptData),
        filename: `statement-${statement.fullName?.replace(/\s+/g, "-") || id}.pdf`,
      });
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/30 dark:bg-transparent py-8">
        <div className="container mx-auto px-4">
          <PageHeaderSkeleton />
          <TableSkeleton rows={5} cols={5} />
        </div>
      </div>
    );
  }

  if (isError || !statement) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">{t("Unable to load statement. Please try again.")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const toolbar = (
    <>
      <div className="flex flex-wrap items-end gap-3 mt-4">
        <div className="space-y-1">
          <Label htmlFor="statement-start" className="text-xs font-medium text-gray-600 dark:text-gray-400">{t("From")}</Label>
          <Input id="statement-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="statement-end" className="text-xs font-medium text-gray-600 dark:text-gray-400">{t("To")}</Label>
          <Input id="statement-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 pb-2">{t("Leave blank for all time.")}</p>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <Button onClick={handleShareThermalPdf} className="flex items-center gap-2" aria-label={t("Print Statement")}>
          <Printer className="h-4 w-4" />
          {t("Print Statement")}
        </Button>
        <Button onClick={handleShareWhatsApp} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white" aria-label={t("Share via WhatsApp")}>
          <MessageCircle className="h-4 w-4" />
          {t("Share via WhatsApp")}
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-transparent py-8">
      <div className="container mx-auto px-4">
        <CustomerStatementDoc statement={statement} periodLabel={periodLabel} toolbar={toolbar} />
      </div>
      <PdfPreviewDialog open={!!pdf} onClose={() => setPdf(null)} blob={pdf?.blob} filename={pdf?.filename} title={t("Print Statement")} />
    </div>
  );
}

export default function CustomerStatementPage() {
  return (
    <Suspense>
      <CustomerStatementPageInner />
    </Suspense>
  );
}
