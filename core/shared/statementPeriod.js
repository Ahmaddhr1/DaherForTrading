import { format } from "@/core/shared/i18n/date";
import { t as translate } from "@/core/shared/i18n";
import { localDayStartISO, localDayEndISO } from "@/core/shared/dateUtils";

// Statement date range helpers shared by the dashboard statement pages and
// their print views. `from` / `to` are yyyy-mm-dd strings (blank = open).
export function statementApiQuery(from, to) {
  const params = new URLSearchParams();
  if (from) params.set("startDate", localDayStartISO(from));
  if (to) params.set("endDate", localDayEndISO(to));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function statementPrintQuery(from, to) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function statementPeriodLabel(from, to) {
  if (!from && !to) return translate("All Time");
  const start = from ? format(new Date(from), "MMM d, yyyy") : "the start";
  const end = to ? format(new Date(to), "MMM d, yyyy") : "today";
  return `${start} - ${end}`;
}
