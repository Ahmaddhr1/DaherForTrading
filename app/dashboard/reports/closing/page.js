"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Calculator, Printer, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n/LangProvider";
import { format } from "@/lib/i18n/date";
import { getTodayDateString, localDayStartISO, localDayEndISO } from "@/lib/dateUtils";
import ClosingDoc from "@/components/closing/ClosingDoc";

export const fetchClosing = async (day) =>
  (await axios.get("/api/reports/closing", { params: { start: localDayStartISO(day), end: localDayEndISO(day) } })).data;

// End-of-day cash closing: what came in and went out today, what should be
// in the cash drawer (opening cash + net cash) vs what was counted, with
// print (A4) and WhatsApp share.
function ClosingPage() {
  const t = useT();
  const router = useRouter();
  const search = useSearchParams();
  const [day, setDay] = useState(search.get("date") || getTodayDateString());
  const [opening, setOpening] = useState(search.get("opening") || "");
  const [counted, setCounted] = useState(search.get("counted") || "");

  // Remember the opening cash per day on this device.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`closing-opening-${day}`);
      if (saved !== null && !search.get("opening")) setOpening(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);
  useEffect(() => {
    try {
      localStorage.setItem(`closing-opening-${day}`, opening);
    } catch {}
  }, [day, opening]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["daily-closing", day],
    queryFn: () => fetchClosing(day),
    enabled: !!day,
  });

  const dayDate = new Date(`${day}T00:00:00`);
  const expected = (Number(opening) || 0) + (data?.netCash || 0);

  const handlePrint = () => {
    const qs = new URLSearchParams({ date: day, opening: opening || "0" });
    if (counted !== "") qs.set("counted", counted);
    router.push(`/print/closing?${qs.toString()}`);
  };

  const handleShare = () => {
    if (!data) return;
    const m = (n) => `$${Number(n || 0).toFixed(2)}`;
    const lines = [
      `Invento - ${t("Daily Closing")} ${format(dayDate, "MMM d, yyyy")}`,
      `${t("Orders today")}: ${data.sales.count} (${m(data.sales.total)})`,
      `${t("Collected from customers")}: ${m(data.collected)}`,
      `${t("Paid to suppliers")}: ${m(data.paidToSuppliers)}`,
      `${t("Expenses")}: ${m(data.expensesTotal)}`,
      `${t("Net cash today")}: ${m(data.netCash)}`,
      `${t("Opening cash")}: ${m(opening)}`,
      `${t("Should be in the drawer")}: ${m(expected)}`,
      ...(counted !== "" ? [`${t("Counted")}: ${m(counted)}`, `${t("Difference")}: ${m(Number(counted) - expected)}`] : []),
      `${t("We owe suppliers")}: ${m(data.owedToSuppliers)}`,
      `${t("Customers owe us")}: ${m(data.owedByCustomers)}`,
    ];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Calculator className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{t("Daily Closing")}</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">{t("Money in and out for the day, and what should be in the drawer")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} disabled={!data} className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              {t("Print")}
            </Button>
            <Button onClick={handleShare} disabled={!data} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white">
              <MessageCircle className="h-4 w-4" />
              {t("Share via WhatsApp")}
            </Button>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="space-y-1">
            <Label htmlFor="closing-day">{t("Day")}</Label>
            <Input id="closing-day" type="date" value={day} max={getTodayDateString()} onChange={(e) => e.target.value && setDay(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="closing-opening">{t("Opening cash ($)")}</Label>
            <Input id="closing-opening" type="number" min="0" step="0.01" placeholder="0" value={opening} onChange={(e) => setOpening(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="closing-counted">{t("Counted in drawer ($)")}</Label>
            <Input id="closing-counted" type="number" min="0" step="0.01" placeholder={t("Count at closing")} value={counted} onChange={(e) => setCounted(e.target.value)} />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : isError ? (
          <p className="text-center text-red-600 py-10">{t("Failed to load")}</p>
        ) : (
          <div className="rounded-lg bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-800">
            <ClosingDoc data={data} day={dayDate} opening={opening} counted={counted} />
          </div>
        )}
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {t("Amounts are in $; LL shows the equivalent at today's rate.")}
        </p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ClosingPage />
    </Suspense>
  );
}
