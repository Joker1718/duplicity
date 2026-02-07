"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n/i18n-context";

export default function SettingsPage() {
  const { locale, setLocale, languages, supportedLocales, t } = useI18n();
  const currentLanguageLabel = useMemo(
    () => languages.find((entry) => entry.code === locale)?.label || locale,
    [languages, locale]
  );

  return (
    <section className="rounded-xl border border-black/10 p-5 dark:border-white/15">
      <h1 className="text-2xl font-semibold">
        {t("app.page-title.settings", { fallback: "Settings" })}
      </h1>
      <p className="mt-2 text-sm opacity-80">
        {t("settings.language.description", {
          fallback: "Choose your UI language. This preference is saved in your browser.",
        })}
      </p>

      <div className="mt-5 max-w-md rounded-xl border border-white/20 p-4">
        <label className="text-sm font-semibold" htmlFor="language-select">
          {t("settings.language.title", { fallback: "Language" })}
        </label>
        <select
          id="language-select"
          className="m3-field mt-2 w-full px-3 py-2 text-sm"
          value={locale}
          onChange={(event) => setLocale(event.target.value)}
        >
          {languages.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.label}
            </option>
          ))}
        </select>
        <p className="mt-3 text-xs opacity-75">
          {t("settings.language.current", {
            fallback: "Current language: {language}",
            params: { language: currentLanguageLabel },
          })}
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-white/15 p-4 text-xs opacity-75">
        <p>
          {t("settings.i18n.namespaces", { fallback: "Loaded namespaces: common, oni" })}
        </p>
        <p className="mt-1">
          {t("settings.i18n.languages", {
            fallback: "Supported language packs: {languages}",
            params: { languages: supportedLocales.join(", ") },
          })}
        </p>
      </div>
    </section>
  );
}
