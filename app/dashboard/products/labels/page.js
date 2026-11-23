"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import axios from "axios";
import { ScanBarcode, Search, Printer, Wand2, Loader2, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/i18n/toast";
import { useT } from "@/lib/i18n/LangProvider";
import { useHasPermission } from "@/lib/useHasPermission";

const PAGE_SIZE = 30;

// Barcode labels, built for phones too: tick products, generate barcodes
// for the ones that have none, and print their labels.
export default function BarcodeLabelsPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const { hasPermission: canEdit } = useHasPermission("canEditProducts");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState({}); // id -> product
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["label-products-list", page, search],
    queryFn: async () => (await axios.get("/api/products/get", { params: { page, limit: PAGE_SIZE, search } })).data,
    placeholderData: keepPreviousData,
  });
  const products = data?.products || [];
  const totalPages = data?.totalPages || 1;

  const selectedList = Object.values(selected);
  const selectedIds = selectedList.map((p) => p._id);
  const missing = selectedList.filter((p) => !p.barcode).length;
  const allOnPage = products.length > 0 && products.every((p) => selected[p._id]);

  const toggle = (p) =>
    setSelected((s) => {
      const next = { ...s };
      if (next[p._id]) delete next[p._id];
      else next[p._id] = p;
      return next;
    });
  const togglePage = () =>
    setSelected((s) => {
      const next = { ...s };
      if (allOnPage) products.forEach((p) => delete next[p._id]);
      else products.forEach((p) => (next[p._id] = p));
      return next;
    });

  const generate = async () => {
    setGenerating(true);
    try {
      const { data: res } = await axios.post("/api/products/barcodes", { productIds: selectedIds });
      if (res.assigned > 0) toast.success(res.assigned === 1 ? t("Generated 1 barcode") : t("Generated {0} barcodes", { 0: res.assigned }));
      else toast.info("All selected products already have barcodes");
      // Refresh the list and the selected products' barcodes.
      const fresh = await queryClient.fetchQuery({
        queryKey: ["label-products-list", page, search, Date.now()],
        queryFn: async () => (await axios.get("/api/products/get", { params: { page, limit: PAGE_SIZE, search } })).data,
      });
      queryClient.invalidateQueries({ queryKey: ["label-products-list"] });
      queryClient.invalidateQueries(["products"]);
      const byId = Object.fromEntries((fresh?.products || []).map((p) => [p._id, p]));
      setSelected((s) => Object.fromEntries(Object.entries(s).map(([id, p]) => [id, byId[id] || { ...p, barcode: p.barcode || "pending" }])));
    } catch {
      toast.error("Couldn't generate barcodes");
    } finally {
      setGenerating(false);
    }
  };

  const printLabels = () => window.open(`/print/labels?ids=${selectedIds.join(",")}`, "_blank");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6 pb-40 lg:pb-6">
      <div className="container mx-auto px-4 max-w-3xl">
        <Link href="/dashboard/products" className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
          <ArrowLeft className="rtl-flip h-4 w-4" />
          {t("Products")}
        </Link>
        <div className="mb-4 flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <ScanBarcode className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("Barcode Labels")}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t("Tick products, generate missing barcodes, then print their labels.")}</p>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder={t("Search products by name...")} className="ps-9" />
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <label className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            <input type="checkbox" className="h-5 w-5 accent-primary" checked={allOnPage} onChange={togglePage} />
            {t("Select all on this page")}
          </label>
          {isLoading ? (
            <div className="flex justify-center py-10 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">{t("No products found.")}</p>
          ) : (
            <ul>
              {products.map((p) => (
                <li key={p._id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <label className="flex items-center gap-3 px-4 py-3">
                    <input type="checkbox" className="h-5 w-5 shrink-0 accent-primary" checked={!!selected[p._id]} onChange={() => toggle(p)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-gray-900 dark:text-gray-100">{p.name}</span>
                      {p.barcode ? (
                        <span className="block font-mono text-xs text-gray-500 dark:text-gray-400 ltr-text">{p.barcode}</span>
                      ) : (
                        <span className="inline-block rounded bg-amber-100 dark:bg-amber-900/30 px-1.5 text-xs text-amber-800 dark:text-amber-300">{t("No barcode")}</span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setPage((x) => x - 1)} disabled={page === 1} data-keep-label>
              <ChevronLeft className="rtl-flip h-4 w-4" />
              {t("Previous")}
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t("Page")} {page} {t("of")} {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage((x) => x + 1)} disabled={page >= totalPages} data-keep-label>
              {t("Next")}
              <ChevronRight className="rtl-flip h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Action bar: above the phone's bottom navigation, normal bar on desktop */}
      <div className="fixed inset-x-0 bottom-[72px] lg:bottom-0 lg:start-64 z-30 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur px-4 py-3">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
          <span className="me-auto text-sm text-gray-700 dark:text-gray-300">
            {selectedIds.length} {t("selected")}
            {missing > 0 && <span className="ms-1 text-amber-700 dark:text-amber-400">· {missing} {t("without barcode")}</span>}
          </span>
          {canEdit && (
            <Button variant="outline" onClick={generate} disabled={!missing || generating} className="flex items-center gap-2" data-keep-label>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {t("Generate barcodes")}
            </Button>
          )}
          <Button onClick={printLabels} disabled={!selectedIds.length} className="flex items-center gap-2" data-keep-label>
            <Printer className="h-4 w-4" />
            {t("Print labels")}
          </Button>
        </div>
      </div>
    </div>
  );
}
