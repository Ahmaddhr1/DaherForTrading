"use client";
// Serials & Warranty: look up any serial / IMEI (product, buyer, sale date,
// warranty left) and browse every recorded unit.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ScanLine, Search, ShieldCheck, ShieldX, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/core/shared/i18n/LangProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BarcodeScanInput from "@/components/BarcodeScanInput";
import { StatusBadge, UnitActions, STATUS_LABELS } from "./common";

const day = (d) => (d ? new Date(d).toLocaleDateString() : "—");

export default function SerialsPage() {
  const t = useT();
  const params = useSearchParams();
  const productId = params.get("productId") || "";
  const [serial, setSerial] = useState("");
  const [lookupFor, setLookupFor] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(q);
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [q]);

  const found = useQuery({
    queryKey: ["serials", "lookup", lookupFor],
    queryFn: async () => (await axios.get("/api/modules/serials/lookup", { params: { serial: lookupFor } })).data,
    enabled: !!lookupFor,
    retry: false,
  });
  const list = useQuery({
    queryKey: ["serials", "list", productId, status, search, page],
    queryFn: async () => (await axios.get("/api/modules/serials", { params: { productId: productId || undefined, status: status || undefined, q: search || undefined, page } })).data,
  });
  const unit = found.data?.unit;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ScanLine className="h-6 w-6" /> {t("Serials & Warranty")}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("Every unit by serial / IMEI: where it came from, who bought it, and how much warranty is left.")}</p>
      </div>

      <Card className="shadow-sm border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t("Warranty lookup")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setLookupFor(serial.trim());
            }}
          >
            <Input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder={t("Scan or type a serial / IMEI")} className="font-mono" />
            <Button type="submit" className="flex items-center gap-1.5" data-keep-label disabled={!serial.trim()}>
              <Search className="h-4 w-4" /> {t("Look up")}
            </Button>
          </form>
          <BarcodeScanInput
            onScan={(code) => {
              setSerial(code);
              setLookupFor(code);
            }}
          />
          {found.isFetching && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
          {found.isError && <p className="text-sm text-red-600">{found.error?.response?.data?.error || t("Not found")}</p>}
          {unit && (
            <div className="grid gap-4 rounded-lg border border-gray-200 dark:border-gray-800 p-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="font-mono text-lg font-semibold ltr-text">{unit.serial}</p>
                <Link href={`/dashboard/products/${unit.product?._id}`} className="text-blue-600 hover:underline">
                  {unit.product?.name}
                </Link>
                <div className="pt-1">
                  <StatusBadge status={unit.status} />
                </div>
                {unit.supplier && <p className="text-sm text-gray-500">{t("From supplier: {0}", { 0: unit.supplier.name })}</p>}
                <p className="text-sm text-gray-500">{t("Received: {0}", { 0: day(unit.receivedAt) })}</p>
              </div>
              <div className="space-y-1 text-sm">
                {unit.customer ? (
                  <p>
                    {t("Sold to")}{" "}
                    <Link href={`/dashboard/customers/${unit.customer._id}`} className="font-medium text-blue-600 hover:underline">
                      {unit.customer.fullName}
                    </Link>{" "}
                    {t("on {0}", { 0: day(unit.soldAt) })}
                  </p>
                ) : unit.soldAt ? (
                  <p>{t("Sold on {0}", { 0: day(unit.soldAt) })}</p>
                ) : null}
                {unit.order && (
                  <Link href={`/dashboard/orders/${unit.order}`} className="text-blue-600 hover:underline">
                    {t("Open the order")}
                  </Link>
                )}
                {unit.soldAt && (
                  <div className={`mt-2 flex items-center gap-2 rounded-md px-3 py-2 ${unit.warranty.active ? "bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300" : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300"}`}>
                    {unit.warranty.active ? <ShieldCheck className="h-5 w-5" /> : <ShieldX className="h-5 w-5" />}
                    {unit.warranty.months
                      ? unit.warranty.active
                        ? t("Under warranty until {0} ({1} days left)", { 0: day(unit.warranty.endsAt), 1: unit.warranty.daysLeft })
                        : t("Warranty ended on {0}", { 0: day(unit.warranty.endsAt) })
                      : t("No warranty on this product")}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-2 flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">{t("All units")}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search serial...")} className="h-8 w-44 font-mono" />
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-8 rounded-md border border-input bg-transparent px-2 text-sm dark:bg-input/30" aria-label={t("Status")}>
              <option value="">{t("All statuses")}</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {t(v)}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : !list.data?.units?.length ? (
            <p className="py-6 text-center text-sm text-gray-500">{t("No units recorded yet. Add them from a product page (Serial numbers → Add units).")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-xs text-gray-500">
                    <th className="p-2 text-start">{t("Serial / IMEI")}</th>
                    <th className="p-2 text-start">{t("Product")}</th>
                    <th className="p-2 text-start">{t("Status")}</th>
                    <th className="p-2 text-start">{t("Customer")}</th>
                    <th className="p-2 text-start">{t("Warranty")}</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {list.data.units.map((u) => (
                    <tr key={u._id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="p-2">
                        <button type="button" className="font-mono text-blue-600 hover:underline ltr-text" onClick={() => { setSerial(u.serial); setLookupFor(u.serial); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                          {u.serial}
                        </button>
                      </td>
                      <td className="p-2">{u.product?.name}</td>
                      <td className="p-2">
                        <StatusBadge status={u.status} />
                      </td>
                      <td className="p-2">{u.customer?.fullName || "—"}</td>
                      <td className="p-2 text-xs">{u.soldAt && u.warranty.months ? (u.warranty.active ? t("{0} days left", { 0: u.warranty.daysLeft }) : t("Ended")) : "—"}</td>
                      <td className="p-2 text-end">
                        <UnitActions unit={u} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {list.data?.pages > 1 && (
            <div className="mt-3 flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1} aria-label={t("Previous")}>
                <ChevronLeft className="rtl-flip h-4 w-4" />
              </Button>
              <span className="text-sm">{t("Page {0} of {1}", { 0: page, 1: list.data.pages })}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= list.data.pages} aria-label={t("Next")}>
                <ChevronRight className="rtl-flip h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
