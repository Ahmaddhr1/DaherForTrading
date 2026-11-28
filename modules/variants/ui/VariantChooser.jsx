"use client";
// Under an order line whose product is a variant: the style's sizes/colors as
// buttons, so the employee just taps "M" or "Black" instead of searching.
// Uses the product list the order page already loaded - no extra request.
import { useMemo } from "react";
import { useT } from "@/core/shared/i18n/LangProvider";
import { cn } from "@/core/shared/utils";
import { Swatch, useOptionLists } from "@/modules/ui/lists";

const valuesOf = (p) => (p?.extra?.variant?.options || []).map((o) => o.value);

export function VariantChooser({ product, products, onPick }) {
  const t = useT();
  const { byKey } = useOptionLists(!!product?.extra?.variant);
  const group = product?.extra?.variant?.group ? String(product.extra.variant.group) : null;
  const siblings = useMemo(() => (group ? products.filter((p) => String(p.extra?.variant?.group || "") === group) : []), [products, group]);
  if (!group || siblings.length < 2) return null;
  const options = product.extra.variant.options;
  const current = valuesOf(product);

  // Values of option i, in the style's order (first appearance).
  const valuesAt = (i) => [...new Set(siblings.map((p) => valuesOf(p)[i]))];
  // Best sibling when option i changes to v: keep the other choices if that combination exists.
  const pick = (i, v) => {
    const want = current.map((x, j) => (j === i ? v : x));
    const exact = siblings.find((p) => valuesOf(p).every((x, j) => x === want[j]));
    const fallback = siblings.find((p) => valuesOf(p)[i] === v);
    const next = exact || fallback;
    if (next && next._id !== product._id) onPick(next._id);
  };
  const stockFor = (i, v) => {
    const want = current.map((x, j) => (j === i ? v : x));
    return siblings.find((p) => valuesOf(p).every((x, j) => x === want[j]))?.quantity;
  };

  return (
    <div className="space-y-2 rounded-md border border-dashed border-gray-300 dark:border-gray-700 p-2">
      {options.map((o, i) => (
        <div key={o.list} className="flex flex-wrap items-center gap-1.5">
          <span className="w-16 shrink-0 text-xs text-gray-500">{t(o.name)}</span>
          {valuesAt(i).map((v) => {
            const on = current[i] === v;
            const stock = stockFor(i, v);
            const out = stock === 0;
            const missing = stock === undefined;
            return (
              <button
                key={v}
                type="button"
                onClick={() => pick(i, v)}
                title={missing ? t("Not made in this combination") : t("{0} in stock", { 0: stock })}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                  on ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 dark:border-gray-700 hover:border-blue-400",
                  (out || missing) && !on && "opacity-45 line-through decoration-1"
                )}
              >
                <Swatch hex={byKey(o.list)?.values.find((x) => x.value === v)?.hex} className="h-3.5 w-3.5" />
                {t(v)}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
