"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ArrowLeft, AlertCircle, ExternalLink, History, User, Clock, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton-patterns";
import { ChangesTable } from "@/components/audit/ChangesTable";
import { describeAction, actionKind, entityHref } from "@/lib/auditFields";

const KIND_BADGE = {
  create: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  delete: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  change: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
};

export default function ActivityEntryPage() {
  const t = useT();
  const { id } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["activity-entry", id],
    queryFn: async () => (await axios.get(`/api/activity/${id}`)).data,
    enabled: !!id,
  });

  const entry = data?.entry;
  const related = data?.related || [];
  const kind = entry ? actionKind(entry.action) : "change";
  const href = entry ? entityHref(entry) : null;
  const changes = entry?.changes || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="container mx-auto px-4 max-w-5xl">
        <Link
          href="/dashboard/activity"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("Back to Activity Log")}
        </Link>

        {isLoading && <TableSkeleton rows={6} cols={3} />}

        {error && !isLoading && (
          <Card>
            <CardContent className="pt-6 text-center text-red-600 flex flex-col items-center gap-2">
              <AlertCircle className="h-8 w-8" />
              {error.response?.status === 404 ? t("This activity entry no longer exists.") : t("Failed to load this activity entry.")}
            </CardContent>
          </Card>
        )}

        {entry && (
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
                <History className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${KIND_BADGE[kind]}`}>
                    {describeAction(entry.action)}
                  </span>
                  <Badge variant="outline">{entry.entityType}</Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 break-words">
                  {entry.entityLabel || describeAction(entry.action)}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    {entry.adminName}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                  {href && (
                    <Link href={href} className="inline-flex items-center gap-1.5 text-blue-600 hover:underline">
                      <ExternalLink className="h-4 w-4" />
                      {t("Open")} {entry.entityType.toLowerCase()}
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("Summary")}</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700 dark:text-gray-300">{entry.summary}</CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {kind === "create" ? t("Values set") : kind === "delete" ? t("Values removed") : t("What changed")}
                  {changes.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      {changes.length} {changes.length === 1 ? t("field") : t("fields")}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {changes.length > 0 ? (
                  <ChangesTable changes={changes} kind={kind} />
                ) : (
                  <div className="flex items-start gap-3 rounded-lg bg-gray-50 dark:bg-gray-900/60 p-4 text-sm text-gray-600 dark:text-gray-400">
                    <Info className="h-5 w-5 shrink-0 mt-0.5" />
                    <p>
                      {t(
                        "No field-level details for this entry - it was recorded before detailed change tracking was added, so only the summary above is available."
                      )}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {related.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t("Other activity on this")} {entry.entityType.toLowerCase()}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {related.map((item) => (
                      <li key={item._id}>
                        <Link
                          href={`/dashboard/activity/${item._id}`}
                          className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/60"
                        >
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap sm:w-44">
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                          <span className="text-sm font-medium sm:w-28">{item.adminName}</span>
                          <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 min-w-0 truncate">
                            {item.summary}
                          </span>
                          {item.changeCount > 0 && (
                            <span className="text-xs text-blue-600 whitespace-nowrap">
                              {item.changeCount} {item.changeCount === 1 ? t("change") : t("changes")}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
