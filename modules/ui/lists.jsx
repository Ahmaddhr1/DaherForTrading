"use client";
// Option lists on the client: load them once, pick from them, and add a new
// value inline ("+ Add new size") - saved to the same list Settings manages.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Plus, Check, X, Loader2 } from "lucide-react";
import { useT } from "@/core/shared/i18n/LangProvider";
import { toast } from "@/core/shared/i18n/toast";
import { hasAnyPermission } from "@/core/platform/permissions";
import { cn } from "@/core/shared/utils";

export const LISTS_KEY = ["option-lists"];

export function useAnyPermission(keys) {
  const { data: me } = useQuery({ queryKey: ["admin", "me"], queryFn: async () => (await axios.get("/api/admin/me")).data });
  return hasAnyPermission(me, keys);
}

export function useOptionLists(enabled = true) {
  const { data, isLoading } = useQuery({
    queryKey: LISTS_KEY,
    queryFn: async () => (await axios.get("/api/modules/lists")).data.lists,
    enabled,
    staleTime: 60_000,
  });
  const lists = data || [];
  return { lists, isLoading, byKey: (key) => lists.find((l) => l.key === key) };
}

export function useAddListValue(listKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ value, hex }) => (await axios.post(`/api/modules/lists/${listKey}/values`, { value, hex })).data.list,
    onSuccess: (list) => qc.setQueryData(LISTS_KEY, (old) => (old || []).map((l) => (l.key === list.key ? list : l))),
    onError: (e) => toast.error(e.response?.data?.error || "Couldn't add the value"),
  });
}

export const visibleValues = (list, keep = []) =>
  (list?.values || []).filter((v) => !v.hidden || [].concat(keep).includes(v.value));

export function Swatch({ hex, className = "" }) {
  if (!hex) return null;
  return <span className={cn("inline-block h-4 w-4 shrink-0 rounded-full border border-black/15", className)} style={{ background: hex }} />;
}

// "+ Add new" control: a small inline input (and color picker for swatch lists).
export function AddValueInline({ list, onAdded, label }) {
  const t = useT();
  const canAdd = useAnyPermission(["canCreateProducts", "canEditProducts", "canManageSettings"]);
  const add = useAddListValue(list?.key);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [hex, setHex] = useState("#888888");
  if (!list || !canAdd) return null;
  const submit = async () => {
    const v = value.trim();
    if (!v) return;
    const saved = await add.mutateAsync({ value: v, hex: list.swatch ? hex : undefined }).catch(() => null);
    if (!saved) return;
    setValue("");
    setOpen(false);
    onAdded?.(saved.values.find((x) => x.value.toLowerCase() === v.toLowerCase())?.value || v);
  };
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 dark:border-gray-700 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600">
        <Plus className="h-3 w-3" />
        {label || t("Add new")}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      {list.swatch && <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0" aria-label={t("Color")} />}
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={t("New value")}
        maxLength={60}
        className="h-7 w-32 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-2 text-xs outline-none focus:border-blue-500"
      />
      <button type="button" onClick={submit} disabled={add.isPending} className="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950" aria-label={t("Save")}>
        {add.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={t("Cancel")}>
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

// Chips you tap to choose: one value (single) or several (multiple).
export function ChipPicker({ list, value, onChange, multiple = false, allowAdd = true, addLabel }) {
  const t = useT();
  const selected = multiple ? value || [] : value ? [value] : [];
  const toggle = (v) => {
    if (multiple) onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
    else onChange(selected.includes(v) ? "" : v);
  };
  const values = visibleValues(list, selected);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {values.map((v) => {
        const on = selected.includes(v.value);
        return (
          <button
            key={v.value}
            type="button"
            onClick={() => toggle(v.value)}
            aria-pressed={on}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
              on ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 dark:border-gray-700 hover:border-blue-400"
            )}
          >
            <Swatch hex={v.hex} className="h-3.5 w-3.5" />
            {t(v.value)}
          </button>
        );
      })}
      {!values.length && <span className="text-xs text-gray-500">{t("No values yet")}</span>}
      {allowAdd && <AddValueInline list={list} label={addLabel} onAdded={(v) => (multiple ? onChange([...new Set([...selected, v])]) : onChange(v))} />}
    </div>
  );
}

// A dropdown for long lists (brands...), with "+ Add new" next to it.
export function ListSelect({ list, value, onChange, id }) {
  const t = useT();
  const values = visibleValues(list, value);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        id={id}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 min-w-40 flex-1 rounded-md border border-input bg-transparent px-3 text-sm dark:bg-input/30"
      >
        <option value="">{t("— None —")}</option>
        {values.map((v) => (
          <option key={v.value} value={v.value}>
            {t(v.value)}
          </option>
        ))}
      </select>
      <AddValueInline list={list} onAdded={onChange} />
    </div>
  );
}
