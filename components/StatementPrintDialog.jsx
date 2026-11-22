"use client";

import { useEffect, useRef, useState } from "react";
import { Printer, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/LangProvider";

// Print preview for an A4 statement, on the same page: the statement is
// shown in a window (its print page, embedded) and "Print" opens the system
// print dialog for just that document, where any printer can be chosen.
export default function StatementPrintDialog({ open, onClose, src }) {
  const t = useT();
  const frameRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReady(false);
    const onMessage = (e) => {
      if (e.origin === window.location.origin && e.data?.type === "print-doc-ready") setReady(true);
    };
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("message", onMessage);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  const embedSrc = `${src}${src.includes("?") ? "&" : "?"}embed=1`;

  const print = () => {
    const w = frameRef.current?.contentWindow;
    if (!w) return;
    w.focus();
    w.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t("Print statement")}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t("Print statement")}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("Choose the printer in the next window.")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={print} disabled={!ready} className="flex items-center gap-2" data-keep-label>
              {ready ? <Printer className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
              {ready ? t("Print") : t("Preparing document...")}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("Close")}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <iframe ref={frameRef} src={embedSrc} title={t("Print statement")} className="w-full flex-1 bg-gray-100" />
      </div>
    </div>
  );
}
