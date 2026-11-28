// The add-on catalog: every module, every edition, and which modules a
// deployment runs. Plain data + pure functions, safe on server and client.
//
// A deployment picks its edition with environment variables (Vercel ->
// Project -> Settings -> Environment Variables):
//   INVENTO_EDITION = base | clothing | electronics | furniture   (default: base)
//   INVENTO_MODULES = +serials,-expiry   (optional: add/remove single modules)
// See ARCHITECTURE.md -> "Editions and add-on modules".
import expiry from "./expiry/manifest";
import catalog from "./catalog/manifest";
import variants from "./variants/manifest";
import apparel from "./apparel/manifest";
import electronics from "./electronics/manifest";
import serials from "./serials/manifest";
import furniture from "./furniture/manifest";

export const MODULES = { expiry, catalog, variants, apparel, electronics, serials, furniture };
export const MODULE_IDS = Object.keys(MODULES);

export const EDITIONS = {
  base: { name: "Invento", modules: ["expiry"] },
  clothing: { name: "Invento Clothing", modules: ["catalog", "variants", "apparel"] },
  electronics: { name: "Invento Electronics", modules: ["catalog", "variants", "electronics", "serials"] },
  furniture: { name: "Invento Furniture", modules: ["catalog", "variants", "furniture"] },
};

// Colors are shared by every edition that has variants, so they're defined once.
export const SHARED_LISTS = [
  {
    key: "color",
    name: "Colors",
    optionName: "Color",
    kind: "variant",
    swatch: true,
    values: [
      { value: "Black", hex: "#111111" },
      { value: "White", hex: "#FFFFFF" },
      { value: "Grey", hex: "#9CA3AF" },
      { value: "Navy", hex: "#1E2A4A" },
      { value: "Blue", hex: "#2563EB" },
      { value: "Red", hex: "#DC2626" },
      { value: "Green", hex: "#16A34A" },
      { value: "Beige", hex: "#E8DCC4" },
      { value: "Brown", hex: "#7C4A2D" },
      { value: "Pink", hex: "#EC4899" },
    ],
  },
];

export function normalizeEdition(value) {
  const key = String(value || "").trim().toLowerCase();
  return EDITIONS[key] ? key : "base";
}

// Edition + overrides -> the sorted list of enabled module ids, with each
// module's `requires` pulled in. Unknown names are ignored.
export function resolveModules(edition, overrides = "") {
  const set = new Set(EDITIONS[normalizeEdition(edition)].modules);
  for (const raw of String(overrides || "").split(",")) {
    const token = raw.trim().toLowerCase();
    if (!token) continue;
    const remove = token.startsWith("-");
    const id = token.replace(/^[+-]/, "");
    if (!MODULES[id]) continue;
    if (remove) set.delete(id);
    else set.add(id);
  }
  // Pull in requirements (a removed requirement disables the module that needs it).
  for (const id of [...set]) {
    const missing = (MODULES[id].requires || []).filter((r) => !set.has(r));
    if (missing.length) {
      const explicitlyRemoved = missing.some((r) => String(overrides).toLowerCase().includes(`-${r}`));
      if (explicitlyRemoved) set.delete(id);
      else missing.forEach((r) => set.add(r));
    }
  }
  return MODULE_IDS.filter((id) => set.has(id));
}

// Every list (sizes, colors, brands...) the enabled modules use, merged by key.
export function listsFor(enabled) {
  const byKey = new Map();
  const add = (list, moduleId) => {
    const prev = byKey.get(list.key);
    if (!prev) {
      byKey.set(list.key, { ...list, modules: [moduleId], values: [...(list.values || [])] });
    } else {
      prev.modules.push(moduleId);
      const have = new Set(prev.values.map((v) => (typeof v === "string" ? v : v.value)));
      for (const v of list.values || []) if (!have.has(typeof v === "string" ? v : v.value)) prev.values.push(v);
    }
  };
  for (const id of enabled) for (const list of MODULES[id].lists || []) add(list, id);
  for (const shared of SHARED_LISTS) {
    const entry = byKey.get(shared.key);
    if (entry && !entry.values.length) entry.values = [...shared.values];
  }
  return [...byKey.values()];
}

// Product fields of the enabled modules, grouped by module (for the forms).
export function fieldSections(enabled) {
  return enabled
    .map((id) => MODULES[id])
    .filter((m) => m.fields?.length)
    .map((m) => ({ module: m.id, title: m.section || m.name, fields: m.fields }));
}

export function navFor(enabled) {
  return enabled.flatMap((id) => (MODULES[id].nav || []).map((n) => ({ ...n, module: id })));
}
