"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useSaveSession } from "@/lib/save-session/save-session-context";

const NAV_ITEMS = [
  { href: "/", label: "Overview", saveRequired: false },
  { href: "/duplicants", label: "Duplicants", saveRequired: true },
  { href: "/creatures", label: "Creatures", saveRequired: true },
  { href: "/geysers", label: "Geysers", saveRequired: true },
  { href: "/planets", label: "Planets", saveRequired: true, implemented: false },
  { href: "/materials", label: "Materials", saveRequired: true, implemented: false },
  { href: "/raw", label: "Raw Editor", saveRequired: true },
  { href: "/changelog", label: "Changelog", saveRequired: false },
];

function getPageTitle(pathname) {
  if (!pathname || pathname === "/") {
    return "Overview";
  }
  if (pathname.startsWith("/duplicants/")) {
    return "Edit Duplicant";
  }
  if (pathname.startsWith("/creatures/")) {
    return "Edit Creature";
  }
  if (pathname === "/duplicants-editor") {
    return "Edit Duplicant";
  }
  if (pathname === "/creatures-editor") {
    return "Edit Creature";
  }
  if (pathname === "/duplicants") {
    return "Duplicants";
  }
  if (pathname === "/creatures") {
    return "Creatures";
  }
  if (pathname === "/geysers") {
    return "Geysers";
  }
  if (pathname === "/planets") {
    return "Planets";
  }
  if (pathname === "/materials") {
    return "Materials";
  }
  if (pathname === "/raw") {
    return "Raw Editor";
  }
  if (pathname === "/settings") {
    return "Settings";
  }
  if (pathname === "/changelog") {
    return "Changelog";
  }
  return "Duplicity V4";
}

function isActive(pathname, href) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
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

function formatDlcSummary(dlcIds) {
  if (!Array.isArray(dlcIds) || dlcIds.length === 0) {
    return "Base Game";
  }
  if (dlcIds.length <= 2) {
    return dlcIds.join(", ");
  }
  return `${dlcIds[0]}, ${dlcIds[1]} +${dlcIds.length - 2}`;
}

function getErrorGuidance(error) {
  const code = error?.code;
  if (code === "E_VERSION_MINOR") {
    return {
      title: "Minor version mismatch",
      detail:
        "The save minor version is newer than expected. You can retry with the same strictness or force-load with major strictness.",
    };
  }
  if (code === "E_VERSION_MAJOR") {
    return {
      title: "Major version mismatch",
      detail:
        "The parser does not support this major save format yet. Usually this needs parser updates before loading safely.",
    };
  }
  return {
    title: "Operation failed",
    detail: "See error details below. You can retry or dismiss this error.",
  };
}

function LoadingDialog({ status, message, fileName }) {
  if (status !== "loading" && status !== "saving") {
    return null;
  }

  const title = status === "loading" ? "Loading Save" : "Saving Save";

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="pointer-events-auto m3-surface-raised w-full max-w-md p-5">
        <h3 className="text-xl font-semibold">{title}</h3>
        {fileName ? (
          <p className="mt-1 text-xs opacity-70">
            File: <code>{fileName}</code>
          </p>
        ) : null}
        <p className="mt-4 text-sm opacity-85">{message || "Processing..."}</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--surface-container-highest)]">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[var(--accent)]" />
        </div>
      </div>
    </div>
  );
}

