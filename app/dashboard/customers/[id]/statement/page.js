"use client";
import { useT } from "@/lib/i18n/LangProvider";

import { Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { format } from "@/lib/i18n/date";
import { Printer, MessageCircle, Receipt, Loader2, ReceiptText } from "lucide-react";
import { toast } from "@/lib/i18n/toast";
import { generateStatementPdf, sharePdfOrDownload } from "@/lib/thermalPdf";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeleton-patterns";
import CustomerStatementDoc from "@/components/statements/CustomerStatementDoc";
import { statementApiQuery, statementPeriodLabel, statementPrintQuery } from "@/lib/statementPeriod";
import { buildCustomerStatementReceipt } from "@/lib/statementReceiptData";
import StatementThermalReceipt from "@/components/StatementThermalReceipt";
import { isTouchDevice } from "@/lib/isTouchDevice";
import { applyThermalPageSize } from "@/lib/thermalPageSize";

const fetchStatement = async (id, startDate, endDate) => {
  const res = await fetch(`/api/customers/${id}/statement${statementApiQuery(startDate, endDate)}`);
  if (!res.ok) throw new Error("Failed to fetch statement");
  return res.json();
};

function CustomerStatementPageInner() {
  const t = useT();
  const { id } = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [startDate, setStartDate] = useState(search.get("from") || "");
  const [endDate, setEndDate] = useState(search.get("to") || "");

  const { data: statement, isLoading, isError } = useQuery({
    queryKey: ["customer-statement", id, startDate, endDate],
    queryFn: () => fetchStatement(id, startDate, endDate),
    enabled: !!id,
  });

  const periodLabel = statementPeriodLabel(startDate, endDate);
  // Same content for "Share as PDF" and "Thermal Print".
  const receiptData = statement ? buildCustomerStatementReceipt(statement, periodLabel) : null;

  // Thermal print like the order receipt: the print dialog (choose any
  // printer) with only the 80mm receipt; phones use the dedicated print page.
  const handlePrintThermal = () => {
    if (isTouchDevice()) {
      router.push(`/print/statement-receipt/${id}${statementPrintQuery(startDate, endDate)}`);
      return;
    }
    document.body.classList.add("printing-thermal");
    applyThermalPageSize();
    window.print();
  };
  useEffect(() => {
    const done = () => document.body.classList.remove("printing-thermal");
    window.addEventListener("afterprint", done);
    return () => window.removeEventListener("afterprint", done);
  }, []);

  // Printing happens on a dedicated print view (like the thermal receipts):
  // it shows only the statement, in its light design, with its own Print
  // button.
  const handlePrint = () => router.push(`/print/statement/${id}${statementPrintQuery(startDate, endDate)}`);

  const handleShareWhatsApp = () => {
    const phoneDigits = statement?.phoneNumber?.toString().replace(/\D/g, "");
    if (!phoneDigits) {
      toast.error("This customer has no phone number on file");
      return;
    }

    const shareUrl = `${window.location.origin}/statement/${id}`;
    const message = `Hello ${statement.fullName || ""}, here is your account statement: ${shareUrl}`;
    const waUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleShareThermalPdf = async () => {
    setIsSharingPdf(true);
    try {
      const blob = generateStatementPdf(receiptData);
      const result = await sharePdfOrDownload(blob, `statement-${statement.fullName?.replace(/\s+/g, "-") || id}.pdf`);
      if (result === "downloaded") toast.success("Statement PDF downloaded");
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setIsSharingPdf(false);
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
        <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2" aria-label={t("Print")}>
          <Printer className="h-4 w-4" />
          {t("Print")}
        </Button>
        <Button variant="outline" onClick={handlePrintThermal} className="flex items-center gap-2" aria-label={t("Thermal Print")}>
          <ReceiptText className="h-4 w-4" />
          {t("Thermal Print")}
        </Button>
        <Button onClick={handleShareWhatsApp} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white" aria-label={t("Share via WhatsApp")}>
          <MessageCircle className="h-4 w-4" />
          {t("Share via WhatsApp")}
        </Button>
        <Button variant="outline" onClick={handleShareThermalPdf} disabled={isSharingPdf} className="flex items-center gap-2" aria-label={t("Share as PDF")}>
          {isSharingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
          {t("Share as PDF")}
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-transparent py-8">
      <div className="container mx-auto px-4">
        <CustomerStatementDoc statement={statement} periodLabel={periodLabel} toolbar={toolbar} />
      </div>
      <StatementThermalReceipt data={receiptData} />
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
