"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import JsBarcode from "jsbarcode";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/core/shared/i18n/LangProvider";

// Printable barcode labels: /print/labels?ids=a,b,c - one label per product
// (or more with "Copies"), laid out on A4 sheets. Products without a
// barcode are listed so they can be fixed.
function BarcodeSvg({ code }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, code, { format: "CODE128", width: 1.6, height: 42, fontSize: 12, margin: 0, displayValue: true });
    } catch {}
  }, [code]);
  return <svg ref={ref} className="mx-auto max-w-full" />;
}

function Labels() {
  const t = useT();
  const router = useRouter();
  const ids = (useSearchParams().get("ids") || "").split(",").filter(Boolean);
  const [copies, setCopies] = useState(1);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["label-products", ids.join(",")],
    queryFn: async () => (await Promise.all(ids.map((id) => axios.get(`/api/products/${id}`).then((r) => r.data)))).filter(Boolean),
    enabled: ids.length > 0,
  });

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = "@page { size: A4 portrait; margin: 8mm; }";
    document.head.appendChild(style);
    document.body.classList.add("print-doc-page");
    return () => {
      style.remove();
      document.body.classList.remove("print-doc-page");
    };
  }, []);

  const withCode = products.filter((p) => p.barcode);
  const missing = products.filter((p) => !p.barcode);
  const labels = withCode.flatMap((p) => Array.from({ length: Math.max(1, Math.min(100, copies)) }, (_, i) => ({ p, key: `${p._id}-${i}` })));

  return (
    <div className="force-light min-h-screen bg-white text-gray-900">
      <div className="print:hidden sticky top-0 z-10 flex flex-wrap items-end justify-between gap-3 border-b bg-white p-3">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="flex items-center gap-1" data-keep-label>
          <ArrowLeft className="rtl-flip h-4 w-4" />
          {t("Back")}
        </Button>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="copies" className="text-xs">{t("Copies of each")}</Label>
            <Input id="copies" type="number" min="1" max="100" value={copies} onChange={(e) => setCopies(parseInt(e.target.value, 10) || 1)} className="h-8 w-20" />
          </div>
          <Button size="sm" onClick={() => window.print()} disabled={!labels.length} className="flex items-center gap-1" data-keep-label>
            <Printer className="h-4 w-4" />
            {t("Print")}
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center p-10 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {missing.length > 0 && (
        <p className="print:hidden mx-4 mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("No barcode yet (not printed):")} {missing.map((p) => p.name).join(", ")}
        </p>
      )}

      <div className="grid grid-cols-3 gap-[3mm] p-4 print:p-0">
        {labels.map(({ p, key }) => (
          <div key={key} className="break-inside-avoid rounded border border-dashed border-gray-300 p-[3mm] text-center print:border-gray-200">
            <p className="truncate text-[11px] font-semibold leading-tight">{p.name}</p>
            <p className="text-[11px] leading-tight">${Number(p.price || 0).toFixed(2)}</p>
            <BarcodeSvg code={p.barcode} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LabelsPage() {
  return (
    <Suspense>
      <Labels />
    </Suspense>
  );
}
