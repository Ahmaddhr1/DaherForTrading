"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useT } from "@/core/shared/i18n/LangProvider";
import { toast } from "@/core/shared/i18n/toast";
import { useAnyPermission } from "@/modules/ui/lists";

const STYLES = {
  in_stock: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  sold: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  returned: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  defective: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};
export const STATUS_LABELS = { in_stock: "In stock", sold: "Sold", returned: "Returned", defective: "Defective" };

export function StatusBadge({ status }) {
  const t = useT();
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status] || ""}`}>{t(STATUS_LABELS[status] || status)}</span>;
}

const NEXT = { sold: ["returned", "defective"], returned: ["in_stock", "defective"], defective: ["in_stock"], in_stock: ["defective"] };
const ACTION = { returned: "Mark returned", in_stock: "Back in stock", defective: "Mark defective" };

export function UnitActions({ unit }) {
  const t = useT();
  const qc = useQueryClient();
  const allowed = useAnyPermission(["canEditProducts", "canProcessReturns"]);
  const m = useMutation({
    mutationFn: async (status) => (await axios.put(`/api/modules/serials/${unit._id}`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["serials"] }),
    onError: (e) => toast.error(e.response?.data?.error || "Couldn't update the unit"),
  });
  if (!allowed) return null;
  return (
    <select
      value=""
      disabled={m.isPending}
      onChange={(e) => e.target.value && m.mutate(e.target.value)}
      className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs dark:bg-input/30"
      aria-label={t("Change status")}
    >
      <option value="">{t("Change…")}</option>
      {(NEXT[unit.status] || []).map((s) => (
        <option key={s} value={s}>
          {t(ACTION[s])}
        </option>
      ))}
    </select>
  );
}
