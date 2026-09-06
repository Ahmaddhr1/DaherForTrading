"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { FileText, Calendar, Printer, MessageCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
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
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeleton-patterns";

const fetchStatement = async (id) => {
  const res = await fetch(`/api/companies/${id}/statement`);
  if (!res.ok) throw new Error("Failed to fetch statement");
  return res.json();
};

export default function CompanyStatementPage() {
  const { id } = useParams();

  const { data: statement, isLoading, isError } = useQuery({
    queryKey: ["company-statement", id],
    queryFn: () => fetchStatement(id),
    enabled: !!id,
  });

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/30 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
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
            <p className="text-gray-600">Unable to load statement. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { name, purchases, totals } = statement;

  return (
    <div className="min-h-screen bg-gray-50/30 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <Link href={`/dashboard/companies/${id}`}>
            <Button variant="ghost" className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              Back to Company
            </Button>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Company Statement</h1>
              <p className="text-gray-600 mt-1">{name}</p>
            </div>
          </div>
          <div className="flex items-center text-gray-500 text-sm">
            <Calendar className="h-4 w-4 mr-1" />
            Generated {format(new Date(), "EEEE, MMMM d, yyyy")}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button variant="outline" onClick={() => window.print()} className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print
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

        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Purchase History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableCaption>{purchases.length === 0 ? "No purchases on file." : "All purchases from this company"}</TableCaption>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="font-semibold text-gray-700">Date</TableHead>
                    <TableHead className="font-semibold text-gray-700">Product</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Total</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase, index) => (
                    <TableRow key={purchase._id} className={index % 2 === 0 ? "bg-gray-50/30" : ""}>
                      <TableCell className="text-gray-600 text-sm whitespace-nowrap">
                        {format(new Date(purchase.createdAt), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium text-gray-900 whitespace-nowrap">{purchase.productName}</TableCell>
                      <TableCell className="text-right font-medium text-gray-900 whitespace-nowrap">${purchase.total.toFixed(3)}</TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <Badge className={purchase.paid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {purchase.paid ? "Paid" : "Unpaid"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 mt-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Purchased</span>
              <span className="font-medium text-gray-900">${totals.totalPurchased.toFixed(3)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-gray-600">Total Paid</span>
              <span className="text-green-600 font-medium">${totals.totalPaid.toFixed(3)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-semibold text-gray-900">Total Owed</span>
              <span className={`font-semibold ${totals.totalOwed > 0 ? "text-red-600" : "text-gray-900"}`}>
                ${totals.totalOwed.toFixed(3)}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="mt-12 pt-6 border-t border-gray-200 text-center">
          <p className="text-gray-500 text-sm">Order management system • Powered by Ahmad Daher</p>
        </div>
      </div>
    </div>
  );
}
