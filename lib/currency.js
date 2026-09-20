// Shared helpers for showing a Lebanese Lira equivalent alongside the $
// figures the app is built around. The LL rate itself lives in AppSettings
// (see models/AppSettings.js, app/api/settings/business/route.js) and is
// fetched with useSettings() below wherever it's needed.
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export function useSettings() {
  return useQuery({
    queryKey: ["settings", "business"],
    queryFn: async () => (await axios.get("/api/settings/business")).data,
    staleTime: 60_000,
  });
}

// Formats a $ amount as its LL equivalent, e.g. formatLL(12.5, 90000) ->
// "1,125,000 LL". LL has no meaningful sub-unit here, so it's rounded to
// the nearest whole Lira.
export function formatLL(usdAmount, rate) {
  const amount = Number(usdAmount) || 0;
  const safeRate = Number(rate) || 0;
  return `${Math.round(amount * safeRate).toLocaleString()} LL`;
}
