"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaChevronLeft } from "react-icons/fa6";
import { useI18n } from "@/lib/i18n/i18n-context";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import M3CircleButton from "@/components/ui/m3-circle-button";

const NAV_ITEMS = [
  { href: "/", i18nKey: "overview-page.title", fallback: "Overview", saveRequired: false },
  { href: "/duplicants", i18nKey: "duplicant.noun_titlecase_plural", fallback: "Duplicants", saveRequired: true },
  { href: "/creatures", i18nKey: "creature.noun_titlecase_plural", fallback: "Creatures", saveRequired: true },
  { href: "/geysers", i18nKey: "geyser.noun_titlecase_plural", fallback: "Geysers", saveRequired: true },
  { href: "/planets", i18nKey: "planet.noun_titlecase_plural", fallback: "Planets", saveRequired: true, implemented: false },
  { href: "/materials", i18nKey: "material.noun_titlecase_plural", fallback: "Materials", saveRequired: true, implemented: false },
  { href: "/raw", i18nKey: "raw-editor-page.title", fallback: "Raw Editor", saveRequired: true },
  { href: "/changelog", i18nKey: "changelog.title", fallback: "Changelog", saveRequired: false },
];

const SAVE_REQUIRED_PATH_PREFIXES = [
  "/duplicants",
  "/duplicants-editor",
  "/creatures",
  "/creatures-editor",
  "/geysers",
  "/raw",
  "/planets",
  "/materials",
];
const UI_VERSION_LABEL = "v4.0.2";
const SAVED_STATUS_DURATION_MS = 3000;

function normalizePathname(pathname) {
  if (!pathname || pathname === "/") {
    return "/";
  }
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function getPageTitle(pathname, t, hasSave) {
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname === "/") {
    return hasSave ? "Save Overview" : t("app.page-title.home", { fallback: "Duplicity V4" });
  }
  if (normalizedPathname.startsWith("/duplicants-editor")) {
    return t("app.page-title.duplicant-editor", { fallback: "Duplicant Editor" });
  }
  if (normalizedPathname.startsWith("/duplicants")) {
    return t("app.page-title.duplicants", { fallback: "Duplicant Management" });
  }
  if (normalizedPathname.startsWith("/creatures")) {
    return t("app.page-title.creatures", { fallback: "Creatures Management" });
  }
  if (normalizedPathname.startsWith("/geysers")) {
    return t("app.page-title.geysers", { fallback: "Geysers Management" });
  }
  if (normalizedPathname.startsWith("/planets")) {
    return t("app.page-title.planets", { fallback: "Planets Management" });
  }
  if (normalizedPathname.startsWith("/materials")) {
    return t("app.page-title.materials", { fallback: "Materials Management" });
  }
  if (normalizedPathname.startsWith("/raw")) {
    return t("raw-editor-page.title", { fallback: "Raw Editor" });
  }
  if (normalizedPathname.startsWith("/settings")) {
    return t("app.page-title.settings", { fallback: "Settings" });
  }
  if (normalizedPathname.startsWith("/changelog")) {
    return t("changelog.title", { fallback: "Changelog" });
  }
  return t("app.page-title.home", { fallback: "Duplicity V4" });
}

function isActive(pathname, href) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function routeRequiresSave(pathname) {
  return SAVE_REQUIRED_PATH_PREFIXES.some((prefix) => {
    if (pathname === prefix) {
      return true;
    }
    return pathname.startsWith(`${prefix}/`);
  });
}

function readDlcIds(saveGame) {
  const gameInfo = saveGame?.header?.gameInfo;
  if (!gameInfo) {
    return [];
  }
  if (Array.isArray(gameInfo.dlcIds) && gameInfo.dlcIds.length > 0) {
    return gameInfo.dlcIds.filter(Boolean);
  }
  if (typeof gameInfo.dlcId === "string" && gameInfo.dlcId.length > 0) {
    return [gameInfo.dlcId];
  }
  return [];
}

function getDlcDisplayName(dlcId) {
  const names = {
    EXPANSION1_ID: "Spaced Out!",
    DLC2_ID: "The Frosty Planet",
    DLC3_ID: "The Bionic Booster",
    DLC4_ID: "The Prehistoric Planet",
  };
  return names[dlcId] || dlcId;
}

