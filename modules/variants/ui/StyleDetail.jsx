"use client";
// One style: stock grid (e.g. sizes x colors), every variant with its own
// stock/barcode/price, add sizes or colors later, edit shared details, print
// labels for all variants.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Loader2, Printer, Pencil, Plus, Trash2, Shirt, X, Save } from "lucide-react";
import { useT } from "@/core/shared/i18n/LangProvider";
import { toast } from "@/core/shared/i18n/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormSkeleton } from "@/components/ui/skeleton-patterns";
import { useHasPermission } from "@/core/platform/useHasPermission";
import { useModules } from "@/modules/ModulesProvider";
import { ProductModuleFields } from "@/modules/ui/ProductModuleFields";
import { PhotoGallery } from "@/modules/ui/PhotoGallery";
import { ChipPicker, Swatch, useOptionLists } from "@/modules/ui/lists";

const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const valuesOf = (p) => (p.extra?.variant?.options || []).map((o) => o.value);

export default function StyleDetail({ id }) {
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const mods = useModules();
  const { byKey } = useOptionLists();
  const { hasPermission: canEdit } = useHasPermission("canEditProducts");
  const { hasPermission: canCreate } = useHasPermission("canCreateProducts");
  const { hasPermission: canDelete } = useHasPermission("canDelete");
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(null); // option list key
  const [newValues, setNewValues] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const key = ["style", id];
  const { data, isLoading, isError } = useQuery({ queryKey: key, queryFn: async () => (await axios.get(`/api/modules/styles/${id}`)).data });
  const group = data?.group;
  const variants = useMemo(() => data?.variants || [], [data]);
  const hex = (list, v) => byKey(list)?.values.find((x) => x.value === v)?.hex || data?.lists?.find((l) => l.key === list)?.values.find((x) => x.value === v)?.hex;

  const addValues = useMutation({
    mutationFn: async () => (await axios.post(`/api/modules/styles/${id}/values`, { list: adding, values: newValues })).data,
    onSuccess: (d) => {
      toast.success(t("{0} new variants added", { 0: d.count }));
      setAdding(null);
      setNewValues([]);
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["styles"] });
    },
    onError: (e) => toast.error(e.response?.data?.error || "Couldn't add the values"),
  });
  const remove = useMutation({
    mutationFn: async () => axios.delete(`/api/modules/styles/${id}`),
    onSuccess: () => {
      toast.success(t("Style deleted"));
      qc.invalidateQueries({ queryKey: ["styles"] });
      router.push("/dashboard/styles");
    },
    onError: (e) => toast.error(e.response?.data?.error || "Couldn't delete the style"),
  });

  if (isLoading) return <FormSkeleton fields={6} />;
  if (isError || !group) return <p className="p-6 text-center text-gray-500">{t("Style not found")}</p>;

  const [rowOpt, colOpt] = group.options;
  const cell = (r, c) => variants.find((v) => valuesOf(v)[0] === r && (colOpt ? valuesOf(v)[1] === c : true));
  const totalStock = variants.reduce((n, v) => n + (v.quantity || 0), 0);
  const cover = group.img?.[0] || Object.values(group.photosByValue || {})[0]?.[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="h-14 w-14 rounded-lg border border-gray-200 dark:border-gray-800 object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-900">
              <Shirt className="h-7 w-7 text-gray-400" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{group.name}</h1>
            <p className="text-sm text-gray-500">{t("{0} variants · {1} in stock", { 0: variants.length, 1: totalStock })}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-1.5" data-keep-label onClick={() => window.open(`/print/labels?ids=${variants.filter((v) => v.barcode).map((v) => v._id).join(",")}`, "_blank")} disabled={!variants.some((v) => v.barcode)}>
            <Printer className="h-4 w-4" /> {t("Print labels")}
          </Button>
          {canEdit && (
            <Button variant="outline" size="sm" className="flex items-center gap-1.5" data-keep-label onClick={() => setEditing((e) => !e)}>
              {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />} {editing ? t("Close") : t("Edit style")}
            </Button>
          )}
          {canDelete && (
            <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-red-600" data-keep-label onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" /> {t("Delete")}
            </Button>
          )}
        </div>
      </div>

      {editing && <EditStyle group={group} onDone={() => setEditing(false)} />}

      {colOpt && (
        <Card className="shadow-sm border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t("Stock grid")}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-start text-xs text-gray-500">
                    {t(rowOpt.name)} \ {t(colOpt.name)}
                  </th>
                  {colOpt.values.map((c) => (
                    <th key={c} className="p-2 text-center font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Swatch hex={hex(colOpt.list, c)} className="h-3.5 w-3.5" />
                        {t(c)}
                      </span>
                    </th>
                  ))}
                  <th className="p-2 text-center text-xs text-gray-500">{t("Total")}</th>
                </tr>
              </thead>
              <tbody>
                {rowOpt.values.map((r) => {
                  const rowTotal = colOpt.values.reduce((n, c) => n + (cell(r, c)?.quantity || 0), 0);
                  return (
                    <tr key={r} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="p-2 font-medium">{t(r)}</td>
                      {colOpt.values.map((c) => {
                        const v = cell(r, c);
                        if (!v) return <td key={c} className="p-2 text-center text-gray-300">—</td>;
                        const low = v.quantity <= (v.lowStockThreshold ?? 0);
                        return (
                          <td key={c} className="p-1 text-center">
                            <Link href={`/dashboard/products/${v._id}`} className={`block min-w-12 rounded-md px-2 py-1.5 font-semibold hover:ring-2 hover:ring-blue-400 ${v.quantity === 0 ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300" : low ? "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" : "bg-green-50 text-green-800 dark:bg-green-950/50 dark:text-green-300"}`}>
                              {v.quantity}
                            </Link>
                          </td>
                        );
                      })}
                      <td className="p-2 text-center text-gray-500">{rowTotal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-500">{t("Tap a number to open that variant (stock, barcode, price, history).")}</p>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-2 flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">{t("Variants")}</CardTitle>
          {canCreate && (
            <div className="flex flex-wrap gap-2">
              {group.options.map((o) => (
                <Button key={o.list} variant="outline" size="sm" className="flex items-center gap-1" data-keep-label onClick={() => { setAdding(o.list); setNewValues([]); }}>
                  <Plus className="h-3.5 w-3.5" /> {t("Add {0}", { 0: t(o.name).toLowerCase() })}
                </Button>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {adding && (
            <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
              <p className="text-sm font-medium">{t("New {0} values", { 0: t(group.options.find((o) => o.list === adding)?.name || "") })}</p>
              <ChipPicker
                list={byKey(adding) ? { ...byKey(adding), values: byKey(adding).values.filter((v) => !group.options.find((o) => o.list === adding).values.includes(v.value)) } : null}
                value={newValues}
                onChange={setNewValues}
                multiple
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => addValues.mutate()} disabled={!newValues.length || addValues.isPending} data-keep-label>
                  {addValues.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Create the new variants")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAdding(null)}>
                  {t("Cancel")}
                </Button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-xs text-gray-500">
                  {group.options.map((o) => (
                    <th key={o.list} className="p-2 text-start">{t(o.name)}</th>
                  ))}
                  <th className="p-2 text-start">{t("Stock")}</th>
                  <th className="p-2 text-start">{t("Barcode")}</th>
                  <th className="p-2 text-start">{t("Price")}</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    {valuesOf(v).map((val, i) => (
                      <td key={i} className="p-2">
                        <Link href={`/dashboard/products/${v._id}`} className="inline-flex items-center gap-1.5 hover:underline">
                          <Swatch hex={hex(group.options[i]?.list, val)} className="h-3.5 w-3.5" />
                          {t(val)}
                        </Link>
                      </td>
                    ))}
                    <td className={`p-2 font-medium ${v.quantity === 0 ? "text-red-600" : ""}`}>{v.quantity}</td>
                    <td className="p-2 font-mono text-xs ltr-text">{v.barcode || <span className="text-gray-400">—</span>}</td>
                    <td className="p-2 ltr-text">{money(v.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {mods.sections.length > 0 && !editing && <SharedDetails group={group} />}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t("Delete this style?")}
        description={t("Deletes the style and all {0} variants. Styles that customers ordered can't be deleted.", { 0: variants.length })}
        confirmLabel={t("Delete")}
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}

function SharedDetails({ group }) {
  const t = useT();
  const { sections } = useModules();
  const rows = sections.flatMap((s) => s.fields.map((f) => ({ s, f, v: group.extra?.[s.module]?.[f.key] }))).filter((r) => r.v !== undefined && r.v !== "" && !(Array.isArray(r.v) && !r.v.length));
  if (!rows.length) return null;
  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{t("Shared details")}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {rows.map(({ s, f, v }) => (
            <div key={`${s.module}.${f.key}`}>
              <dt className="text-gray-500">{t(f.label)}</dt>
              <dd className="font-medium">
                {f.type === "specs" ? v.map((r) => `${r.label}: ${r.value}`).join(" · ") : f.type === "table" ? t("{0} rows", { 0: v.rows.length }) : f.type === "dimensions" ? `${v.w ?? "—"} × ${v.d ?? "—"} × ${v.h ?? "—"} ${v.unit}` : f.type === "boolean" ? t("Yes") : [].concat(v).map((x) => t(String(x))).join(", ")}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function EditStyle({ group, onDone }) {
  const t = useT();
  const qc = useQueryClient();
  const mods = useModules();
  const { byKey } = useOptionLists();
  const [name, setName] = useState(group.name);
  const [img, setImg] = useState(group.img || []);
  const [photosByValue, setPhotosByValue] = useState(group.photosByValue || {});
  const [extra, setExtra] = useState(group.extra || {});
  const [prices, setPrices] = useState({ price: group.prices?.price ?? "", initialPrice: group.prices?.initialPrice ?? "" });
  const [applyPrices, setApplyPrices] = useState(false);
  const swatchOpt = group.options.find((o) => byKey(o.list)?.swatch);
  const save = useMutation({
    mutationFn: async () => (await axios.put(`/api/modules/styles/${group._id}`, { name, img, photosByValue, extra, prices, applyPrices })).data,
    onSuccess: () => {
      toast.success(t("Style saved - all variants updated"));
      qc.invalidateQueries({ queryKey: ["style", group._id] });
      qc.invalidateQueries({ queryKey: ["styles"] });
      onDone();
    },
    onError: (e) => toast.error(e.response?.data?.error || "Couldn't save the style"),
  });
  return (
    <Card className="shadow-sm border-blue-200 dark:border-blue-900">
      <CardContent className="space-y-5 pt-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="es-name">{t("Style name")}</Label>
            <Input id="es-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="es-price">{t("Retail price")}</Label>
            <Input id="es-price" inputMode="decimal" value={prices.price} onChange={(e) => setPrices((p) => ({ ...p, price: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="es-cost">{t("Cost price")}</Label>
            <Input id="es-cost" inputMode="decimal" value={prices.initialPrice} onChange={(e) => setPrices((p) => ({ ...p, initialPrice: e.target.value }))} />
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" checked={applyPrices} onChange={(e) => setApplyPrices(e.target.checked)} className="h-4 w-4" />
            {t("Apply these prices to every variant")}
          </label>
        </div>
        {mods.has("catalog") && (
          <div className="space-y-3">
            <Label>{t("Photos (the first one is the cover)")}</Label>
            <PhotoGallery value={img} onChange={setImg} />
            {swatchOpt &&
              swatchOpt.values.map((v) => (
                <div key={v} className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex w-28 items-center gap-1.5 text-sm">
                    <Swatch hex={byKey(swatchOpt.list)?.values.find((x) => x.value === v)?.hex} />
                    {t(v)}
                  </span>
                  <PhotoGallery compact value={photosByValue[v] || []} onChange={(urls) => setPhotosByValue((m) => ({ ...m, [v]: urls }))} />
                </div>
              ))}
          </div>
        )}
        <ProductModuleFields value={extra} onChange={setExtra} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onDone}>
            {t("Cancel")}
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !name.trim()} className="flex items-center gap-1.5" data-keep-label>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t("Save for all variants")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
