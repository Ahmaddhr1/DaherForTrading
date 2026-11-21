"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { format } from "@/lib/i18n/date";
import { FileText, Calendar, Printer, MessageCircle, Receipt, Loader2 } from "lucide-react";
import { toast } from "@/lib/i18n/toast";
import { useState } from "react";
import { generateStatementPdf, sharePdfOrDownload } from "@/lib/thermalPdf";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeleton-patterns";
import { localDayStartISO, localDayEndISO } from "@/lib/dateUtils";

const fetchStatement = async (id, startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", localDayStartISO(startDate));
  if (endDate) params.set("endDate", localDayEndISO(endDate));
  const qs = params.toString();
  const res = await fetch(`/api/customers/${id}/statement${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Failed to fetch statement");
  return res.json();
};

const statusConfig = {
  paid: { label: "Paid", color: "bg-green-100 text-green-800" },
  partiallyPaid: { label: "Partially Paid", color: "bg-yellow-100 text-yellow-800" },
  pending: { label: "Pending", color: "bg-red-100 text-red-800" },
};

export default function CustomerStatementPage() {
  const t = useT();
  const { id } = useParams();
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: statement, isLoading, isError } = useQuery({
    queryKey: ["customer-statement", id, startDate, endDate],
    queryFn: () => fetchStatement(id, startDate, endDate),
    enabled: !!id,
  });

  const periodLabel = startDate || endDate
    ? `${startDate ? format(new Date(startDate), "MMM d, yyyy") : "the start"} - ${endDate ? format(new Date(endDate), "MMM d, yyyy") : "today"}`
    : "All Time";

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
      const blob = generateStatementPdf({
        title: "ACCOUNT STATEMENT",
        subtitle: statement.fullName,
        meta: `Generated ${format(new Date(), "MMM d, yyyy h:mm a")}`,
        periodLabel,
        columns: [
          { header: "Date" },
          { header: "Total", align: "right" },
          { header: "Paid", align: "right" },
          { header: "Remaining", align: "right" },
          { header: "Status", align: "center" },
        ],
        rows: statement.orders.map((order) => [
          format(new Date(order.createdAt), "MMM d, yyyy"),
          `$${order.total.toFixed(2)}`,
          `$${order.amountpaid.toFixed(2)}`,
          `$${order.remainingBalance.toFixed(2)}`,
          (statusConfig[order.status] || statusConfig.pending).label,
        ]),
        totals: [
          { label: "Total Billed", value: `$${statement.totals.totalAmount.toFixed(2)}` },
          { label: "Total Paid", value: `$${statement.totals.totalPaid.toFixed(2)}` },
          { label: "Total Owed", value: `$${statement.totals.totalRemaining.toFixed(2)}`, bold: true },
        ],
        footer: "Powered by Ahmad Daher",
      });
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
      <div className="min-h-screen bg-gray-50/30 py-8">
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
            <p className="text-gray-600">{t("Unable to load statement. Please try again.")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { fullName, orders, totals } = statement;

  return (
    <div className="min-h-screen bg-gray-50/30 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t("Account Statement")}</h1>
              <p className="text-gray-600 mt-1">{fullName}</p>
            </div>
          </div>
          <div className="flex items-center text-gray-500 text-sm">
            <Calendar className="h-4 w-4 mr-1" />
            {t("Generated")} {format(new Date(), "EEEE, MMMM d, yyyy")}
          </div>
          <div className="flex flex-wrap items-end gap-3 mt-4 print:hidden">
            <div className="space-y-1">
              <Label htmlFor="statement-start" className="text-xs font-medium text-gray-600">{t("From")}</Label>
              <Input id="statement-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="statement-end" className="text-xs font-medium text-gray-600">{t("To")}</Label>
              <Input id="statement-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            </div>
            <p className="text-xs text-gray-500 pb-2">{t("Leave blank for all time. Period:")} {periodLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button variant="outline" onClick={() => window.print()} className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              {t("Print")}
            </Button>
            <Button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="h-4 w-4" />
              {t("Share via WhatsApp")}
            </Button>
            <Button
              variant="outline"
              onClick={handleShareThermalPdf}
              disabled={isSharingPdf}
              className="flex items-center gap-2"
            >
              {isSharingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
              {t("Share as PDF")}
            </Button>
          </div>
        </div>

        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              {t("Order History")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableCaption>{orders.length === 0 ? t("No orders on file.") : t("All orders for this customer")}</TableCaption>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="font-semibold text-gray-700">{t("Date")}</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">{t("Total")}</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">{t("Paid")}</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">{t("Remaining")}</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700">{t("Status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order, index) => {
                    const status = statusConfig[order.status] || statusConfig.pending;
                    return (
                      <TableRow key={order._id} className={index % 2 === 0 ? "bg-gray-50/30" : ""}>
                        <TableCell className="text-gray-600 text-sm whitespace-nowrap">
                          {format(new Date(order.createdAt), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="text-right font-medium text-gray-900 whitespace-nowrap">${order.total.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium whitespace-nowrap">${order.amountpaid.toFixed(2)}</TableCell>
                        <TableCell className={`text-right font-medium whitespace-nowrap ${order.remainingBalance > 0 ? "text-red-600" : "text-gray-900"}`}>
                          ${order.remainingBalance.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <Badge className={status.color}>{t(status.label)}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 mt-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t("Summary")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t("Total Billed")}</span>
              <span className="font-medium text-gray-900">${totals.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-gray-600">{t("Total Paid")}</span>
              <span className="text-green-600 font-medium">${totals.totalPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-semibold text-gray-900">{t("Total Remaining (Debt)")}</span>
              <span className={`font-semibold ${totals.totalRemaining > 0 ? "text-red-600" : "text-gray-900"}`}>
                ${totals.totalRemaining.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="mt-12 pt-6 border-t border-gray-200 text-center">
          <p className="text-gray-500 text-sm">{t("Order management system • Powered by Ahmad Daher")}</p>
        </div>
      </div>
    </div>
  );
}