function getErrorGuidance(error, t) {
  const code = error?.code;
  if (code === "E_VERSION_MINOR") {
    return {
      title: t("app.error.minor-version.title", { fallback: "Minor version mismatch" }),
      detail: t("app.error.minor-version.detail", {
        fallback:
          "The save minor version is newer than expected. You can retry with the same strictness or force-load with major strictness.",
      }),
    };
  }
  if (code === "E_VERSION_MAJOR") {
    return {
      title: t("app.error.major-version.title", { fallback: "Major version mismatch" }),
      detail: t("app.error.major-version.detail", {
        fallback:
          "The parser does not support this major save format yet. Usually this needs parser updates before loading safely.",
      }),
    };
  }
  return {
    title: t("app.error.generic.title", { fallback: "Operation failed" }),
    detail: t("app.error.generic.detail", {
      fallback: "See error details below. You can retry or dismiss this error.",
    }),
  };
}

function clampPercent(value) {
  if (!Number.isFinite(value)) {
    return null;
  }
  if (value <= 1) {
    return Math.max(0, Math.min(100, value * 100));
  }
  return Math.max(0, Math.min(100, value));
}

function parseProgressMessage(status, message, t) {
  const fallbackMessage =
    status === "loading"
      ? t("app.progress.reading", { fallback: "Reading save data..." })
      : t("app.progress.writing", { fallback: "Writing save data..." });

  if (typeof message === "string") {
    const text = message.trim();
    if (!text) {
      return { text: fallbackMessage, percent: null };
    }
    const percentMatch = text.match(/(\d{1,3})(?:\.\d+)?\s*%/);
    if (percentMatch) {
      return { text, percent: clampPercent(Number(percentMatch[1])) };
    }
    const fractionMatch = text.match(/(\d+)\s*\/\s*(\d+)/);
    if (fractionMatch) {
      const current = Number(fractionMatch[1]);
      const total = Number(fractionMatch[2]);
      if (total > 0) {
        return { text, percent: clampPercent((current / total) * 100) };
      }
    }
    return { text, percent: null };
  }

  if (message && typeof message === "object") {
    const text =
      message.message ||
      message.stage ||
      message.phase ||
      message.status ||
      fallbackMessage;

    let percent =
      clampPercent(message.percent) ??
      clampPercent(message.progress) ??
      clampPercent(message.percentage);

    if (percent === null && Number.isFinite(message.current) && Number.isFinite(message.total)) {
      if (message.total > 0) {
        percent = clampPercent((message.current / message.total) * 100);
      }
    }

    return {
      text: String(text).trim() || fallbackMessage,
      percent,
    };
  }

  return { text: fallbackMessage, percent: null };
}

function LoadingDialog({ status, message, fileName, t }) {
  if (status !== "loading" && status !== "saving") {
    return null;
  }

  const title =
    status === "loading"
      ? t("save-file.conditions.loading", { fallback: "Loading" })
      : t("save-file.conditions.saving", { fallback: "Saving" });
  const progress = parseProgressMessage(status, message, t);
  const roundedPercent = progress.percent === null ? null : Math.round(progress.percent);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="pointer-events-auto m3-surface-raised w-full max-w-md p-5">
        <h3 className="text-xl font-semibold">{title}</h3>
        {fileName ? (
          <p className="mt-1 text-xs opacity-70">
            {t("app.file-label", { fallback: "File" })}: <code>{fileName}</code>
          </p>
        ) : null}
        <div className="mt-4 flex items-center justify-between gap-3 text-sm opacity-85">
          <p className="min-w-0 truncate">{progress.text}</p>
          {roundedPercent !== null ? (
            <span className="shrink-0 text-xs font-semibold opacity-80">{roundedPercent}%</span>
          ) : null}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-container-highest)]">
          {roundedPercent !== null ? (
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-150 ease-out"
              style={{ width: `${progress.percent}%` }}
            />
          ) : (
            <div className="m3-progress-indeterminate h-full rounded-full bg-[var(--accent)]" />
          )}
        </div>
      </div>
    </div>
  );
}

