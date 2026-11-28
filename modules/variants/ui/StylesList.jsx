"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Plus, Search, Shirt, Layers, ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/core/shared/i18n/LangProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CardGridSkeleton } from "@/components/ui/skeleton-patterns";
import { useHasPermission } from "@/core/platform/useHasPermission";

const money = (n) => `$${Number(n || 0).toFixed(2)}`;
export const coverOf = (s) => s.img?.[0] || Object.values(s.photosByValue || {})[0]?.[0] || null;

export default function StylesList() {
  const t = useT();
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const { hasPermission: canCreate } = useHasPermission("canCreateProducts");
  useEffect(() => {
    const id = setTimeout(() => {
      setQ(input);
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [input]);
  const { data, isLoading } = useQuery({
    queryKey: ["styles", q, page],
    queryFn: async () => (await axios.get("/api/modules/styles", { params: { q, page } })).data,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Shirt className="h-6 w-6" /> {t("Styles")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("Products that come in sizes, colors or finishes. Each combination has its own stock and barcode.")}
          </p>
        </div>
        {canCreate && (
          <Link href="/dashboard/styles/new">
            <Button className="flex items-center gap-2" data-keep-label>
              <Plus className="h-4 w-4" /> {t("New style")}
            </Button>
          </Link>
        )}
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("Search styles...")} className="ps-9" />
      </div>
      {isLoading ? (
        <CardGridSkeleton />
      ) : !data?.styles?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Layers className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            {q ? t("No styles match your search.") : t("No styles yet. Create one and every size/color is made for you.")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.styles.map((s) => (
            <Link key={s._id} href={`/dashboard/styles/${s._id}`}>
              <Card className="h-full overflow-hidden pt-0 transition-shadow hover:shadow-md">
                <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-900">
                  {coverOf(s) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverOf(s)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-300 dark:text-gray-700">
                      <Shirt className="h-12 w-12" />
                    </div>
                  )}
                </div>
                <CardContent className="space-y-1">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.options.map((o) => `${t(o.name)} (${o.values.length})`).join(" · ")}</p>
                  <div className="flex justify-between gap-2 text-sm">
                    <span>{t("{0} variants · {1} in stock", { 0: s.stats.variants, 1: s.stats.stock })}</span>
                    <span className="font-medium ltr-text">
                      {s.stats.minPrice === s.stats.maxPrice ? money(s.stats.minPrice) : `${money(s.stats.minPrice)} – ${money(s.stats.maxPrice)}`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      {data?.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1} aria-label={t("Previous")}>
            <ChevronLeft className="rtl-flip h-4 w-4" />
          </Button>
          <span className="text-sm">{t("Page {0} of {1}", { 0: page, 1: data.pages })}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.pages} aria-label={t("Next")}>
            <ChevronRight className="rtl-flip h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
