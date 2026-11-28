"use client";
// Settings -> Product options: every list the edition uses (sizes, colors,
// fabrics, brands, departments, spec templates...). Rename, add, reorder,
// recolor, hide or remove values, and create new lists. Values used by
// products can only be hidden, so old products and orders stay correct.
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Trash2, Plus, Save, Loader2, ListChecks, Palette } from "lucide-react";
import { useT } from "@/core/shared/i18n/LangProvider";
import { toast } from "@/core/shared/i18n/toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ListSkeleton } from "@/components/ui/skeleton-patterns";
import { useHasPermission } from "@/core/platform/useHasPermission";
import { LISTS_KEY, useOptionLists } from "./lists";

const GROUPS = [
  ["variant", "Variant options", "What a style's variants are made of - sizes, colors, fabrics, storage..."],
  ["field", "Product details", "Choices for product fields - brands, departments, materials, rooms..."],
  ["template", "Spec templates", "Spec labels inserted together on a product (electronics)."],
];

export default function OptionsManager() {
  const t = useT();
  const { lists, isLoading } = useOptionLists();
  const { hasPermission: canManage } = useHasPermission("canManageSettings");
  const [creating, setCreating] = useState(false);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ListChecks className="h-6 w-6" /> {t("Product options")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("Values added here are offered when creating products and orders. You can also add them right from the product form.")}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setCreating(true)} className="flex items-center gap-2" data-keep-label>
            <Plus className="h-4 w-4" /> {t("New list")}
          </Button>
        )}
      </div>
      {creating && <NewList onDone={() => setCreating(false)} />}
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : (
        GROUPS.map(([kind, title, desc]) => {
          const group = lists.filter((l) => l.kind === kind);
          if (!group.length) return null;
          return (
            <section key={kind} className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold">{t(title)}</h2>
                <p className="text-sm text-gray-500">{t(desc)}</p>
              </div>
              {group.map((list) => (
                <ListEditor key={list.key} list={list} canManage={canManage} />
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}

function NewList({ onDone }) {
  const t = useT();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [kind, setKind] = useState("variant");
  const [swatch, setSwatch] = useState(false);
  const create = useMutation({
    mutationFn: async () => (await axios.post("/api/modules/lists", { name, kind, swatch })).data.list,
    onSuccess: (list) => {
      qc.setQueryData(LISTS_KEY, (old) => [...(old || []), list]);
      toast.success(t("List created"));
      onDone();
    },
    onError: (e) => toast.error(e.response?.data?.error || "Couldn't create the list"),
  });
  return (
    <Card className="shadow-sm border-blue-200 dark:border-blue-900">
      <CardContent className="grid gap-4 pt-6 sm:grid-cols-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="nl-name">{t("List name")}</Label>
          <Input id="nl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("e.g. Patterns")} maxLength={60} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nl-kind">{t("Used for")}</Label>
          <select id="nl-kind" value={kind} onChange={(e) => setKind(e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm dark:bg-input/30">
            <option value="variant">{t("Variant options")}</option>
            <option value="template">{t("Spec templates")}</option>
          </select>
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" checked={swatch} onChange={(e) => setSwatch(e.target.checked)} className="h-4 w-4" disabled={kind !== "variant"} />
          {t("Values have a color swatch")}
        </label>
        <div className="flex justify-end gap-2 sm:col-span-4">
          <Button variant="ghost" onClick={onDone}>
            {t("Cancel")}
          </Button>
          <Button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending} data-keep-label>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Create")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ListEditor({ list, canManage }) {
  const t = useT();
  const qc = useQueryClient();
  // Built-in list names are stored in English; show them translated and only
  // save a name the owner actually typed.
  const shownName = t(list.name);
  const [name, setName] = useState(shownName);
  const [values, setValues] = useState(list.values);
  const [draft, setDraft] = useState("");
  const [hex, setHex] = useState("#888888");
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    setName(shownName);
    setValues(list.values);
  }, [list, shownName]);
  const dirty = name !== shownName || JSON.stringify(values) !== JSON.stringify(list.values);

  const save = useMutation({
    mutationFn: async () => (await axios.put(`/api/modules/lists/${list.key}`, { ...(name !== shownName ? { name } : {}), values })).data.list,
    onSuccess: (saved) => {
      qc.setQueryData(LISTS_KEY, (old) => (old || []).map((l) => (l.key === saved.key ? saved : l)));
      toast.success(t("Saved"));
    },
    onError: (e) => toast.error(e.response?.data?.error || "Couldn't save the list"),
  });
  const remove = useMutation({
    mutationFn: async () => axios.delete(`/api/modules/lists/${list.key}`),
    onSuccess: () => {
      qc.setQueryData(LISTS_KEY, (old) => (old || []).filter((l) => l.key !== list.key));
      toast.success(t("List deleted"));
    },
    onError: (e) => toast.error(e.response?.data?.error || "Couldn't delete the list"),
  });

  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= values.length) return;
    const next = [...values];
    [next[i], next[j]] = [next[j], next[i]];
    setValues(next);
  };
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (values.some((x) => x.value.toLowerCase() === v.toLowerCase())) {
      toast.error(t("\"{0}\" is already in the list", { 0: v }));
      return;
    }
    setValues([...values, { value: v, ...(list.swatch ? { hex: hex.toUpperCase() } : {}), hidden: false }]);
    setDraft("");
  };

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {canManage ? (
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 max-w-60 font-semibold" maxLength={60} aria-label={t("List name")} />
          ) : (
            <CardTitle className="text-base">{t(list.name)}</CardTitle>
          )}
          <div className="flex items-center gap-2">
            {list.swatch && <Palette className="h-4 w-4 text-gray-400" aria-label={t("Color swatches")} />}
            {canManage && list.custom && (
              <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(true)} aria-label={t("Delete list")}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        </div>
        <CardDescription>{t("{0} values", { 0: values.length })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="flex flex-wrap gap-2">
          {values.map((v, i) => (
            <li key={v.value} className={`flex items-center gap-1 rounded-full border px-2 py-1 text-sm ${v.hidden ? "border-dashed border-gray-300 text-gray-400 dark:border-gray-700" : "border-gray-300 dark:border-gray-700"}`}>
              {list.swatch &&
                (canManage ? (
                  <input type="color" value={v.hex || "#888888"} onChange={(e) => setValues(values.map((x, j) => (j === i ? { ...x, hex: e.target.value.toUpperCase() } : x)))} className="h-5 w-5 cursor-pointer rounded-full border-0 bg-transparent p-0" aria-label={t("Color")} />
                ) : (
                  <span className="h-4 w-4 rounded-full border border-black/15" style={{ background: v.hex }} />
                ))}
              <span className={v.hidden ? "line-through" : ""}>{t(v.value)}</span>
              {canManage && (
                <span className="ms-1 flex items-center">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30" aria-label={t("Move left")}>
                    <ChevronLeft className="rtl-flip h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === values.length - 1} className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30" aria-label={t("Move right")}>
                    <ChevronRight className="rtl-flip h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => setValues(values.map((x, j) => (j === i ? { ...x, hidden: !x.hidden } : x)))} className="p-0.5 text-gray-400 hover:text-gray-700" aria-label={v.hidden ? t("Show") : t("Hide")} title={v.hidden ? t("Show") : t("Hide (keeps it on old products)")}>
                    {v.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                  <button type="button" onClick={() => setValues(values.filter((_, j) => j !== i))} className="p-0.5 text-gray-400 hover:text-red-600" aria-label={t("Remove")}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            {list.swatch && <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="h-9 w-9 cursor-pointer rounded border-0 bg-transparent p-0" aria-label={t("Color")} />}
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
              placeholder={t("Add a value and press Enter")}
              className="h-9 max-w-64"
              maxLength={60}
            />
            <Button variant="outline" size="sm" onClick={add} disabled={!draft.trim()} className="flex items-center gap-1" data-keep-label>
              <Plus className="h-3.5 w-3.5" /> {t("Add")}
            </Button>
            <Button size="sm" onClick={() => save.mutate()} disabled={!dirty || save.isPending} className="ms-auto flex items-center gap-1" data-keep-label>
              {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {t("Save")}
            </Button>
          </div>
        )}
      </CardContent>
      <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title={t("Delete this list?")} loading={remove.isPending} onConfirm={() => remove.mutate()} />
    </Card>
  );
}