function ImportWarningDialog({ warning, onConfirm, onCancel, t }) {
  if (!warning) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="m3-surface-raised w-full max-w-lg p-5">
        <h3 className="text-xl font-semibold">
          {t("app.import-warning.title", { fallback: "Checksum Warning" })}
        </h3>
        <p className="mt-2 text-sm opacity-85">
          {t("app.import-warning.detail", {
            fallback: "Import file checksum does not match the payload. Data may have been modified.",
          })}
        </p>
        <p className="mt-2 text-xs opacity-75">
          {t("app.file-label", { fallback: "File" })}: <code>{warning.fileName || "import.json"}</code>
        </p>
        <p className="mt-1 text-xs opacity-75">
          {t("app.expected", { fallback: "Expected" })}: <code>{warning.expectedHash || "N/A"}</code>
        </p>
        <p className="mt-1 text-xs opacity-75">
          {t("app.actual", { fallback: "Actual" })}: <code>{warning.actualHash || "N/A"}</code>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="m3-button m3-button-outlined px-3 py-2 text-sm"
          >
            {t("dialog.verbs.cancel_titlecase", { fallback: "Cancel" })}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="m3-button m3-button-tonal px-3 py-2 text-sm"
          >
            {t("app.import-warning.import-anyway", { fallback: "Import Anyway" })}
          </button>
        </div>
      </div>
    </div>
  );
}

