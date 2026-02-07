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
      <div className="pointer-events-auto w-full max-w-md rounded-xl border border-white/25 bg-black p-5 shadow-2xl">
        <h3 className="text-xl font-semibold">{title}</h3>
        {fileName ? (
          <p className="mt-1 text-xs opacity-70">
            File: <code>{fileName}</code>
          </p>
        ) : null}
        <p className="mt-4 text-sm opacity-85">{message || "Processing..."}</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15">
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
      <div className="w-full max-w-lg rounded-xl border border-white/25 bg-black p-5 shadow-2xl">
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
            className="rounded-md border border-white/30 px-3 py-2 text-sm font-semibold hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-black hover:brightness-110"
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
    <div className="min-h-screen bg-background text-foreground">
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
      <div className="mx-auto flex min-h-screen w-full max-w-7xl">
        <aside className="hidden w-64 border-r border-black/10 p-4 dark:border-white/15 md:block">
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
                    className="block rounded-md px-3 py-2 text-sm opacity-40"
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
                  className={`block rounded-md px-3 py-2 text-sm ${
                    active
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-screen w-full flex-col">
          <header className="border-b border-black/10 px-4 py-3 dark:border-white/15 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="mr-auto text-lg font-semibold">{pageTitle}</h2>
              <Link
                href="/settings"
                className="rounded-md border border-white/25 px-3 py-2 text-sm hover:bg-white/10"
              >
                Settings
              </Link>
              <button
                type="button"
                onClick={onLoadButtonClick}
                disabled={isBusy}
                className="rounded-md border border-white/25 px-3 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
              >
                Load Save
              </button>
              <button
                type="button"
                onClick={() => saveCurrentFile()}
                disabled={isBusy || !hasSave}
                className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-50"
              >
                Save
              </button>
              <select
                value={strictness}
                onChange={(event) => setStrictness(event.target.value)}
                className="rounded-md border border-white/25 bg-black px-2 py-2 text-sm"
                title="Parser version strictness"
              >
                <option value="major">major</option>
                <option value="minor">minor</option>
                <option value="none">none</option>
              </select>
              {hasSave ? (
                <span
                  className={`rounded px-2 py-1 text-xs ${
                    isModified
                      ? "bg-amber-500/25 text-amber-700 dark:text-amber-200"
                      : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-200"
                  }`}
                >
                  {isModified ? "Modified" : "Clean"}
                </span>
              ) : null}
              {hasSave ? (
                <span className="rounded bg-white/10 px-2 py-1 text-xs">
                  DLC: {formatDlcSummary(dlcIds)}
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs opacity-80">
              <span>Status: {status}</span>
              {progressMessage ? <span>Progress: {progressMessage}</span> : null}
            </div>
            {error?.message ? (
              <div className="mt-3 rounded-lg border border-red-500/35 bg-red-500/10 p-3 text-sm">
                <p className="font-semibold text-red-200">{errorGuidance.title}</p>
                <p className="mt-1 text-xs text-red-100/90">{errorGuidance.detail}</p>
                <p className="mt-1 text-xs text-red-100/90">
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
                      className="rounded-md border border-red-200/50 px-2 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      Retry ({lastLoadAttemptStrictness})
                    </button>
                  ) : null}
                  {canForceLoad ? (
                    <button
                      type="button"
                      onClick={forceLoadPendingFile}
                      disabled={isBusy}
                      className="rounded-md border border-red-200/50 px-2 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      Force Load (major)
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={clearError}
                    className="rounded-md border border-red-200/50 px-2 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/20"
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
          <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
