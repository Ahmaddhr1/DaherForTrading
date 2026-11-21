"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ListSkeleton } from "@/components/ui/skeleton-patterns";
import { Plus, Repeat, Trash2, Edit, Loader2, Pause, Play } from "lucide-react";
import { useHasPermission } from "@/lib/useHasPermission";

const CATEGORY_OPTIONS = ["Salaries", "Rent", "Utilities", "Maintenance", "Transport", "Other"];
const EMPTY_FORM = { description: "", amount: "", category: "Other", dayOfMonth: "1" };

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export default function RecurringDisbursementsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const queryClient = useQueryClient();
  const { hasPermission: canManageDisbursements } = useHasPermission("canManageDisbursements");

  const { data, isLoading } = useQuery({
    queryKey: ["recurring-disbursements"],
    queryFn: async () => (await axios.get("/api/recurring-disbursements")).data,
  });
  const templates = data?.templates || [];

  const invalidate = () => queryClient.invalidateQueries(["recurring-disbursements"]);

  const createMutation = useMutation({
    mutationFn: async (payload) => (await axios.post("/api/recurring-disbursements", payload)).data,
    onSuccess: () => {
      toast.success("Recurring disbursement created");
      setModalOpen(false);
      setForm(EMPTY_FORM);
      invalidate();
    },
    onError: (error) => toast.error(error.response?.data?.error || "Failed to create"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => (await axios.patch(`/api/recurring-disbursements/${id}`, payload)).data,
    onSuccess: () => {
      toast.success("Updated");
      setEditTarget(null);
      invalidate();
    },
    onError: (error) => toast.error(error.response?.data?.error || "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => (await axios.delete(`/api/recurring-disbursements/${id}`)).data,
    onSuccess: () => {
      toast.success("Deleted");
      setDeleteTarget(null);
      invalidate();
    },
    onError: () => toast.error("Failed to delete"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.description.trim()) return toast.error("Description is required");
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error("Enter a valid amount");
    createMutation.mutate(form);
  };

  const openEdit = (template) => {
    setEditTarget(template);
    setForm({
      description: template.description,
      amount: template.amount.toString(),
      category: template.category,
      dayOfMonth: template.dayOfMonth.toString(),
    });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!form.description.trim()) return toast.error("Description is required");
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error("Enter a valid amount");
    updateMutation.mutate({ id: editTarget._id, ...form });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Repeat className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                Recurring Disbursements
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                Auto-create rent, salaries, and other regular expenses each month
              </p>
            </div>
          </div>
          {canManageDisbursements && (
            <Button
              onClick={() => {
                setForm(EMPTY_FORM);
                setModalOpen(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Recurring</span>
            </Button>
          )}
        </div>

        {isLoading ? (
          <ListSkeleton rows={4} rowHeight="h-16" />
        ) : templates.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <Repeat className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
            <p className="text-lg">No recurring disbursements set up yet</p>
          </div>
        ) : (
          <Card className="shadow-sm border-gray-200 dark:border-gray-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Amount</TableHead>
                  <TableHead className="text-center">Runs On</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((tpl) => (
                  <TableRow key={tpl._id}>
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">{tpl.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{tpl.category}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold text-red-600">
                      -${tpl.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center text-gray-600 dark:text-gray-400">
                      {ordinal(tpl.dayOfMonth)} of the month
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={tpl.active ? "default" : "outline"}>
                        {tpl.active ? "Active" : "Paused"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canManageDisbursements ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateMutation.mutate({ id: tpl._id, active: !tpl.active })}
                            title={tpl.active ? "Pause" : "Resume"}
                          >
                            {tpl.active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEdit(tpl)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(tpl)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">View only</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Recurring Disbursement"
        description="Automatically creates a real disbursement on this day every month"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <RecurringForm form={form} setForm={setForm} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Recurring Disbursement"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <RecurringForm form={form} setForm={setForm} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete recurring disbursement?"
        description={`"${deleteTarget?.description}" will no longer auto-create. Disbursements it already created stay in your history.`}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function RecurringForm({ form, setForm }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="rd-description">Description</Label>
        <Input
          id="rd-description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="e.g. Office rent"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="rd-amount">Amount ($)</Label>
          <Input
            id="rd-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rd-day">Day of Month</Label>
          <Input
            id="rd-day"
            type="number"
            min="1"
            max="28"
            value={form.dayOfMonth}
            onChange={(e) => setForm((f) => ({ ...f, dayOfMonth: e.target.value }))}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rd-category">Category</Label>
        <select
          id="rd-category"
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          className="w-full border rounded-md text-sm px-2 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </>
  );
}
