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
// (or more with "Copies"), either laid out on A4 sticker sheets or one label
// per page for thermal label printers (40x30, 50x30, 50x25, 58x40 mm or a
// custom size). Products without a barcode are listed so they can be fixed.
const SIZES = [
  { key: "a4", label: "A4 sheet (3 per row)" },
  { key: "40x30", w: 40, h: 30 },
  { key: "50x30", w: 50, h: 30 },
  { key: "50x25", w: 50, h: 25 },
  { key: "58x40", w: 58, h: 40 },
  { key: "custom", label: "Custom size" },
];
const SIZE_KEY = "invento.labelSize";
function readSaved() {
  try {
    return JSON.parse(localStorage.getItem(SIZE_KEY) || "null");
  } catch {
    return null;
  }
}
function BarcodeSvg({ code, height = 42, fontSize = 12, width = 1.6, className = "mx-auto max-w-full" }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, code, { format: "CODE128", width, height, fontSize, margin: 0, displayValue: true });
    } catch {}
  }, [code, height, fontSize, width]);
  return <svg ref={ref} className={className} />;
}

function Labels() {
  const t = useT();
  const router = useRouter();
  const ids = (useSearchParams().get("ids") || "").split(",").filter(Boolean);
  const [copies, setCopies] = useState(1);
  const [size, setSize] = useState("a4");
  const [custom, setCustom] = useState({ w: 50, h: 30 });
  useEffect(() => {
    const saved = readSaved();
    if (saved?.size) setSize(saved.size);
    if (saved?.custom) setCustom(saved.custom);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(SIZE_KEY, JSON.stringify({ size, custom }));
    } catch {}
  }, [size, custom]);
  const preset = SIZES.find((x) => x.key === size) || SIZES[0];
  const thermal = size !== "a4";
  const dim = size === "custom" ? { w: Math.max(20, Math.min(120, Number(custom.w) || 50)), h: Math.max(15, Math.min(120, Number(custom.h) || 30)) } : { w: preset.w, h: preset.h };

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["label-products", ids.join(",")],
    queryFn: async () => (await Promise.all(ids.map((id) => axios.get(`/api/products/${id}`).then((r) => r.data)))).filter(Boolean),
    enabled: ids.length > 0,
  });

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = thermal ? `@page { size: ${dim.w}mm ${dim.h}mm; margin: 0; }` : "@page { size: A4 portrait; margin: 8mm; }";
    document.head.appendChild(style);
    document.body.classList.add("print-doc-page");
    return () => {
      style.remove();
      document.body.classList.remove("print-doc-page");
    };
  }, [thermal, dim.w, dim.h]);

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
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="labelSize" className="text-xs">{t("Label size")}</Label>
            <select id="labelSize" value={size} onChange={(e) => setSize(e.target.value)} className="h-8 rounded-md border border-input bg-transparent px-2 text-sm">
              {SIZES.map((x) => (
                <option key={x.key} value={x.key}>
                  {x.label ? t(x.label) : `${x.w} × ${x.h} mm`}
                </option>
              ))}
            </select>
          </div>
          {size === "custom" && (
            <div className="flex items-end gap-1">
              <Input type="number" min="20" max="120" value={custom.w} onChange={(e) => setCustom((c) => ({ ...c, w: e.target.value }))} className="h-8 w-16" aria-label={t("Width (mm)")} />
              <span className="pb-1.5 text-xs">×</span>
              <Input type="number" min="15" max="120" value={custom.h} onChange={(e) => setCustom((c) => ({ ...c, h: e.target.value }))} className="h-8 w-16" aria-label={t("Height (mm)")} />
              <span className="pb-1.5 text-xs">mm</span>
            </div>
          )}
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

      {thermal ? (
        <>
          <p className="print:hidden mx-4 mt-3 text-xs text-gray-500">
            {t("One label per page. In the print window choose your label printer, paper size {0} × {1} mm, margins none, scale 100%.", { 0: dim.w, 1: dim.h })}
          </p>
          <div className="flex flex-wrap gap-3 p-4 print:block print:p-0">
            {labels.map(({ p, key }) => (
              <div
                key={key}
                className="thermal-label flex flex-col items-center justify-center overflow-hidden border border-dashed border-gray-300 text-center print:border-0"
                style={{ width: `${dim.w}mm`, height: `${dim.h}mm`, padding: "1.5mm", breakAfter: "page", pageBreakAfter: "always" }}
              >
                <p className="w-full truncate font-semibold leading-tight" style={{ fontSize: dim.h < 28 ? "7pt" : "8pt" }}>{p.name}</p>
                <p className="font-bold leading-tight" style={{ fontSize: dim.h < 28 ? "8pt" : "10pt" }}>${Number(p.price || 0).toFixed(2)}</p>
                <BarcodeSvg code={p.barcode} height={Math.max(18, Math.round(dim.h * 1.15))} fontSize={dim.h < 28 ? 9 : 11} width={dim.w < 45 ? 1.2 : 1.5} className="max-h-full max-w-full" />
              </div>
            ))}
          </div>
        </>
      ) : (
      <div className="grid grid-cols-3 gap-[3mm] p-4 print:p-0">
        {labels.map(({ p, key }) => (
          <div key={key} className="break-inside-avoid rounded border border-dashed border-gray-300 p-[3mm] text-center print:border-gray-200">
            <p className="truncate text-[11px] font-semibold leading-tight">{p.name}</p>
            <p className="text-[11px] leading-tight">${Number(p.price || 0).toFixed(2)}</p>
            <BarcodeSvg code={p.barcode} />
          </div>
        ))}
      </div>
      )}
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
