"use client";
import { useT } from "@/lib/i18n/LangProvider";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { format } from "@/lib/i18n/date";
import { Printer, MessageCircle, Receipt, Loader2, ClipboardList, Package } from "lucide-react";
import { toast } from "@/lib/i18n/toast";
import { generateStatementPdf, sharePdfOrDownload } from "@/lib/thermalPdf";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeleton-patterns";
import CompanyStatementDoc, { groupPurchasesByProduct } from "@/components/statements/CompanyStatementDoc";
import { statementApiQuery, statementPeriodLabel, statementPrintQuery } from "@/lib/statementPeriod";

const fetchStatement = async (id, startDate, endDate) => {
  const res = await fetch(`/api/companies/${id}/statement${statementApiQuery(startDate, endDate)}`);
  if (!res.ok) throw new Error("Failed to fetch statement");
  return res.json();
};

function CompanyStatementPageInner() {
  const t = useT();
  const { id } = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [startDate, setStartDate] = useState(search.get("from") || "");
  const [endDate, setEndDate] = useState(search.get("to") || "");
  // "orders" = every purchase, "products" = totals per product.
  const [view, setView] = useState(search.get("view") === "products" ? "products" : "orders");
  const viewQuery = (qs) => (view === "products" ? `${qs}${qs ? "&" : "?"}view=products` : qs);

  const { data: statement, isLoading, isError } = useQuery({
    queryKey: ["company-statement", id, startDate, endDate],
    queryFn: () => fetchStatement(id, startDate, endDate),
    enabled: !!id,
  });

  const periodLabel = statementPeriodLabel(startDate, endDate);

  // Printing happens on a dedicated print view (like the thermal receipts):
  // it shows only the statement, in its light design, with its own Print
  // button.
  const handlePrint = () => router.push(`/print/company-statement/${id}${viewQuery(statementPrintQuery(startDate, endDate))}`);

  const handleShareWhatsApp = () => {
    const phoneDigits = statement?.phoneNumber?.toString().replace(/\D/g, "");
    if (!phoneDigits) {
      toast.error("This company has no phone number on file");
      return;
    }

    const shareUrl = `${window.location.origin}/company-statement/${id}`;
    const message = `Hello ${statement.name || ""}, here is your account statement: ${shareUrl}`;
    const waUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleShareThermalPdf = async () => {
    setIsSharingPdf(true);
    try {
      const productRows = view === "products" ? groupPurchasesByProduct(statement.purchases) : null;
      const blob = generateStatementPdf({
        title: productRows ? "COMPANY STATEMENT - PRODUCTS" : "COMPANY STATEMENT",
        subtitle: statement.name,
        meta: `Generated ${format(new Date(), "MMM d, yyyy h:mm a")}`,
        periodLabel,
        ...(productRows && {
          columns: [
            { header: "Product" },
            { header: "Qty", align: "right" },
            { header: "Total", align: "right" },
            { header: "Owed", align: "right" },
          ],
          rows: productRows.map((r) => [r.productName, String(r.quantity), `$${r.total.toFixed(2)}`, `$${r.owed.toFixed(2)}`]),
        }),
        ...(!productRows && {
        columns: [
          { header: "Date" },
          { header: "Product" },
          { header: "Total", align: "right" },
          { header: "Status", align: "center" },
        ],
        rows: statement.purchases.map((purchase) => [
          format(new Date(purchase.createdAt), "MMM d, yyyy"),
          purchase.productName,
          `$${purchase.total.toFixed(2)}`,
          purchase.paid ? "Paid" : "Unpaid",
        ]),
        }),
        totals: [
          { label: "Total Purchased", value: `$${statement.totals.totalPurchased.toFixed(2)}` },
          { label: "Total Paid", value: `$${statement.totals.totalPaid.toFixed(2)}` },
          { label: "Total Owed", value: `$${statement.totals.totalOwed.toFixed(2)}`, bold: true },
        ],
        footer: "Powered by Ahmad Daher",
      });
      const result = await sharePdfOrDownload(blob, `statement-${statement.name?.replace(/\s+/g, "-") || id}.pdf`);
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
          <TableSkeleton rows={5} cols={4} />
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
      <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-800 p-1 mt-4 bg-white dark:bg-gray-900" role="tablist" aria-label={t("Statement view")}>
        {[
          ["orders", ClipboardList, t("Orders")],
          ["products", Package, t("Products")],
        ].map(([key, Icon, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            onClick={() => setView(key)}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === key ? "bg-primary text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2" aria-label={t("Print")}>
          <Printer className="h-4 w-4" />
          {t("Print")}
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
        <CompanyStatementDoc statement={statement} periodLabel={periodLabel} view={view} toolbar={toolbar} />
      </div>
    </div>
  );
}

export default function CompanyStatementPage() {
  return (
    <Suspense>
      <CompanyStatementPageInner />
    </Suspense>
  );
}
