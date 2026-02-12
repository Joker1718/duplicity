"use client";

import { useId, useMemo, useRef, useState } from "react";
import { DUPLICANT_EXPORTABLE_BEHAVIORS } from "@/lib/oni/oni-constants";
import { useSaveSession } from "@/lib/save-session/save-session-context";

function normalizeName(value) {
  return typeof value === "string" && value.trim() ? value : "Duplicant";
}

export default function DuplicantActionsPanel({ duplicantId, duplicantName }) {
  const fileInputRef = useRef(null);
  const listId = useId();
  const {
    copyPasteData,
    copyDuplicantBehaviors,
    canPasteBehaviorsTo,
    pasteDuplicantBehaviors,
    exportDuplicantBehaviors,
    importDuplicantBehaviors,
    cloneDuplicant,
  } = useSaveSession();

  const behaviorNames = useMemo(
    () => DUPLICANT_EXPORTABLE_BEHAVIORS.map((entry) => entry.behavior),
    []
  );

  const [selected, setSelected] = useState(() => new Set(behaviorNames));
  const selectedNames = useMemo(() => [...selected], [selected]);
  const canPaste = canPasteBehaviorsTo(duplicantId);
  const copiedCount = copyPasteData ? Object.keys(copyPasteData.behaviors || {}).length : 0;

  const toggleBehavior = (behaviorName) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(behaviorName)) {
        next.delete(behaviorName);
      } else {
        next.add(behaviorName);
      }
      return next;
    });
  };

  return (
    <section className="rounded-2xl border border-[var(--outline)] bg-[var(--surface-container)] p-3">
      <h3 className="text-sm font-semibold tracking-wide opacity-85">Actions</h3>
      <p className="mt-1 text-xs opacity-70">
        Copy buffer: {copiedCount} behavior{copiedCount === 1 ? "" : "s"}
      </p>

      <div className="mt-3 grid gap-1.5 sm:grid-cols-2" id={listId}>
        {DUPLICANT_EXPORTABLE_BEHAVIORS.map((entry) => (
          <label
            key={entry.behavior}
            className="m3-chip flex items-center gap-2 px-2.5 py-1.5 text-xs"
          >
            <input
              type="checkbox"
              checked={selected.has(entry.behavior)}
              onChange={() => toggleBehavior(entry.behavior)}
              className="h-3.5 w-3.5 accent-[var(--accent)]"
            />
            <span>{entry.name}</span>
          </label>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copyDuplicantBehaviors(duplicantId, selectedNames)}
          disabled={selectedNames.length === 0}
          className="m3-button m3-button-ghost border border-[var(--outline)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--outline-strong)] disabled:opacity-50"
        >
          Copy
        </button>
        <button
          type="button"
          onClick={() => pasteDuplicantBehaviors(duplicantId, selectedNames)}
          disabled={selectedNames.length === 0 || !canPaste}
          className="m3-button m3-button-ghost border border-[var(--outline)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--outline-strong)] disabled:opacity-50"
        >
          Paste
        </button>
        <button
          type="button"
          onClick={() => exportDuplicantBehaviors(duplicantId, selectedNames)}
          disabled={selectedNames.length === 0}
          className="m3-button m3-button-ghost border border-[var(--outline)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--outline-strong)] disabled:opacity-50"
        >
          Export
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="m3-button m3-button-ghost border border-[var(--outline)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--outline-strong)]"
        >
          Import
        </button>
        <button
          type="button"
          onClick={() => cloneDuplicant(duplicantId)}
          className="m3-button m3-button-ghost border border-[var(--outline)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--outline-strong)]"
        >
          Clone
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            importDuplicantBehaviors(duplicantId, file);
          }
          event.target.value = "";
        }}
      />

      {!canPaste ? (
        <p className="mt-2 text-xs opacity-65">
          Paste disabled: copied behaviors are from a different object type.
        </p>
      ) : null}
      <p className="mt-1 text-xs opacity-60">
        Target: {normalizeName(duplicantName)} ({duplicantId})
      </p>
    </section>
  );
}
