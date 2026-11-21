"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { History, ChevronLeft, ChevronRight, AlertCircle, Trash2, Search } from "lucide-react";
import { toast } from "@/lib/i18n/toast";
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
import { DateRangeFilter } from "@/app/dashboard/orders/components/DateRangeFilter";
import { getTodayDateString, localDayStartISO, localDayEndISO } from "@/lib/dateUtils";
import { AUDIT_ENTITY_TYPES, describeAction, actionKind } from "@/lib/auditFields";
import { ChangePreview } from "@/components/audit/ChangesTable";

const KIND_DOT = {
  create: "bg-green-500",
  delete: "bg-red-500",
  change: "bg-blue-500",
};

const ENTITY_TYPES = AUDIT_ENTITY_TYPES;

export default function ActivityPage() {
  const t = useT();
  const [page, setPage] = useState(1);
  const [adminFilter, setAdminFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [clearOpen, setClearOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const router = useRouter();

  // Debounce the search box so each keystroke doesn't refetch.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);
  // Stays false until the user actually touches a filter. While false, the
  // log is scoped to today behind the scenes (effectiveStartDate/EndDate
  // below) without the date boxes themselves showing a value.
  const [hasInteracted, setHasInteracted] = useState(false);
  const limit = 20;
  const queryClient = useQueryClient();

  // Searching looks across all dates unless a range was picked explicitly.
  const scopedToToday = !hasInteracted && !search;
  const effectiveStartDate = scopedToToday ? getTodayDateString() : startDate;
  const effectiveEndDate = scopedToToday ? getTodayDateString() : endDate;

  const { data, isLoading, error } = useQuery({
    queryKey: ["activity", page, adminFilter, entityTypeFilter, effectiveStartDate, effectiveEndDate, search],
    queryFn: async () => {
      const response = await axios.get("/api/activity", {
        params: {
          page,
          limit,
          admin: adminFilter,
          entityType: entityTypeFilter,
          search,
          startDate: effectiveStartDate ? localDayStartISO(effectiveStartDate) : undefined,
          endDate: effectiveEndDate ? localDayEndISO(effectiveEndDate) : undefined,
        },
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
      toast.success(t("Cleared {0} activity log {1}", {
        0: result.deletedCount,
        1: result.deletedCount === 1 ? "entry" : "entries"
      }));
      setClearOpen(false);
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to clear the activity log");
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <History className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{t("Activity Log")}</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                {t(
                  "Who changed what, exactly - open any entry to see previous vs current values"
                )}
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
              {t("Clear All Logs")}
            </Button>
          )}
        </div>

        <Modal
          open={clearOpen}
          onClose={() => !clearMutation.isPending && setClearOpen(false)}
          title={t("Clear all activity logs?")}
          description={t("This permanently deletes all {0} recorded {1}. This cannot be undone.", {
            0: total,
            1: total === 1 ? "entry" : "entries"
          })}
        >
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setClearOpen(false)}
              disabled={clearMutation.isPending}
            >
              {t("Cancel")}
            </Button>
            <Button
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {clearMutation.isPending ? t("Clearing...") : t("Yes, clear everything")}
            </Button>
          </div>
        </Modal>

        {scopedToToday && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {t("Showing today's activity only. Pick a date range below to see more.")}
          </p>
        )}

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 mb-6">
          <div className="relative w-full sm:w-72">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("Search product, customer, field...")}
              className="border-input h-9 w-full rounded-md border bg-transparent ps-9 pe-3 text-sm shadow-xs"
            />
          </div>
          <select
            value={adminFilter}
            onChange={(e) => {
              setHasInteracted(true);
              setAdminFilter(e.target.value);
              setPage(1);
            }}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs w-full sm:w-auto"
          >
            <option value="">{t("All admins")}</option>
            {admins.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={entityTypeFilter}
            onChange={(e) => {
              setHasInteracted(true);
              setEntityTypeFilter(e.target.value);
              setPage(1);
            }}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs w-full sm:w-auto"
          >
            <option value="">{t("All types")}</option>
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={(value) => {
              setHasInteracted(true);
              setStartDate(value);
              setPage(1);
            }}
            onEndDateChange={(value) => {
              setHasInteracted(true);
              setEndDate(value);
              setPage(1);
            }}
          />
        </div>

        {isLoading && <TableSkeleton rows={8} cols={3} />}

        {error && !isLoading && (
          <Card>
            <CardContent className="pt-6 text-center text-red-600 flex flex-col items-center gap-2">
              <AlertCircle className="h-8 w-8" />
              {t("Failed to load the activity log.")}
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && (
          <Card>
            <CardContent className="p-0">
              {entries.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">{t("No activity recorded yet.")}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("When")}</TableHead>
                      <TableHead>{t("Admin")}</TableHead>
                      <TableHead>{t("Type")}</TableHead>
                      <TableHead>{t("Details")}</TableHead>
                      <TableHead className="text-end">{t("Changes")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow
                        key={entry._id}
                        onClick={() => router.push(`/dashboard/activity/${entry._id}`)}
                        className="cursor-pointer align-top"
                      >
                        <TableCell className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {new Date(entry.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">{entry.adminName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${KIND_DOT[actionKind(entry.action)]}`} />
                            <Badge variant="outline">{entry.entityType}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {describeAction(entry.action)}
                          </p>
                        </TableCell>
                        <TableCell className="whitespace-normal max-w-md">
                          {entry.entityLabel && (
                            <p className="font-medium text-gray-900 dark:text-gray-100">{entry.entityLabel}</p>
                          )}
                          <p className="text-gray-700 dark:text-gray-300">{entry.summary}</p>
                          <ChangePreview changes={entry.changes} total={entry.changeCount} />
                        </TableCell>
                        <TableCell className="text-end whitespace-nowrap">
                          <Link
                            href={`/dashboard/activity/${entry._id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {entry.changeCount > 0
                              ? t("View {0} {1}", {
                              0: entry.changeCount,
                              1: entry.changeCount === 1 ? "change" : "changes"
                            })
                              : t("View")}
                          </Link>
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
              <ChevronLeft className="rtl-flip h-4 w-4" />
              {t("Previous")}
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t("Page")} {page} {t("of")} {totalPages}
            </span>
            <Button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {t("Next")}
              <ChevronRight className="rtl-flip h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
