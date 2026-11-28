// What this deployment runs (from the env vars) and validation of
// module-owned product data. No HTTP here, so services can use it.
import { EDITIONS, MODULES, normalizeEdition, resolveModules } from "./registry";
import { cleanFieldValue } from "./fields";

export function currentEdition() {
  return normalizeEdition(process.env.INVENTO_EDITION);
}

// Read on every call (cheap) so a redeploy with new env vars - or a test
// that sets process.env - takes effect without any caching surprises.
export function enabledModules() {
  return resolveModules(process.env.INVENTO_EDITION, process.env.INVENTO_MODULES);
}

export function isEnabled(id) {
  return enabledModules().includes(id);
}

export function editionInfo() {
  const edition = currentEdition();
  return { edition, name: EDITIONS[edition].name, modules: enabledModules() };
}

// Cleans `extra` from a product form against the enabled modules' fields.
// Data of modules that are switched off is kept as it was (switching a module
// off never deletes its data); unknown keys are dropped.
export function sanitizeProductExtra(input, previous = {}) {
  const enabled = enabledModules();
  const out = {};
  for (const [moduleId, value] of Object.entries(previous || {})) {
    if (!enabled.includes(moduleId)) out[moduleId] = value;
  }
  // Module-managed keys that forms never send (variant links) are kept.
  if (previous?.variant) out.variant = previous.variant;
  const src = input && typeof input === "object" ? input : {};
  for (const id of enabled) {
    const fields = MODULES[id].fields || [];
    if (!fields.length) continue;
    const given = src[id] && typeof src[id] === "object" ? src[id] : null;
    const prev = (previous || {})[id] || {};
    if (!given) {
      if (Object.keys(prev).length) out[id] = prev;
      continue;
    }
    const clean = {};
    for (const field of fields) {
      const v = field.key in given ? cleanFieldValue(field, given[field.key]) : prev[field.key];
      if (v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length)) clean[field.key] = v;
    }
    if (Object.keys(clean).length) out[id] = clean;
  }
  return out;
}
