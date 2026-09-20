"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Landmark, Banknote, Loader2, ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AccountDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ name: "", type: "cash", openingBalance: "0", notes: "", active: true });

  const { data: me } = useQuery({
    queryKey: ["admin", "me"],
    queryFn: async () => (await axios.get("/api/admin/me")).data,
  });
  const isOwner = me?.role === "owner";

  const { data: account, isLoading, error } = useQuery({
    queryKey: ["account", id],
    queryFn: async () => (await axios.get(`/api/accounts/${id}`)).data,
    enabled: !!id,
  });

  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ["account-ledger", id, page],
    queryFn: async () => (await axios.get(`/api/accounts/${id}/ledger`, { params: { page, limit: 20 } })).data,
    enabled: !!id,
  });

  useEffect(() => {
    if (account) {
      setForm({
        name: account.name || "",
        type: account.type || "cash",
        openingBalance: account.openingBalance?.toString() || "0",
        notes: account.notes || "",
        active: account.active !== false,
      });
    }
  }, [account]);

  const updateMutation = useMutation({
    mutationFn: async (payload) => (await axios.patch(`/api/accounts/${id}`, payload)).data,
    onSuccess: () => {
      toast.success("Account updated");
      queryClient.invalidateQueries({ queryKey: ["account", id] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed to update account"),
  });

  const handleSave = (e) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  const entries = ledgerData?.entries || [];
  const totalPages = ledgerData?.totalPages || 1;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/30 py-8">
        <div className="container mx-auto px-4 max-w-4xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="min-h-screen bg-gray-50/30 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card>
            <CardContent className="pt-6 text-center text-red-500">Account not found.</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/accounts")}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Accounts
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-100 rounded-lg">
            {account.type === "bank" ? (
              <Landmark className="h-6 w-6 text-blue-600" />
            ) : (
              <Banknote className="h-6 w-6 text-emerald-600" />
            )}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              {account.name}
              {!account.active && <Badge variant="outline">Inactive</Badge>}
            </h1>
            <p className="text-gray-600 text-sm capitalize">{account.type} account</p>
          </div>
        </div>

        <Card className="shadow-sm border-gray-200 mb-6">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Current Balance</span>
            <span className={`text-2xl font-bold ${account.balance < 0 ? "text-red-600" : "text-emerald-700"}`}>
              ${account.balance.toLocaleString()}
            </span>
          </CardContent>
        </Card>

        {isOwner && (
          <Card className="shadow-sm border-gray-200 mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Edit Account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <select
                      id="type"
                      value={form.type}
                      onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:border-emerald-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="bank">Bank</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openingBalance">Opening Balance ($)</Label>
                  <Input
                    id="openingBalance"
                    inputMode="decimal"
                    value={form.openingBalance}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, openingBalance: e.target.value.replace(/[^0-9.-]/g, "") }))
                    }
                  />
                  <p className="text-xs text-gray-500">
                    Adjust this if the account&apos;s real starting balance changes or needs reconciling.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="active"
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="active" className="text-sm font-medium">
                    Active (shows up as an option when recording transactions)
                  </Label>
                </div>

                <Separator />

                <Button type="submit" disabled={updateMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                  {updateMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {ledgerLoading ? (
              <Skeleton className="h-48 w-full rounded-lg" />
            ) : entries.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No transactions recorded for this account yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={`${entry.type}-${entry._id}`}>
                        <TableCell className="flex items-center gap-2">
                          {entry.amount >= 0 ? (
                            <ArrowUpCircle className="h-4 w-4 text-green-600 shrink-0" />
                          ) : (
                            <ArrowDownCircle className="h-4 w-4 text-red-600 shrink-0" />
                          )}
                          {entry.label}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${entry.amount >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {entry.amount >= 0 ? "+" : ""}
                          ${entry.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {format(new Date(entry.createdAt), "MMM d, yyyy HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <Button onClick={() => setPage((p) => p - 1)} disabled={page === 1} variant="outline" size="sm">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                  variant="outline"
                  size="sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
