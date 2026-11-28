// Field types the modules' product fields use, and how a submitted value is
// cleaned. Shared by the server (validation) and the forms.
export const FIELD_TYPES = ["text", "textarea", "number", "select", "multiselect", "boolean", "tags", "dimensions", "specs", "table"];

const str = (v, max = 500) => (typeof v === "string" || typeof v === "number" ? String(v).trim().slice(0, max) : "");

export function cleanFieldValue(field, value) {
  switch (field.type) {
    case "text":
    case "textarea":
    case "select":
      return str(value, field.max || (field.type === "textarea" ? 4000 : 200)) || undefined;
    case "number": {
      if (value === "" || value === null || value === undefined) return undefined;
      const n = Number(value);
      if (!Number.isFinite(n)) return undefined;
      return Math.min(field.max ?? Infinity, Math.max(field.min ?? -Infinity, n));
    }
    case "boolean":
      return value === true || value === "true" ? true : undefined;
    case "multiselect":
    case "tags": {
      const arr = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
      const seen = new Set();
      return arr.map((v) => str(v, 60)).filter((v) => v && !seen.has(v.toLowerCase()) && seen.add(v.toLowerCase())).slice(0, 30);
    }
    case "dimensions": {
      if (!value || typeof value !== "object") return undefined;
      const num = (x) => (x === "" || x == null || !Number.isFinite(Number(x)) ? undefined : Math.max(0, Number(x)));
      const d = { unit: value.unit === "in" ? "in" : "cm" };
      for (const k of ["w", "d", "h"]) if (num(value[k]) !== undefined) d[k] = num(value[k]);
      return d.w || d.d || d.h ? d : undefined;
    }
    case "specs": {
      const rows = Array.isArray(value) ? value : [];
      return rows
        .map((r) => ({ label: str(r?.label, 60), value: str(r?.value, 200) }))
        .filter((r) => r.label && r.value)
        .slice(0, 40);
    }
    case "table": {
      // { columns: ["Size","Chest","Length"], rows: [["S","96","70"], ...] }
      if (!value || typeof value !== "object") return undefined;
      const columns = (Array.isArray(value.columns) ? value.columns : []).map((c) => str(c, 30)).slice(0, 8);
      const rows = (Array.isArray(value.rows) ? value.rows : [])
        .map((r) => (Array.isArray(r) ? r.slice(0, columns.length).map((c) => str(c, 30)) : []))
        .filter((r) => r.some(Boolean))
        .slice(0, 40);
      return columns.filter(Boolean).length && rows.length ? { columns, rows } : undefined;
    }
    default:
      return undefined;
  }
}

// How a stored value reads on the product page.
export function displayFieldValue(field, value, t = (s) => s) {
  if (value === undefined || value === null || value === "") return "";
  switch (field.type) {
    case "boolean":
      return value ? t("Yes") : "";
    case "multiselect":
    case "tags":
      return (value || []).join(", ");
    case "dimensions": {
      const parts = [value.w, value.d, value.h].map((x) => (x ? String(x) : "—"));
      return `${t("W")} ${parts[0]} × ${t("D")} ${parts[1]} × ${t("H")} ${parts[2]} ${value.unit || "cm"}`;
    }
    default:
      return String(value);
  }
}
