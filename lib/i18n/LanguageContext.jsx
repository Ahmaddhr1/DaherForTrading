"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { translations } from "./translations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState("en");
  const [isReady, setIsReady] = useState(false);

  // Load the saved preference once on mount (client-only, so this can't be
  // read during server rendering - the app briefly renders LTR/English
  // before hydration picks up a saved Arabic preference).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("language");
      if (stored === "ar" || stored === "en") {
        setLanguageState(stored);
      }
    } catch {
      // localStorage unavailable (private mode, etc.) - default to English.
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang);
    try {
      window.localStorage.setItem("language", lang);
    } catch {
      // Ignore - preference just won't persist across reloads.
    }
  }, []);

  const t = useCallback(
    (key) => translations[language]?.[key] ?? translations.en?.[key] ?? key,
    [language]
  );

  const value = {
    language,
    setLanguage,
    t,
    dir: language === "ar" ? "rtl" : "ltr",
    isReady,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
