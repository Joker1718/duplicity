"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { useSaveSession } from "@/lib/save-session/save-session-context";

const NAV_ITEMS = [
  { href: "/", label: "Overview", saveRequired: false },
  { href: "/duplicants", label: "Duplicants", saveRequired: true },
  { href: "/creatures", label: "Creatures", saveRequired: true },
  { href: "/geysers", label: "Geysers", saveRequired: true },
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
    isBusy,
    isModified,
    loadSaveFile,
    saveCurrentFile,
  } = useSaveSession();

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
      <div className="mx-auto flex min-h-screen w-full max-w-7xl">
        <aside className="hidden w-64 border-r border-black/10 p-4 dark:border-white/15 md:block">
          <h1 className="text-lg font-semibold">Duplicity</h1>
          <p className="mt-1 text-xs opacity-70">V4 Migration</p>
          <nav className="mt-6 space-y-1">
            {NAV_ITEMS.map((item) => {
              const disabled = item.saveRequired && !hasSave;
              const active = isActive(pathname, item.href);
              if (disabled) {
                return (
                  <span
                    key={item.href}
                    className="block rounded-md px-3 py-2 text-sm opacity-40"
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
                className="rounded-md border border-black/20 px-3 py-2 text-sm hover:bg-black/5 dark:border-white/25 dark:hover:bg-white/10"
              >
                Settings
              </Link>
              <button
                type="button"
                onClick={onLoadButtonClick}
                disabled={isBusy}
                className="rounded-md border border-black/20 px-3 py-2 text-sm font-semibold hover:bg-black/5 disabled:opacity-50 dark:border-white/25 dark:hover:bg-white/10"
              >
                Load Save
              </button>
              <button
                type="button"
                onClick={() => saveCurrentFile()}
                disabled={isBusy || !hasSave}
                className="rounded-md bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-black/85 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/85"
              >
                Save
              </button>
              <select
                value={strictness}
                onChange={(event) => setStrictness(event.target.value)}
                className="rounded-md border border-black/20 bg-transparent px-2 py-2 text-sm dark:border-white/25"
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
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs opacity-80">
              <span>Status: {status}</span>
              {progressMessage ? <span>Progress: {progressMessage}</span> : null}
              {error?.message ? (
                <span className="text-red-700 dark:text-red-300">
                  Error: {error.message}
                </span>
              ) : null}
            </div>
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
