"use client";

import { useMemo, useRef, useState } from "react";
import { FaCheck, FaXmark } from "react-icons/fa6";
import { M3Chip } from "@/components/ui/m3-chips";
import M3CollapsibleSection from "@/components/ui/m3-collapsible-section";
import { DUPLICANT_EXPORTABLE_BEHAVIORS } from "@/lib/oni/oni-constants";
import { useSaveSession } from "@/lib/save-session/save-session-context";

function normalizeName(value) {
  return typeof value === "string" && value.trim() ? value : "Duplicant";
}

export default function DuplicantActionsPanel({
  duplicantId,
  duplicantName,
  expandSignal,
  onCopied,
}) {
  const fileInputRef = useRef(null);
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
  const bufferSourceLabel = useMemo(() => {
    if (!copyPasteData) {
      return null;
    }
    const sourceName =
      typeof copyPasteData.sourceName === "string" && copyPasteData.sourceName.trim()
        ? copyPasteData.sourceName.trim()
        : null;
    const sourceId = Number.isFinite(copyPasteData.sourceId) ? copyPasteData.sourceId : null;
    if (sourceName && sourceId !== null) {
      return `${sourceName} (${sourceId})`;
    }
    if (sourceName) {
      return sourceName;
    }
    if (sourceId !== null) {
      return `Duplicant ${sourceId}`;
    }
    return null;
  }, [copyPasteData]);

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
    <M3CollapsibleSection
      title="Actions"
      defaultCollapsed={true}
      expandSignal={expandSignal}
      containerClassName="rounded-2xl border border-[var(--outline)] bg-[var(--surface-container)] p-3"
      expandedMarginClassName="mt-3"
    >
      <p className="text-xs opacity-70">
        Buffer: {copiedCount} behavior{copiedCount === 1 ? "" : "s"}
        {bufferSourceLabel ? ` from ${bufferSourceLabel}` : ""}
      </p>
      <p className="mt-1 text-xs opacity-60">
        Target: {normalizeName(duplicantName)} ({duplicantId})
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {DUPLICANT_EXPORTABLE_BEHAVIORS.map((entry) => {
          const isSelected = selected.has(entry.behavior);
          return (
            <M3Chip
              key={entry.behavior}
              as="button"
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggleBehavior(entry.behavior)}
              label={
                <>
                  <span className="inline-flex h-3.5 w-3.5 items-center justify-center" aria-hidden="true">
                    {isSelected ? (
                      <FaCheck className="h-3 w-3 text-[var(--accent)]" />
                    ) : (
                      <FaXmark className="h-3 w-3 opacity-65" />
                    )}
                  </span>
                  <span>{entry.name}</span>
                </>
              }
              className={`w-full cursor-pointer justify-start bg-[var(--surface-container-high)] text-left transition hover:bg-[var(--state-hover)] ${
                isSelected ? "border-[var(--outline-strong)] bg-[var(--state-hover)]" : ""
              }`}
            />
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            copyDuplicantBehaviors(duplicantId, selectedNames);
            if (typeof onCopied === "function") {
              onCopied();
            }
          }}
          disabled={selectedNames.length === 0}
          className="m3-button m3-button-outlined px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          Copy
        </button>
        <button
          type="button"
          onClick={() => pasteDuplicantBehaviors(duplicantId, selectedNames)}
          disabled={selectedNames.length === 0 || !canPaste}
          className="m3-button m3-button-outlined px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          Paste
        </button>
        <button
          type="button"
          onClick={() => exportDuplicantBehaviors(duplicantId, selectedNames)}
          disabled={selectedNames.length === 0}
          className="m3-button m3-button-outlined px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          Export
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="m3-button m3-button-outlined px-3 py-1.5 text-xs font-semibold"
        >
          Import
        </button>
        <button
          type="button"
          onClick={() => cloneDuplicant(duplicantId)}
          className="m3-button m3-button-outlined px-3 py-1.5 text-xs font-semibold"
        >
          Clone
        </button>
      </div>

      {!canPaste ? (
        <p className="mt-2 text-xs opacity-65">
          Paste disabled: copied behaviors are from a different object type.
        </p>
      ) : null}

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

    </M3CollapsibleSection>
  );
}
