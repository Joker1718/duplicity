"use client";

import { useMemo } from "react";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import M3Select from "@/components/ui/m3-select";
import {
  getDifficultySettingLabel,
  getDifficultyValueLabel,
  selectDifficultySettings,
} from "@/lib/oni/save-selectors";

const SAVE_PATHS = {
  windows: "C:\\Users\\<Your Username>\\Documents\\Klei\\OxygenNotIncluded\\save_files\\",
  mac: "~/Library/Application Support/unity.Klei.Oxygen Not Included/save_files/",
  linux: "~/.config/unity3d/Klei/Oxygen Not Included/save_files/",
};

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "N/A";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function makeOverviewSummary(session) {
  const gameInfo = session.saveGame?.header?.gameInfo ?? {};
  return {
    fileName: session.fileName ?? "Unknown",
    parseTimeMs: session.parseTimeMs ?? "Unknown",
    colony: gameInfo.baseName ?? "Unknown",
    cycles: gameInfo.numberOfCycles ?? "Unknown",
    duplicants: gameInfo.numberOfDuplicants ?? "Unknown",
    version: `${gameInfo.saveMajorVersion ?? "?"}.${gameInfo.saveMinorVersion ?? "?"}`,
    cluster: gameInfo.clusterId ?? "Unknown",
    autoSave: Boolean(gameInfo.isAutoSave),
    dlcIds: Array.isArray(gameInfo.dlcIds) ? gameInfo.dlcIds : [],
    lastWrittenBytes: formatBytes(session.lastWrittenBytes),
  };
}

function NoSaveState() {
  return (
    <section className="rounded-xl border border-black/10 p-5 dark:border-white/15">
      <h3 className="text-xl font-semibold">No Save Loaded</h3>
      <p className="mt-2 text-sm opacity-80">
        Use <strong>Load Save</strong> in the top bar to open a `.sav` file.
      </p>
      <div className="mt-4 space-y-2 text-sm opacity-80">
        <p>Common save file locations:</p>
        <p>
          Windows: <code>{SAVE_PATHS.windows}</code>
        </p>
        <p>
          macOS: <code>{SAVE_PATHS.mac}</code>
        </p>
        <p>
          Linux: <code>{SAVE_PATHS.linux}</code>
        </p>
      </div>
    </section>
  );
}

function ErrorState({ error, canForceLoad, forceLoadPendingFile, pendingFileName }) {
  const isMajorMismatch = error?.code === "E_VERSION_MAJOR";
  const isMinorMismatch = error?.code === "E_VERSION_MINOR";

  return (
    <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-5">
      <h3 className="text-xl font-semibold text-red-800 dark:text-red-200">
        Failed To Load Save
      </h3>
      {pendingFileName ? (
        <p className="mt-2 text-xs text-red-700/80 dark:text-red-300/80">
          File: <code>{pendingFileName}</code>
        </p>
      ) : null}
      <p className="mt-2 text-sm text-red-700 dark:text-red-300">
        {error?.message || "Unknown parsing error."}
      </p>
      {isMajorMismatch ? (
        <p className="mt-2 text-sm text-red-700 dark:text-red-300">
          This save appears to use a different major ONI save format and is likely incompatible
          with the current parser.
        </p>
      ) : null}
      {isMinorMismatch ? (
        <p className="mt-2 text-sm text-red-700 dark:text-red-300">
          Minor version mismatch detected. You can try force-loading with major strictness.
        </p>
      ) : null}
      {error?.code ? (
        <p className="mt-2 text-xs text-red-700/80 dark:text-red-300/80">
          Error code: <code>{error.code}</code>
        </p>
      ) : null}
      {canForceLoad ? (
        <button
          type="button"
          onClick={forceLoadPendingFile}
          className="mt-4 rounded-md border border-red-700/40 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-500/15 dark:text-red-100"
        >
          Override safety check and load with major strictness
        </button>
      ) : null}
    </section>
  );
}

function ReadyState({
  summary,
  difficultyOptions,
  difficulty,
  difficultyOrder,
  onUpdateDifficulty,
}) {
  const settingOrder =
    Array.isArray(difficultyOrder) && difficultyOrder.length > 0
      ? difficultyOrder
      : Object.keys(difficultyOptions);

  const isToggleOptions = (options) =>
    Array.isArray(options) &&
    options.length === 2 &&
    options.includes("Enabled") &&
    options.includes("Disabled");

  return (
    <section className="rounded-xl border border-black/10 p-5 dark:border-white/15">
      <h3 className="text-xl font-semibold">Save Overview</h3>
      <div className="mt-4 rounded-md border border-black/10 p-3 dark:border-white/15">
        <h4 className="text-sm font-semibold uppercase tracking-wide opacity-80">
          Difficulty
        </h4>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {settingOrder.map((settingName) => {
            const options = difficultyOptions[settingName] || [];
            const selected = difficulty[settingName] ?? options[0] ?? "";
            const label = getDifficultySettingLabel(settingName);
            return (
              <label key={settingName} className="flex flex-col gap-1 text-sm">
                <span className="opacity-80">{label}</span>
                {isToggleOptions(options) ? (
                  <label className="flex items-center gap-2 rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected === "Enabled"}
                      onChange={(event) =>
                        onUpdateDifficulty(
                          settingName,
                          event.target.checked ? "Enabled" : "Disabled"
                        )
                      }
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    <span>
                      {getDifficultyValueLabel(
                        settingName,
                        selected === "Enabled" ? "Enabled" : "Disabled"
                      )}
                    </span>
                  </label>
                ) : options.length > 0 ? (
                  <M3Select
                    value={selected}
                    onChange={(event) =>
                      onUpdateDifficulty(settingName, event.target.value)
                    }
                    className="rounded-md border border-white/25 bg-black px-2 py-2 text-sm"
                  >
                    {options.map((value) => (
                      <option key={value} value={value}>
                        {getDifficultyValueLabel(settingName, value)}
                      </option>
                    ))}
                  </M3Select>
                ) : (
                  <input
                    type="text"
                    value={selected}
                    onChange={(event) =>
                      onUpdateDifficulty(settingName, event.target.value)
                    }
                    className="rounded-md border border-white/25 bg-black px-2 py-2 text-sm"
                  />
                )}
              </label>
            );
          })}
        </div>
      </div>
      <pre className="mt-4 overflow-auto rounded-md bg-black/5 p-3 text-xs dark:bg-white/10">
        {JSON.stringify(summary, null, 2)}
      </pre>
    </section>
  );
}

export default function OverviewPage() {
  const session = useSaveSession();
  const summary = useMemo(() => makeOverviewSummary(session), [session]);
  const { optionsBySetting, selectedValues, settingOrder } = useMemo(
    () => selectDifficultySettings(session.saveGame),
    [session.saveGame]
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {!session.hasSave && session.status !== "error" ? <NoSaveState /> : null}

      {session.status === "error" ? (
        <ErrorState
          error={session.error}
          canForceLoad={session.canForceLoad}
          forceLoadPendingFile={session.forceLoadPendingFile}
          pendingFileName={session.pendingFile?.name}
        />
      ) : null}

      {session.hasSave ? (
        <ReadyState
          summary={summary}
          difficultyOptions={optionsBySetting}
          difficulty={selectedValues}
          difficultyOrder={settingOrder}
          onUpdateDifficulty={session.updateDifficultySetting}
        />
      ) : null}
    </div>
  );
}
