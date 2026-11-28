"use client";
// New style: name, prices, options (Size, Color...) picked from the lists
// managed in Settings (with "+ Add new" right here), the generated
// combinations with their own stock/barcode/price, photos and details.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Loader2, Plus, Trash2, Shirt, Images, Layers } from "lucide-react";
import { useT } from "@/core/shared/i18n/LangProvider";
import { toast } from "@/core/shared/i18n/toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useModules } from "@/modules/ModulesProvider";
import { ProductModuleFields } from "@/modules/ui/ProductModuleFields";
import { PhotoGallery } from "@/modules/ui/PhotoGallery";
import { useOptionLists, ChipPicker, Swatch } from "@/modules/ui/lists";
import variantsManifest from "../manifest";

const combine = (opts) => opts.reduce((acc, o) => acc.flatMap((p) => o.values.map((v) => [...p, v])), [[]]);

function Section({ title, children, color = "bg-blue-600" }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <div className={`h-4 w-1 rounded ${color}`} />
        {title}
      </div>
      {children}
    </div>
  );
}

export default function StyleForm() {
  const t = useT();
  const router = useRouter();
  const mods = useModules();
  const { lists, byKey } = useOptionLists();
  const variantLists = lists.filter((l) => l.kind === "variant");
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await axios.get("/api/categories", { params: { all: true } })).data,
  });

  const [form, setForm] = useState({ name: "", category: "", unit: "pcs", lowStockThreshold: "2", price: "", initialPrice: "", priceWholesale: "", priceDistributor: "", priceVip: "" });
  const [options, setOptions] = useState([]); // [{ list, values: [] }]
  const [rows, setRows] = useState({}); // comboKey -> { quantity, barcode, price, skip }
  const [img, setImg] = useState([]);
  const [photosByValue, setPhotosByValue] = useState({});
  const [extra, setExtra] = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const active = options.filter((o) => o.list && o.values.length);
  const combos = useMemo(() => (active.length ? combine(active) : []), [active]);
  const swatchOpt = active.find((o) => byKey(o.list)?.swatch);
  const tooMany = combos.length > variantsManifest.maxCombinations;

  const setRow = (key, patch) => setRows((r) => ({ ...r, [key]: { ...(r[key] || {}), ...patch } }));
  const fillAll = (field, value) => setRows((r) => Object.fromEntries(combos.map((c) => [c.join("|"), { ...(r[c.join("|")] || {}), [field]: value }])));

  const save = useMutation({
    mutationFn: async () =>
      (
        await axios.post("/api/modules/styles", {
          ...form,
          options: active.map((o) => ({ list: o.list, name: byKey(o.list)?.optionName || byKey(o.list)?.name, values: o.values })),
          variants: rows,
          img,
          photosByValue,
          extra,
        })
      ).data,
    onSuccess: (d) => {
      toast.success(t("Style created with {0} variants", { 0: d.count }));
      router.push(`/dashboard/styles/${d.group._id}`);
    },
    onError: (e) => toast.error(e.response?.data?.error || "Couldn't create the style"),
  });

  const valid = form.name.trim() && form.price !== "" && active.length && combos.length && !tooMany;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Shirt className="h-6 w-6" /> {t("New style")}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("Pick the sizes, colors or finishes it comes in - every combination becomes its own product with its own stock and barcode.")}</p>
      </div>

      <Card className="shadow-sm border-gray-200 dark:border-gray-800">
        <CardContent className="space-y-6 pt-6">
          <Section title={t("Basic Information")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="s-name">{t("Style name")} *</Label>
                <Input id="s-name" value={form.name} onChange={set("name")} placeholder={t("e.g. Basic T-shirt")} maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-cat">{t("Category")}</Label>
                <select id="s-cat" value={form.category} onChange={set("category")} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm dark:bg-input/30">
                  <option value="">{t("— None —")}</option>
                  {(Array.isArray(categories) ? categories : categories.categories || []).map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="s-unit">{t("Unit of Measure")}</Label>
                  <Input id="s-unit" value={form.unit} onChange={set("unit")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-low">{t("Low Stock Threshold")}</Label>
                  <Input id="s-low" type="number" min="0" value={form.lowStockThreshold} onChange={set("lowStockThreshold")} />
                </div>
              </div>
            </div>
          </Section>

          <Separator />
          <Section title={t("Pricing")} color="bg-green-600">
            <div className="grid gap-4 sm:grid-cols-5">
              {[
                ["price", "Retail price *"],
                ["initialPrice", "Cost price"],
                ["priceWholesale", "Wholesale"],
                ["priceDistributor", "Distributor"],
                ["priceVip", "VIP"],
              ].map(([k, label]) => (
                <div key={k} className="space-y-2">
                  <Label htmlFor={`s-${k}`}>{t(label)}</Label>
                  <Input id={`s-${k}`} inputMode="decimal" value={form[k]} onChange={set(k)} placeholder={k.startsWith("price") && k !== "price" ? form.price || "0.00" : "0.00"} />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">{t("Every variant starts with these prices - change single ones in the table below.")}</p>
          </Section>

          <Separator />
          <Section title={t("Options")} color="bg-purple-600">
            {options.map((o, i) => {
              const list = byKey(o.list);
              return (
                <div key={i} className="space-y-2 rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={o.list}
                      onChange={(e) => setOptions((all) => all.map((x, j) => (j === i ? { list: e.target.value, values: [] } : x)))}
                      className="h-9 rounded-md border border-input bg-transparent px-3 text-sm dark:bg-input/30"
                      aria-label={t("Option")}
                    >
                      <option value="">{t("Choose an option…")}</option>
                      {variantLists
                        .filter((l) => l.key === o.list || !options.some((x) => x.list === l.key))
                        .map((l) => (
                          <option key={l.key} value={l.key}>
                            {t(l.name)}
                          </option>
                        ))}
                    </select>
                    {list && (
                      <span className="text-xs text-gray-500">
                        {t("{0} selected", { 0: o.values.length })} ·{" "}
                        <button type="button" className="underline" onClick={() => setOptions((all) => all.map((x, j) => (j === i ? { ...x, values: list.values.filter((v) => !v.hidden).map((v) => v.value) } : x)))}>
                          {t("Select all")}
                        </button>
                      </span>
                    )}
                    <Button type="button" variant="ghost" size="icon" className="ms-auto" onClick={() => setOptions((all) => all.filter((_, j) => j !== i))} aria-label={t("Remove")}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  {list && <ChipPicker list={list} value={o.values} multiple onChange={(values) => setOptions((all) => all.map((x, j) => (j === i ? { ...x, values } : x)))} addLabel={t("Add new {0}", { 0: t(list.name).toLowerCase() })} />}
                </div>
              );
            })}
            {options.length < variantsManifest.maxOptions && (
              <Button type="button" variant="outline" size="sm" onClick={() => setOptions((o) => [...o, { list: "", values: [] }])} className="flex items-center gap-1" data-keep-label>
                <Plus className="h-3.5 w-3.5" /> {t("Add option")}
              </Button>
            )}
            <p className="text-xs text-gray-500">{t("Lists are managed in Settings → Product options. New values you add here are saved there too.")}</p>
          </Section>

          {combos.length > 0 && (
            <>
              <Separator />
              <Section title={t("{0} combinations", { 0: combos.length })} color="bg-amber-500">
                {tooMany ? (
                  <p className="text-sm text-red-600">{t("That's too many - the limit is {0}.", { 0: variantsManifest.maxCombinations })}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-800 text-start text-xs text-gray-500">
                          <th className="p-2 text-start">{t("Make")}</th>
                          <th className="p-2 text-start">{t("Variant")}</th>
                          <th className="p-2 text-start">
                            {t("Stock")}
                            <button type="button" className="ms-1 underline" onClick={() => fillAll("quantity", rows[combos[0].join("|")]?.quantity || "")}>
                              {t("same for all")}
                            </button>
                          </th>
                          <th className="p-2 text-start">{t("Barcode")}</th>
                          <th className="p-2 text-start">{t("Price")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {combos.map((values) => {
                          const key = values.join("|");
                          const r = rows[key] || {};
                          return (
                            <tr key={key} className={`border-b border-gray-100 dark:border-gray-800 ${r.skip ? "opacity-40" : ""}`}>
                              <td className="p-2">
                                <input type="checkbox" checked={!r.skip} onChange={(e) => setRow(key, { skip: !e.target.checked })} aria-label={t("Make this variant")} />
                              </td>
                              <td className="p-2">
                                <span className="inline-flex flex-wrap items-center gap-1.5">
                                  {values.map((v, i) => (
                                    <span key={i} className="inline-flex items-center gap-1">
                                      <Swatch hex={byKey(active[i].list)?.values.find((x) => x.value === v)?.hex} className="h-3 w-3" />
                                      {t(v)}
                                      {i < values.length - 1 && <span className="text-gray-400">/</span>}
                                    </span>
                                  ))}
                                </span>
                              </td>
                              <td className="p-2">
                                <Input className="h-8 w-20" type="number" min="0" value={r.quantity ?? ""} onChange={(e) => setRow(key, { quantity: e.target.value })} placeholder="0" disabled={r.skip} />
                              </td>
                              <td className="p-2">
                                <Input className="h-8 w-40 font-mono" value={r.barcode ?? ""} onChange={(e) => setRow(key, { barcode: e.target.value })} placeholder={t("optional")} disabled={r.skip} />
                              </td>
                              <td className="p-2">
                                <Input className="h-8 w-24" inputMode="decimal" value={r.price ?? ""} onChange={(e) => setRow(key, { price: e.target.value })} placeholder={form.price || "—"} disabled={r.skip} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            </>
          )}

          {mods.has("catalog") && (
            <>
              <Separator />
              <Section title={t("Photos")} color="bg-pink-600">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Images className="h-4 w-4" /> {t("Photos (the first one is the cover)")}
                  </Label>
                  <PhotoGallery value={img} onChange={setImg} />
                </div>
                {swatchOpt && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">{t("Photos per {0} (optional)", { 0: t(byKey(swatchOpt.list)?.name || "") })}</p>
                    {swatchOpt.values.map((v) => (
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
              </Section>
            </>
          )}

          {mods.sections.length > 0 && (
            <>
              <Separator />
              <ProductModuleFields value={extra} onChange={setExtra} />
            </>
          )}

          <Separator />
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
              {t("Cancel")}
            </Button>
            <Button type="button" className="flex flex-1 items-center gap-2" disabled={!valid || save.isPending} onClick={() => save.mutate()} data-keep-label>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
              {t("Create style ({0} variants)", { 0: combos.filter((c) => !rows[c.join("|")]?.skip).length })}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
