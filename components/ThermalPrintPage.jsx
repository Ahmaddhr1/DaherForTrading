"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/core/shared/i18n/LangProvider";
import { applyThermalPageSize, clearThermalPageSize } from "@/core/printing/thermalPageSize";

// Dedicated page that shows ONLY a thermal receipt and prints it. Used on
// phones/tablets: there, window.print() returns immediately and the
// "afterprint" event can fire before the print preview is captured, so the
// in-page approach (toggle a body class, print, remove the class) ends up
// printing the whole page. Here the receipt-only state is permanent, so
// whenever the print dialog captures the page it gets the receipt.
//
// variant="document" is the same idea for full-page documents (account and
// company statements): the page shows only the document, always in its light
// design, with Back / Print on top (not printed). Used on every device.
// embed: shown inside the statement print preview (no toolbar, no auto
// print; tells the parent window when the document is ready).
export default function ThermalPrintPage({ queryKey, fetchUrl, backHref, children, variant = "thermal", embed = false }) {
  const isDocument = variant === "document";
  const t = useT();
  const router = useRouter();
  const printedRef = useRef(false);

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  // Receipt-only mode for as long as this page is open.
  useEffect(() => {
    const classes = isDocument ? ["print-doc-page"] : ["printing-thermal", "thermal-page"];
    document.body.classList.add(...classes);
    return () => {
      document.body.classList.remove(...classes);
      if (!isDocument) clearThermalPageSize();
    };
  }, [isDocument]);

  // Open the print dialog once, after the receipt has rendered.
  useEffect(() => {
    if (!data || printedRef.current) return;
    printedRef.current = true;
    if (embed) {
      const ready = setTimeout(async () => {
        try {
          await document.fonts?.ready;
        } catch {}
        window.parent?.postMessage({ type: "print-doc-ready" }, window.location.origin);
      }, 300);
      return () => clearTimeout(ready);
    }
    const timer = setTimeout(async () => {
      try {
        await document.fonts?.ready;
      } catch {}
      if (!isDocument) applyThermalPageSize({ keep: true });
      window.print();
    }, 600);
    return () => clearTimeout(timer);
  }, [data]);

  return (
    <>
      <div data-embed={embed} className="thermal-toolbar force-light print:hidden sticky top-0 z-10 flex items-center data-[embed=true]:hidden justify-between gap-2 p-3 border-b bg-white text-gray-900">
        <Button variant="outline" size="sm" onClick={() => router.push(backHref)} className="flex items-center gap-1">
          <ArrowLeft className="rtl-flip h-4 w-4" />
          {t("Back")}
        </Button>
        <Button size="sm" onClick={() => { if (!isDocument) applyThermalPageSize({ keep: true }); window.print(); }} disabled={!data} className="flex items-center gap-1">
          <Printer className="h-4 w-4" />
          {t("Print")}
        </Button>
      </div>
      {isLoading && (
        <div className="flex justify-center p-10 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {isError && <p className="p-6 text-center text-red-600">{t("Failed to load")}</p>}
      {data &&
        (isDocument ? (
          <div className="force-light min-h-screen bg-white">
            <div className="container mx-auto px-4 py-8">{children(data)}</div>
          </div>
        ) : (
          children(data)
        ))}
    </>
  );
}
