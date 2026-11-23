"use client";

import { createContext, useCallback, useContext } from "react";
import { LANG_COOKIE, isLang, setCurrentLang, translate } from "./index";

const LangContext = createContext({ lang: "en", setLang: () => {} });

// `lang` comes from the "lang" cookie, read by the root layout on the server
// so <html lang dir> and the first render already match the user's choice.
export function LangProvider({ lang = "en", children }) {
  // Keep the plain t() (used outside renders, e.g. toasts) in sync.
  setCurrentLang(lang);

  const setLang = useCallback((next) => {
    if (!isLang(next)) return;
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    // A full reload re-renders everything (server layout included) in the
    // new language and direction.
    window.location.reload();
  }, []);

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

// const t = useT();  t("Orders")  t("Page {0} of {1}", { 0: page, 1: total })
export function useT() {
  const { lang } = useContext(LangContext);
  return useCallback((text, vars) => translate(lang, text, vars), [lang]);
}
