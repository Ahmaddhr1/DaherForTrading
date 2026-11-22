// App-wide i18n. English is the source text in the code; ar.js maps each
// English string to Arabic. Anything without an entry falls back to the
// English text, so a missing translation shows English instead of breaking.
//
//   t("Orders")                          -> "الطلبات"
//   t("Page {0} of {1}", { 0: 2, 1: 5 }) -> "الصفحة 2 من 5"
//
// Components get `t` from useT() (lib/i18n/LangProvider.jsx), which follows
// the current language. The plain `t` exported here is for code outside a
// component render (toasts in event handlers, helpers): it reads the language
// the provider last rendered with.
import AR from "./ar";

export const LANGS = ["en", "ar"];
export const LANG_COOKIE = "lang";
export const isLang = (v) => LANGS.includes(v);
export const dirFor = (lang) => (lang === "ar" ? "rtl" : "ltr");

let currentLang = "en";
export function setCurrentLang(lang) {
  currentLang = isLang(lang) ? lang : "en";
}
export function getCurrentLang() {
  if (typeof document !== "undefined" && isLang(document.documentElement.lang)) {
    return document.documentElement.lang;
  }
  return currentLang;
}

function interpolate(text, vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, key) =>
    vars[key] === undefined || vars[key] === null ? m : String(vars[key])
  );
}

export function translate(lang, text, vars) {
  if (typeof text !== "string") return text;
  if (lang === "ar") {
    const key = text.trim();
    // An empty-string translation is valid (e.g. the English plural "s").
    if (Object.prototype.hasOwnProperty.call(AR, key)) {
      const hit = AR[key];
      // keep surrounding spaces the source string had
      const lead = text.match(/^\s*/)[0];
      const trail = text.match(/\s*$/)[0];
      return interpolate(lead + hit + trail, vars);
    }
  }
  return interpolate(text, vars);
}

// Locale for Date#toLocale*String: Arabic month/day names with Western
// digits when Arabic is selected, the browser default otherwise.
export function dateLocale() {
  return getCurrentLang() === "ar" ? "ar-LB-u-nu-latn" : undefined;
}

export function t(text, vars) {
  return translate(getCurrentLang(), text, vars);
}
