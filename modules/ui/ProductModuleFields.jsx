"use client";
// The add-on fields of the enabled modules, rendered from their manifests
// (modules/<id>/manifest.js -> fields). `value` is the product's `extra`
// object; onChange gets the whole updated object.
import { useState } from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { useT } from "@/core/shared/i18n/LangProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useModules } from "../ModulesProvider";
import { useOptionLists, ListSelect, ChipPicker, visibleValues } from "./lists";

const textareaCls =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30";

export function ProductModuleFields({ value = {}, onChange, only, exclude = [] }) {
  const t = useT();
  const { sections } = useModules();
  const { byKey } = useOptionLists(sections.length > 0);
  const shown = sections.filter((s) => (!only || only.includes(s.module)) && !exclude.includes(s.module));
  if (!shown.length) return null;
  const setField = (moduleId, key, v) => onChange({ ...value, [moduleId]: { ...(value[moduleId] || {}), [key]: v } });

  return (
    <div className="space-y-6">
      {shown.map((section) => (
        <div key={section.module} className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <div className="h-4 w-1 rounded bg-teal-600" />
            {t(section.title)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {section.fields.map((field) => {
              const id = `x-${section.module}-${field.key}`;
              const v = value[section.module]?.[field.key];
              const wide = ["textarea", "specs", "table", "multiselect", "tags", "dimensions"].includes(field.type);
              return (
                <div key={field.key} className={`space-y-2 ${wide ? "sm:col-span-2" : ""}`}>
                  {field.type !== "boolean" && (
                    <Label htmlFor={id} className="text-sm font-medium">
                      {t(field.label)}
                    </Label>
                  )}
                  <FieldInput id={id} field={field} value={v} list={field.list ? byKey(field.list) : null} byKey={byKey} onChange={(nv) => setField(section.module, field.key, nv)} />
                  {field.hint && <p className="text-xs text-gray-500 dark:text-gray-400">{t(field.hint)}</p>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function FieldInput({ id, field, value, onChange, list, byKey }) {
  const t = useT();
  switch (field.type) {
    case "textarea":
      return <textarea id={id} rows={4} maxLength={field.max} value={value || ""} onChange={(e) => onChange(e.target.value)} className={textareaCls} />;
    case "number":
      return <Input id={id} type="number" min={field.min} max={field.max} step={field.step || "1"} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "boolean":
      return (
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
          <input id={id} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
          {t(field.label)}
        </label>
      );
    case "select":
      return (visibleValues(list).length || 0) > 10 ? <ListSelect id={id} list={list} value={value} onChange={onChange} /> : <ChipPicker list={list} value={value} onChange={onChange} />;
    case "multiselect":
      return <ChipPicker list={list} value={value} onChange={onChange} multiple />;
    case "tags":
      return <TagsInput id={id} value={value || []} onChange={onChange} />;
    case "dimensions":
      return <DimensionsInput value={value || {}} onChange={onChange} />;
    case "specs":
      return <SpecsInput value={value || []} onChange={onChange} templates={(field.templates || []).map(byKey).filter(Boolean)} />;
    case "table":
      return <TableInput value={value} onChange={onChange} />;
    default:
      return <Input id={id} maxLength={field.max} placeholder={field.placeholder ? t(field.placeholder) : undefined} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  }
}

function TagsInput({ id, value, onChange }) {
  const t = useT();
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange([...new Set([...value, ...parts])].slice(0, 30));
    setDraft("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input px-2 py-1.5">
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs">
          {tag}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== tag))} aria-label={t("Remove")} className="text-gray-500 hover:text-red-600">
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={value.length ? "" : t("Type and press Enter")}
        className="min-w-32 flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  );
}

function DimensionsInput({ value, onChange }) {
  const t = useT();
  const set = (k, v) => onChange({ unit: "cm", ...value, [k]: v });
  return (
    <div className="flex flex-wrap items-center gap-2">
      {[
        ["w", "Width"],
        ["d", "Depth"],
        ["h", "Height"],
      ].map(([k, label]) => (
        <div key={k} className="w-24">
          <Input type="number" min="0" step="0.1" placeholder={t(label)} aria-label={t(label)} value={value[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
        </div>
      ))}
      <select value={value.unit || "cm"} onChange={(e) => set("unit", e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-2 text-sm dark:bg-input/30" aria-label={t("Unit")}>
        <option value="cm">cm</option>
        <option value="in">in</option>
      </select>
      <span className="text-xs text-gray-500">{t("Width × Depth × Height")}</span>
    </div>
  );
}

function SpecsInput({ value, onChange, templates }) {
  const t = useT();
  const rows = value.length ? value : [];
  const set = (i, k, v) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const applyTemplate = (list) => {
    const have = new Set(rows.map((r) => r.label.toLowerCase()));
    const add = visibleValues(list).map((v) => v.value).filter((label) => !have.has(label.toLowerCase())).map((label) => ({ label, value: "" }));
    onChange([...rows, ...add]);
  };
  return (
    <div className="space-y-2">
      {templates.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Wand2 className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs text-gray-500">{t("Insert template:")}</span>
          {templates.map((list) => (
            <button key={list.key} type="button" onClick={() => applyTemplate(list)} className="rounded-full border border-gray-300 dark:border-gray-700 px-2.5 py-0.5 text-xs hover:border-blue-400">
              {t(list.name.replace(/ \(template\)$/, ""))}
            </button>
          ))}
        </div>
      )}
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2">
          <Input className="w-2/5" placeholder={t("Spec, e.g. Storage")} value={r.label} onChange={(e) => set(i, "label", e.target.value)} maxLength={60} />
          <Input className="flex-1" placeholder={t("Value, e.g. 256GB")} value={r.value} onChange={(e) => set(i, "value", e.target.value)} maxLength={200} />
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label={t("Remove")}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, { label: "", value: "" }])} className="flex items-center gap-1" data-keep-label>
        <Plus className="h-3.5 w-3.5" /> {t("Add spec")}
      </Button>
    </div>
  );
}

// Size guide: a small grid (columns x rows) of measurements.
function TableInput({ value, onChange }) {
  const t = useT();
  const columns = value?.columns?.length ? value.columns : [t("Size"), t("Chest (cm)"), t("Length (cm)")];
  const rows = value?.rows || [];
  const emit = (c, r) => onChange({ columns: c, rows: r });
  return (
    <div className="space-y-2 overflow-x-auto">
      <table className="text-sm">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} className="p-1">
                <Input value={c} onChange={(e) => emit(columns.map((x, j) => (j === i ? e.target.value : x)), rows)} className="h-8 w-28 font-semibold" maxLength={30} />
              </th>
            ))}
            <th className="p-1">
              {columns.length < 8 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => emit([...columns, ""], rows.map((r) => [...r, ""]))} aria-label={t("Add column")}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {columns.map((_, ci) => (
                <td key={ci} className="p-1">
                  <Input value={row[ci] || ""} onChange={(e) => emit(columns, rows.map((r, j) => (j === ri ? columns.map((__, k) => (k === ci ? e.target.value : r[k] || "")) : r)))} className="h-8 w-28" maxLength={30} />
                </td>
              ))}
              <td className="p-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => emit(columns, rows.filter((_, j) => j !== ri))} aria-label={t("Remove")}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button type="button" variant="outline" size="sm" onClick={() => emit(columns, [...rows, columns.map(() => "")])} className="flex items-center gap-1" data-keep-label>
        <Plus className="h-3.5 w-3.5" /> {t("Add row")}
      </Button>
    </div>
  );
}
