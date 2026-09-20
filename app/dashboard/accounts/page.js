"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { Landmark, Plus, Loader2, Wallet, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";

const EMPTY_FORM = { name: "", type: "cash", openingBalance: "0", notes: "" };

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: me } = useQuery({
    queryKey: ["admin", "me"],
    queryFn: async () => (await axios.get("/api/admin/me")).data,
  });
  const isOwner = me?.role === "owner";

  const { data, isLoading, error } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => (await axios.get("/api/accounts")).data,
  });

  const accounts = data?.accounts || [];
  const totalBalance = data?.totalBalance || 0;

  const createMutation = useMutation({
    mutationFn: async (payload) => (await axios.post("/api/accounts", payload)).data,
    onSuccess: () => {
      toast.success("Account created successfully");
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed to create account"),
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Account name is required");
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-emerald-100 rounded-lg shrink-0">
                <Landmark className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Accounts</h1>
                <p className="text-gray-600 text-sm sm:text-base truncate">
                  Cash and bank balances, computed from real transactions
                </p>
              </div>
            </div>

            {isOwner && (
              <Button
                onClick={() => setCreateOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2 shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Account</span>
              </Button>
            )}
          </div>
        </div>

        <Card className="shadow-sm border-gray-200 mb-6">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Total Across All Accounts</span>
            <span className={`text-xl font-bold ${totalBalance < 0 ? "text-red-600" : "text-emerald-700"}`}>
              ${totalBalance.toLocaleString()}
            </span>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="pt-6 text-center text-red-500">Failed to load accounts.</CardContent>
          </Card>
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Landmark className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-lg mb-2">No accounts yet</p>
              {isOwner && (
                <Button variant="outline" onClick={() => setCreateOpen(true)}>
                  Add your first account
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <Link key={account._id} href={`/dashboard/accounts/${account._id}`}>
                <Card className="shadow-sm border-gray-200 hover:border-emerald-300 transition-colors h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 min-w-0">
                        {account.type === "bank" ? (
                          <Landmark className="h-4 w-4 text-blue-600 shrink-0" />
                        ) : (
                          <Banknote className="h-4 w-4 text-emerald-600 shrink-0" />
                        )}
                        <span className="truncate">{account.name}</span>
                      </span>
                      {!account.active && <Badge variant="outline">Inactive</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${account.balance < 0 ? "text-red-600" : "text-gray-900"}`}>
                      ${account.balance.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 capitalize">{account.type} account</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Account" maxWidth="max-w-md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="acct-name">Account Name *</Label>
            <Input
              id="acct-name"
              placeholder="e.g. Main Cash Drawer, Bank of Beirut"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="acct-type">Type</Label>
            <select
              id="acct-type"
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="acct-opening">Opening Balance ($)</Label>
            <Input
              id="acct-opening"
              inputMode="decimal"
              placeholder="0.00"
              value={form.openingBalance}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, openingBalance: e.target.value.replace(/[^0-9.-]/g, "") }))
              }
            />
            <p className="text-xs text-gray-500">
              The real balance this account holds today, before any transactions are recorded through this app.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="acct-notes">Notes (optional)</Label>
            <Input
              id="acct-notes"
              placeholder="e.g. Account number, branch"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {createMutation.isPending ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </span>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
