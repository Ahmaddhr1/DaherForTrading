"use client";
// Read-only add-on details on the product page: photos, catalog, clothing /
// electronics / furniture fields, and a link to the product's style.
import Link from "next/link";
import { Layers } from "lucide-react";
import { useT } from "@/core/shared/i18n/LangProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useModules } from "../ModulesProvider";
import { displayFieldValue } from "../fields";
import { useOptionLists, Swatch } from "./lists";

export function ProductModuleDetails({ product }) {
  const t = useT();
  const { sections, has } = useModules();
  const { byKey } = useOptionLists(sections.length > 0 || has("variants"));
  const extra = product?.extra || {};
  const variant = extra.variant;
  const photos = (product?.img || []).slice(1);
  const filled = sections
    .map((s) => ({ ...s, rows: s.fields.filter((f) => displayFieldValue(f, extra[s.module]?.[f.key], t) || ["specs", "table"].includes(f.type) && extra[s.module]?.[f.key]) }))
    .filter((s) => s.rows.length);
  if (!filled.length && !(has("variants") && variant) && !(has("catalog") && photos.length)) return null;

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{t("Details")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        {has("variants") && variant && (
          <div className="flex flex-wrap items-center gap-2">
            {variant.options.map((o) => {
              const hex = byKey(o.list)?.values.find((v) => v.value === o.value)?.hex;
              return (
                <span key={o.list} className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 dark:border-gray-700 px-2.5 py-1 text-xs">
                  <Swatch hex={hex} className="h-3.5 w-3.5" />
                  <span className="text-gray-500">{t(o.name)}:</span> {t(o.value)}
                </span>
              );
            })}
            <Link href={`/dashboard/styles/${variant.group}`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <Layers className="h-3.5 w-3.5" /> {t("All sizes & colors of this style")}
            </Link>
          </div>
        )}
        {has("catalog") && photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {photos.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" className="h-20 w-20 rounded-lg border border-gray-200 dark:border-gray-800 object-cover" />
            ))}
          </div>
        )}
        {filled.map((s) => (
          <div key={s.module} className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t(s.title)}</p>
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {s.rows.map((f) => {
                const v = extra[s.module]?.[f.key];
                if (f.type === "specs") {
                  return (
                    <div key={f.key} className="sm:col-span-2">
                      <table className="w-full text-sm">
                        <tbody>
                          {v.map((r, i) => (
                            <tr key={i} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                              <td className="py-1.5 pe-4 text-gray-500">{r.label}</td>
                              <td className="py-1.5 font-medium">{r.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }
                if (f.type === "table") {
                  return (
                    <div key={f.key} className="sm:col-span-2 overflow-x-auto">
                      <p className="mb-1 text-gray-500">{t(f.label)}</p>
                      <table className="text-sm">
                        <thead>
                          <tr>{v.columns.map((c, i) => <th key={i} className="border border-gray-200 dark:border-gray-800 px-2 py-1 text-start">{c}</th>)}</tr>
                        </thead>
                        <tbody>
                          {v.rows.map((r, i) => (
                            <tr key={i}>{r.map((c, j) => <td key={j} className="border border-gray-200 dark:border-gray-800 px-2 py-1">{c}</td>)}</tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }
                const wide = ["textarea"].includes(f.type);
                return (
                  <div key={f.key} className={wide ? "sm:col-span-2" : ""}>
                    <dt className="text-gray-500">{t(f.label)}</dt>
                    <dd className={`font-medium ${wide ? "whitespace-pre-line font-normal" : ""}`}>{f.type === "select" || f.type === "multiselect" ? [].concat(v).map((x) => t(x)).join(", ") : displayFieldValue(f, v, t)}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
