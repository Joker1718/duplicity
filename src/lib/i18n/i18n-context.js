"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, translate } from "@/lib/i18n/catalog";

const STORAGE_KEY = "duplicity.language";

const FALLBACK_LANGUAGE_NAMES = {
  en: "English",
};

const I18nContext = createContext(null);

function normalizeLocale(value) {
  if (typeof value !== "string") {
    return DEFAULT_LOCALE;
  }
  const base = value.toLowerCase().split("-")[0];
  return SUPPORTED_LOCALES.includes(base) ? base : DEFAULT_LOCALE;
}

function toDisplayName(localeCode, displayLocale) {
  try {
    if (typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function") {
      const formatter = new Intl.DisplayNames([displayLocale], { type: "language" });
      const value = formatter.of(localeCode);
      if (value) {
        return value.charAt(0).toUpperCase() + value.slice(1);
      }
    }
  } catch {
    // Use fallback labels when Intl.DisplayNames is unavailable.
  }
  return FALLBACK_LANGUAGE_NAMES[localeCode] || localeCode;
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);

  useEffect(() => {
    let nextLocale = DEFAULT_LOCALE;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        nextLocale = normalizeLocale(stored);
      } else if (typeof navigator?.language === "string") {
        nextLocale = normalizeLocale(navigator.language);
      }
    } catch {
      nextLocale = DEFAULT_LOCALE;
    }
    setLocaleState(nextLocale);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Ignore localStorage write failures.
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((nextLocale) => {
    setLocaleState(normalizeLocale(nextLocale));
  }, []);

  const t = useCallback(
    (key, options = {}) => translate(locale, key, options),
    [locale]
  );

  const languages = useMemo(() => {
    return SUPPORTED_LOCALES
      .map((code) => ({
        code,
        label: toDisplayName(code, locale),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      languages,
      supportedLocales: SUPPORTED_LOCALES,
    }),
    [locale, setLocale, t, languages]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
