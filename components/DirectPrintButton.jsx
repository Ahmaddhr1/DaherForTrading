"use client";

import { useEffect, useState } from "react";
import { Printer, Loader2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/i18n/toast";
import { useT } from "@/lib/i18n/LangProvider";
import { isDirectPrintSupported, getSavedPrinter, choosePrinter, printReceiptDirect } from "@/lib/escposPrinter";

// One-click thermal printing on computers (Chrome/Edge): the first time it
// asks which printer to use, then every click prints straight away. Falls
// back to the normal print dialog (`fallback`) when direct printing isn't
// available on this device/browser or fails.
export function useDirectPrint() {
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported(isDirectPrintSupported()), []);
  return supported;
}

export default function DirectPrintButton({ fallback, label = "Print Receipt" }) {
  const t = useT();
  const [port, setPort] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getSavedPrinter().then((p) => alive && setPort(p));
    const refresh = () => getSavedPrinter().then((p) => alive && setPort(p));
    navigator.serial?.addEventListener?.("connect", refresh);
    navigator.serial?.addEventListener?.("disconnect", refresh);
    return () => {
      alive = false;
      navigator.serial?.removeEventListener?.("connect", refresh);
      navigator.serial?.removeEventListener?.("disconnect", refresh);
    };
  }, []);

  const pick = async () => {
    try {
      const p = await choosePrinter();
      setPort(p);
      toast.success("Printer connected");
      return p;
    } catch {
      return null; // closed the picker
    }
  };

  const print = async () => {
    setBusy(true);
    try {
      const p = port || (await pick());
      if (!p) return;
      await printReceiptDirect(p);
      toast.success("Sent to printer");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't reach the printer. Check it's on and paired, or pick it again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button onClick={print} disabled={busy} className="flex items-center gap-2" data-keep-label>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
        {busy ? t("Printing...") : t(label)}
      </Button>
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
          port ? "text-green-700 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${port ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />
        {port ? t("Printer connected") : t("No printer selected")}
      </span>
      <Button variant="ghost" size="sm" onClick={pick} className="text-xs" title={t("Choose printer")} data-keep-label>
        <Settings2 className="h-3.5 w-3.5" />
        {port ? t("Change") : t("Choose printer")}
      </Button>
      {fallback && (
        <Button variant="ghost" size="sm" onClick={fallback} className="text-xs text-gray-500 dark:text-gray-400" data-keep-label>
          {t("Print dialog")}
        </Button>
      )}
    </div>
  );
}