function BackupPromptDialog({ open, onConfirm, onSkip, onCancel, t }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="m3-surface-raised w-full max-w-lg p-5">
        <h3 className="text-xl font-semibold">
          {t("app.backup.title", { fallback: "Download Backup Save File?" })}
        </h3>
        <p className="mt-2 text-sm opacity-85">
          {t("app.backup.detail", {
            fallback:
              "You're about to overwrite the current save file. Do you want to download a backup first?",
          })}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="m3-button m3-button-outlined px-3 py-2 text-sm"
          >
            {t("dialog.verbs.cancel_titlecase", { fallback: "Cancel" })}
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="m3-button m3-button-outlined px-3 py-2 text-sm"
          >
            {t("app.backup.skip", { fallback: "Skip Backup" })}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="m3-button m3-button-tonal px-3 py-2 text-sm"
          >
            {t("app.backup.confirm", { fallback: "Download Backup & Save" })}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const normalizedPathname = useMemo(() => normalizePathname(pathname), [pathname]);
  const isDuplicantEditor = normalizedPathname.startsWith("/duplicants-editor");
  const fileInputRef = useRef(null);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [showSavedState, setShowSavedState] = useState(false);
  const savedStatusTimeoutRef = useRef(null);
  const {
    status,
    progressMessage,
    error,
    hasSave,
    saveGame,
    isBusy,
    isModified,
    fileHandle,
    canForceLoad,
    pendingFile,
    lastLoadAttemptStrictness,
    parseStrictness,
    loadSaveFile,
    loadSaveWithPicker,
    retryLoadPendingFile,
    forceLoadPendingFile,
    saveCurrentFile,
    clearError,
    importWarning,
    confirmImportWarning,
    fileName,
  } = useSaveSession();
  const previousStatusRef = useRef(status);
  const pageTitle = useMemo(() => getPageTitle(pathname, t, hasSave), [hasSave, pathname, t]);

  const dlcIds = useMemo(() => readDlcIds(saveGame), [saveGame]);
  const dlcNames = useMemo(() => dlcIds.map(getDlcDisplayName), [dlcIds]);
  const dlcHoverText = useMemo(() => {
    if (!hasSave) {
      return t("app.dlc.not-loaded", { fallback: "Load a save to read DLC information." });
    }
    if (dlcNames.length === 0) {
      return t("app.dlc.none", { fallback: "No DLC detected." });
    }
    return dlcNames.join("\n");
  }, [dlcNames, hasSave, t]);
  const errorGuidance = useMemo(() => getErrorGuidance(error, t), [error, t]);
  const statusText = useMemo(
    () => t(`app.status.${status}`, { fallback: status }),
    [status, t]
  );

  const onLoadButtonClick = async () => {
    const usedEnhancedPicker = await loadSaveWithPicker({
      versionStrictness: parseStrictness,
    });
    if (!usedEnhancedPicker && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const onSaveButtonClick = () => {
    if (isBusy || !hasSave) {
      return;
    }
    if (fileHandle) {
      setShowBackupPrompt(true);
      return;
    }
    saveCurrentFile();
  };

  const onBackupConfirm = () => {
    setShowBackupPrompt(false);
    saveCurrentFile({ backup: true, inPlace: true });
  };

  const onBackupSkip = () => {
    setShowBackupPrompt(false);
    saveCurrentFile({ backup: false, inPlace: true });
  };

  const onBackupCancel = () => {
    setShowBackupPrompt(false);
  };

  const onFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await loadSaveFile(file, { versionStrictness: parseStrictness });
    event.target.value = "";
  };

  useEffect(() => {
    if (isBusy) {
      return;
    }
    if (!hasSave && routeRequiresSave(normalizedPathname)) {
      router.replace("/");
    }
  }, [hasSave, isBusy, normalizedPathname, router]);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    if (previousStatus === "saving" && status === "ready" && hasSave) {
      setShowSavedState(true);
      if (savedStatusTimeoutRef.current) {
        clearTimeout(savedStatusTimeoutRef.current);
      }
      savedStatusTimeoutRef.current = setTimeout(() => {
        setShowSavedState(false);
        savedStatusTimeoutRef.current = null;
      }, SAVED_STATUS_DURATION_MS);
    }
    if (
      previousStatus === "loading" &&
      status === "ready" &&
      normalizedPathname !== "/"
    ) {
      router.replace("/");
    }
    previousStatusRef.current = status;
  }, [hasSave, normalizedPathname, router, status]);

  useEffect(() => {
    if (!isModified) {
      return;
    }
    setShowSavedState(false);
    if (savedStatusTimeoutRef.current) {
      clearTimeout(savedStatusTimeoutRef.current);
      savedStatusTimeoutRef.current = null;
    }
  }, [isModified]);

  useEffect(
    () => () => {
      if (savedStatusTimeoutRef.current) {
        clearTimeout(savedStatusTimeoutRef.current);
      }
    },
    []
  );

  const saveFileStatus = useMemo(() => {
    if (!hasSave) {
      return {
        label: t("app.save-file.not-loaded", { fallback: "Not Loaded" }),
        chipClass: "border-white/20 bg-white/5",
        valueClass: "",
      };
    }
    if (isModified) {
      return {
        label: t("save-file.conditions.modified", { fallback: "Modified" }),
        chipClass: "border-[var(--outline-strong)] bg-[var(--state-hover)]",
        valueClass: "font-bold text-[var(--accent)]",
      };
    }
    if (showSavedState) {
      return {
        label: t("app.save-file.saved", { fallback: "Saved" }),
        chipClass: "border-emerald-300/45 bg-emerald-500/12",
        valueClass: "font-bold text-[var(--success)]",
      };
    }
    return {
      label: t("app.save-file.clean", { fallback: "Clean" }),
      chipClass: "border-emerald-300/45 bg-emerald-500/12",
      valueClass: "text-[var(--success)]",
    };
  }, [hasSave, isModified, showSavedState, t]);

  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground">
      <LoadingDialog
        status={status}
        message={progressMessage}
        fileName={pendingFile?.name || fileName}
        t={t}
      />
      <ImportWarningDialog
        warning={importWarning}
        onCancel={() => confirmImportWarning(false)}
        onConfirm={() => confirmImportWarning(true)}
        t={t}
      />
      <BackupPromptDialog
        open={showBackupPrompt}
        onConfirm={onBackupConfirm}
        onSkip={onBackupSkip}
        onCancel={onBackupCancel}
        t={t}
      />
      <div className="mx-auto flex h-full w-full max-w-[1432px] flex-col p-3">
        <div className="flex min-h-0 flex-1 gap-4">
          <aside className="m3-surface hidden h-full w-64 overflow-y-auto p-4 md:flex md:flex-col">
            <h1 className="text-lg font-semibold">Duplicity</h1>
            <p className="mt-2 text-xs uppercase tracking-wide opacity-70">
              {t("app.status-label", { fallback: "Status" })}: {statusText}
            </p>
            <nav className="mt-5 space-y-1">
              {NAV_ITEMS.map((item) => {
                const saveLocked = item.saveRequired && !hasSave;
                const disabled = saveLocked || item.implemented === false;
                const active = isActive(pathname, item.href);
                if (disabled) {
                  return (
                    <span
                      key={item.href}
                      className="m3-nav-item m3-nav-item-disabled block px-3 py-2 text-sm"
                      title={
                        item.implemented === false
                          ? t("app.nav.planned-title", {
                              fallback: "Planned but not implemented in V4 yet.",
                            })
                          : t("app.nav.load-save-first", { fallback: "Load a save first." })
                      }
                    >
                      {t(item.i18nKey, { fallback: item.fallback })}
                    </span>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`m3-nav-item block px-3 py-2 text-sm ${
                      active ? "m3-nav-item-active" : ""
                    }`}
                  >
                    {t(item.i18nKey, { fallback: item.fallback })}
                  </Link>
                );
              })}
            </nav>
            <p className="mt-auto pt-5 text-center text-[10px] tracking-wide opacity-55">
              {UI_VERSION_LABEL}
            </p>
          </aside>

          <div className="m3-surface flex min-h-0 w-full flex-col overflow-hidden md:max-w-[1136px]">
            <header className="border-b border-[var(--outline)] bg-[var(--surface)] px-4 py-3 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <div className="mr-auto flex items-center gap-2">
                  {isDuplicantEditor ? (
                    <M3CircleButton
                      href="/duplicants"
                      aria-label="Back to Duplicant Management"
                      title="Back to Duplicant Management"
                    >
                      <FaChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
                    </M3CircleButton>
                  ) : null}
                  <h2 className="text-lg font-semibold">{pageTitle}</h2>
                </div>
                <Link
                  href="/settings"
                  className="m3-button m3-button-outlined px-3 py-2 text-sm"
                >
                  {t("app.page-title.settings", { fallback: "Settings" })}
                </Link>
                <button
                  type="button"
                  onClick={onLoadButtonClick}
                  disabled={isBusy}
                  className="m3-button m3-button-outlined px-3 py-2 text-sm"
                >
                  {t("save-file.verbs.load_titlecase", { fallback: "Load" })}
                </button>
                <button
                  type="button"
                  onClick={onSaveButtonClick}
                  disabled={isBusy || !hasSave}
                  className="m3-button m3-button-tonal px-3 py-2 text-sm"
                >
                  {t("save-file.verbs.save_titlecase", { fallback: "Save" })}
                </button>
              </div>
              {error?.message ? (
                <div className="mt-3 rounded-lg border border-red-300/40 bg-[var(--error-surface)] p-3 text-sm">
                  <p className="font-semibold text-[var(--error)]">{errorGuidance.title}</p>
                  <p className="mt-1 text-xs text-[var(--error)]/90">{errorGuidance.detail}</p>
                  <p className="mt-1 text-xs text-[var(--error)]/90">
                    {error.message}
                    {error.code ? (
                      <>
                        {" "}
                        (<code>{error.code}</code>)
                      </>
                    ) : null}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pendingFile ? (
                      <button
                        type="button"
                        onClick={retryLoadPendingFile}
                        disabled={isBusy}
                        className="m3-button m3-button-outlined border-red-200/60 px-2 py-1 text-xs text-[var(--error)]"
                      >
                        Retry ({lastLoadAttemptStrictness})
                      </button>
                    ) : null}
                    {canForceLoad ? (
                      <button
                        type="button"
                        onClick={forceLoadPendingFile}
                        disabled={isBusy}
                        className="m3-button m3-button-outlined border-red-200/60 px-2 py-1 text-xs text-[var(--error)]"
                      >
                        {t("app.error.force-load-major", { fallback: "Force Load (major)" })}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={clearError}
                      className="m3-button m3-button-outlined border-red-200/60 px-2 py-1 text-xs text-[var(--error)]"
                    >
                      {t("app.error.dismiss", { fallback: "Dismiss" })}
                    </button>
                  </div>
                </div>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept=".sav"
                className="hidden"
                onChange={onFileChange}
              />
            </header>
            <main className="flex-1 overflow-auto bg-[var(--surface-container)] px-4 py-6">
              {children}
            </main>
          </div>
        </div>
        <footer className="m3-surface mt-3 px-4 py-3 text-xs opacity-80 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className="m3-chip bg-[var(--surface-container-high)] px-2 py-1"
              title={dlcHoverText}
            >
              {t("app.dlc.found", {
                fallback: "DLC Found: {count}",
                params: { count: hasSave ? dlcNames.length : 0 },
              })}
            </span>
            <span className="mx-auto text-center">Rewritten by cLonata with ♥</span>
            <span
              className={`m3-chip px-2 py-1 ${saveFileStatus.chipClass}`}
            >
              <span>{t("app.save-file.label", { fallback: "Save File" })}: </span>
              <span className={saveFileStatus.valueClass}>{saveFileStatus.label}</span>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
