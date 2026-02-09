"use client";

import { useMemo } from "react";
import SaveRequiredPage from "@/components/save-required-page";
import M3Select from "@/components/ui/m3-select";
import { GEYSER_TYPE_NAMES } from "@/lib/oni/oni-constants";
import { selectGeysers } from "@/lib/oni/save-selectors";
import { useSaveSession } from "@/lib/save-session/save-session-context";

function groupByType(list) {
  const grouped = {};
  for (const geyser of list) {
    if (!grouped[geyser.geyserType]) {
      grouped[geyser.geyserType] = [];
    }
    grouped[geyser.geyserType].push(geyser);
  }
  return grouped;
}

function FractionField({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="opacity-75">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full accent-[var(--accent)]"
        />
        <input
          type="number"
          min="0"
          max="1"
          step="0.01"
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-20 rounded-md border border-white/25 bg-black px-2 py-1 text-right text-xs"
        />
      </div>
    </label>
  );
}

function GeyserCard({ geyser, onTypeChange, onParameterChange }) {
  return (
    <article className="rounded-lg border border-white/20 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold">Geyser #{geyser.id}</h3>
        <span className="text-xs opacity-65">{geyser.objectType}</span>
      </div>

      <label className="mt-3 flex flex-col gap-1 text-xs">
        <span className="opacity-75">Type</span>
        <M3Select
          value={geyser.geyserType}
          onChange={(event) => onTypeChange(geyser.id, event.target.value)}
          className="rounded-md border border-white/25 bg-black px-2 py-2 text-sm"
        >
          {GEYSER_TYPE_NAMES.map((typeName) => (
            <option key={typeName} value={typeName}>
              {typeName}
            </option>
          ))}
        </M3Select>
      </label>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="opacity-75">Emission Rate</span>
          <input
            type="number"
            step="0.01"
            value={geyser.emitRate}
            onChange={(event) =>
              onParameterChange(geyser.id, "rateRoll", Number(event.target.value))
            }
            className="rounded-md border border-white/25 bg-black px-2 py-1 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="opacity-75">Lifecycle Length</span>
          <input
            type="number"
            step="0.01"
            value={geyser.lifecycleLength}
            onChange={(event) =>
              onParameterChange(geyser.id, "yearLengthRoll", Number(event.target.value))
            }
            className="rounded-md border border-white/25 bg-black px-2 py-1 text-sm"
          />
        </label>

        <FractionField
          label="Active Fraction"
          value={geyser.activeFraction}
          onChange={(value) => onParameterChange(geyser.id, "yearPercentRoll", value)}
        />

        <FractionField
          label="Emission Fraction"
          value={geyser.emissionFraction}
          onChange={(value) => onParameterChange(geyser.id, "iterationPercentRoll", value)}
        />
      </div>
    </article>
  );
}

export default function GeysersPage() {
  const { hasSave, saveGame, updateGeyserType, updateGeyserParameter } = useSaveSession();
  const geysers = useMemo(() => selectGeysers(saveGame), [saveGame]);
  const grouped = useMemo(() => groupByType(geysers), [geysers]);
  const typeOrder = useMemo(
    () => Object.keys(grouped).sort((a, b) => a.localeCompare(b)),
    [grouped]
  );

  if (!hasSave) {
    return (
      <SaveRequiredPage
        title="Geysers"
        description="Load a save first to edit geyser type and lifecycle parameters."
      />
    );
  }

  return (
    <section>
      {geysers.length === 0 ? (
        <p className="rounded-xl border border-white/20 p-4 text-sm opacity-75">
          No geysers found in this save.
        </p>
      ) : (
        <div className="space-y-4">
          {typeOrder.map((typeName) => (
            <section key={typeName} className="space-y-2">
              <h2 className="text-lg font-semibold">
                {typeName} ({grouped[typeName].length})
              </h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {grouped[typeName].map((geyser) => (
                  <GeyserCard
                    key={geyser.id}
                    geyser={geyser}
                    onTypeChange={updateGeyserType}
                    onParameterChange={updateGeyserParameter}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

