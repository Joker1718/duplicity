"use client";

import Link from "next/link";
import { useMemo } from "react";
import SaveRequiredPage from "@/components/save-required-page";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import { selectCreatures } from "@/lib/oni/save-selectors";

function formatPosition(position) {
  if (!position) {
    return "Unknown";
  }
  return `${position.x.toFixed(1)}, ${position.y.toFixed(1)}`;
}

function CreatureCard({ creature, onSelect }) {
  return (
    <article className="w-full rounded-lg border border-black/10 p-4 dark:border-white/15 xl:w-[360px]">
      <div className="flex items-start gap-2">
        <div>
          <h2 className="text-lg font-semibold">{creature.type}</h2>
          <p className="text-xs opacity-70">Game Object ID: {creature.id}</p>
          <p className="text-xs opacity-70">Position: {formatPosition(creature.position)}</p>
        </div>
        <Link
          href={`/creatures-editor?id=${creature.id}`}
          onClick={() => onSelect(creature.id)}
          className="ml-auto rounded-md border border-white/25 px-2 py-1 text-xs font-semibold hover:bg-white/10"
        >
          Edit
        </Link>
      </div>

      <div className="mt-3 border-t border-black/10 pt-3 dark:border-white/15">
        <h3 className="text-xs font-semibold uppercase tracking-wide opacity-70">Traits</h3>
        <div className="mt-2 flex flex-wrap gap-1">
          {creature.traits.length === 0 ? (
            <span className="text-xs opacity-60">No traits found</span>
          ) : (
            creature.traits.map((trait) => (
              <span
                key={trait}
                className="rounded bg-black/5 px-2 py-1 text-xs dark:bg-white/10"
              >
                {trait}
              </span>
            ))
          )}
        </div>
      </div>
    </article>
  );
}

export default function CreaturesPage() {
  const { saveGame, hasSave, setSelectedCreatureId } = useSaveSession();
  const creatures = useMemo(() => selectCreatures(saveGame), [saveGame]);

  if (!hasSave) {
    return (
      <SaveRequiredPage
        title="Creatures"
        description="Load a save to view creatures."
      />
    );
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold">Creatures</h1>
      <p className="mt-2 text-sm opacity-75">
        List of creature entities from parsed save data.
      </p>

      {creatures.length === 0 ? (
        <p className="mt-4 rounded-md border border-black/10 p-3 text-sm opacity-75 dark:border-white/15">
          No creature entities found in this save.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          {creatures.map((creature) => (
            <CreatureCard
              key={creature.id}
              creature={creature}
              onSelect={setSelectedCreatureId}
            />
          ))}
        </div>
      )}
    </section>
  );
}
