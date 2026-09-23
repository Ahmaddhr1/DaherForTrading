"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { History, ChevronLeft, ChevronRight, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton-patterns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const ENTITY_TYPES = ["Order", "Payment", "Product", "Purchase", "Disbursement", "Customer", "Company"];

export default function ActivityPage() {
  const [page, setPage] = useState(1);
  const [adminFilter, setAdminFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [clearOpen, setClearOpen] = useState(false);
  const limit = 20;
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["activity", page, adminFilter, entityTypeFilter],
    queryFn: async () => {
      const response = await axios.get("/api/activity", {
        params: { page, limit, admin: adminFilter, entityType: entityTypeFilter },
      });
      return response.data;
    },
  });

  const entries = data?.entries || [];
  const totalPages = data?.totalPages || 1;
  const admins = data?.admins || [];
  const total = data?.total || 0;

  const clearMutation = useMutation({
    mutationFn: async () => (await axios.delete("/api/activity")).data,
    onSuccess: (result) => {
      toast.success(`Cleared ${result.deletedCount} activity log ${result.deletedCount === 1 ? "entry" : "entries"}`);
      setClearOpen(false);
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to clear the activity log");
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-8 flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <History className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Activity Log</h1>
              <p className="text-gray-600 text-sm sm:text-base">
                Who did what, across orders, payments, products, and more
              </p>
            </div>
          </div>

          {total > 0 && (
            <Button
              onClick={() => setClearOpen(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Clear All Logs
            </Button>
          )}
        </div>

        <Modal
          open={clearOpen}
          onClose={() => !clearMutation.isPending && setClearOpen(false)}
          title="Clear all activity logs?"
          description={`This permanently deletes all ${total} recorded ${total === 1 ? "entry" : "entries"}. This cannot be undone.`}
        >
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setClearOpen(false)}
              disabled={clearMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {clearMutation.isPending ? "Clearing..." : "Yes, clear everything"}
            </Button>
          </div>
        </Modal>

        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={adminFilter}
            onChange={(e) => {
              setAdminFilter(e.target.value);
              setPage(1);
            }}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs"
          >
            <option value="">All admins</option>
            {admins.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={entityTypeFilter}
            onChange={(e) => {
              setEntityTypeFilter(e.target.value);
              setPage(1);
            }}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs"
          >
            <option value="">All types</option>
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {isLoading && <TableSkeleton rows={8} cols={3} />}

        {error && !isLoading && (
          <Card>
            <CardContent className="pt-6 text-center text-red-600 flex flex-col items-center gap-2">
              <AlertCircle className="h-8 w-8" />
              Failed to load the activity log.
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && (
          <Card>
            <CardContent className="p-0">
              {entries.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No activity recorded yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry._id}>
                        <TableCell className="text-gray-500 whitespace-nowrap">
                          {new Date(entry.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">{entry.adminName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.entityType}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-normal max-w-md">
                          {entry.summary}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