function ImportWarningDialog({ warning, onConfirm, onCancel }) {
  if (!warning) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="m3-surface-raised w-full max-w-lg p-5">
        <h3 className="text-xl font-semibold">Checksum Warning</h3>
        <p className="mt-2 text-sm opacity-85">
          Import file checksum does not match the payload. Data may have been modified.
        </p>
        <p className="mt-2 text-xs opacity-75">
          File: <code>{warning.fileName || "import.json"}</code>
        </p>
        <p className="mt-1 text-xs opacity-75">
          Expected: <code>{warning.expectedHash || "N/A"}</code>
        </p>
        <p className="mt-1 text-xs opacity-75">
          Actual: <code>{warning.actualHash || "N/A"}</code>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="m3-button m3-button-outlined px-3 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="m3-button m3-button-tonal px-3 py-2 text-sm"
          >
            Import Anyway
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const fileInputRef = useRef(null);
  const [strictness, setStrictness] = useState("major");
  const {
    status,
    progressMessage,
    error,
    hasSave,
    saveGame,
    isBusy,
    isModified,
    canForceLoad,
    pendingFile,
    lastLoadAttemptStrictness,
    loadSaveFile,
    retryLoadPendingFile,
    forceLoadPendingFile,
    saveCurrentFile,
    clearError,
    importWarning,
    confirmImportWarning,
    fileName,
  } = useSaveSession();

  const dlcIds = useMemo(() => readDlcIds(saveGame), [saveGame]);
  const errorGuidance = useMemo(() => getErrorGuidance(error), [error]);

  const onLoadButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const onFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await loadSaveFile(file, { versionStrictness: strictness });
    event.target.value = "";
  };

  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground">
      <LoadingDialog
        status={status}
        message={progressMessage}
        fileName={pendingFile?.name || fileName}
      />
      <ImportWarningDialog
        warning={importWarning}
        onCancel={() => confirmImportWarning(false)}
        onConfirm={() => confirmImportWarning(true)}
      />
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col p-3">
        <div className="flex min-h-0 flex-1 gap-4">
          <aside className="m3-surface hidden h-full w-64 overflow-y-auto p-4 md:block">
          <h1 className="text-lg font-semibold">Duplicity</h1>
          <p className="mt-1 text-xs opacity-70">V4 Migration</p>
          <nav className="mt-6 space-y-1">
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
                        ? "Planned but not implemented in V4 yet."
                        : "Load a save first."
                    }
                  >
                    {item.label}
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
                  {item.label}
                </Link>
              );
            })}
          </nav>
          </aside>

          <div className="m3-surface flex min-h-0 w-full flex-col overflow-hidden">
            <header className="border-b border-[var(--outline)] bg-[var(--surface)] px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="mr-auto text-lg font-semibold">{pageTitle}</h2>
              <Link
                href="/settings"
                className="m3-button m3-button-outlined px-3 py-2 text-sm"
              >
                Settings
              </Link>
              <button
                type="button"
                onClick={onLoadButtonClick}
                disabled={isBusy}
                className="m3-button m3-button-outlined px-3 py-2 text-sm"
              >
                Load Save
              </button>
              <button
                type="button"
                onClick={() => saveCurrentFile()}
                disabled={isBusy || !hasSave}
                className="m3-button m3-button-tonal px-3 py-2 text-sm"
              >
                Save
              </button>
              <select
                value={strictness}
                onChange={(event) => setStrictness(event.target.value)}
                className="m3-field px-2 py-2 text-sm"
                title="Parser version strictness"
              >
                <option value="major">major</option>
                <option value="minor">minor</option>
                <option value="none">none</option>
              </select>
              {hasSave ? (
                <span
                  className={`m3-chip px-2 py-1 text-xs ${
                    isModified
                      ? "border-amber-300/50 bg-amber-500/15 text-[var(--warning)]"
                      : "border-emerald-300/45 bg-emerald-500/12 text-[var(--success)]"
                  }`}
                >
                  {isModified ? "Modified" : "Clean"}
                </span>
              ) : null}
              {hasSave ? (
                <span className="m3-chip bg-[var(--surface-container-high)] px-2 py-1 text-xs">
                  DLC: {formatDlcSummary(dlcIds)}
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs opacity-80">
              <span>Status: {status}</span>
              {progressMessage ? <span>Progress: {progressMessage}</span> : null}
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
                      Force Load (major)
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={clearError}
                    className="m3-button m3-button-outlined border-red-200/60 px-2 py-1 text-xs text-[var(--error)]"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept=".sav,application/octet-stream"
              className="hidden"
              onChange={onFileChange}
            />
            </header>
            <main className="flex-1 overflow-auto bg-[var(--surface-container)] px-4 py-6 sm:px-6">
              {children}
            </main>
          </div>
        </div>
        <footer className="m3-surface mt-3 px-4 py-3 text-center text-xs opacity-80 sm:px-6">
          Rewritten by cLonata with ♥
        </footer>
      </div>
    </div>
  );
}
