"use client";

import Link from "next/link";
import { useMemo } from "react";
import SaveRequiredPage from "@/components/save-required-page";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import { selectDuplicants } from "@/lib/oni/save-selectors";

function DuplicantCard({ duplicant }) {
  return (
    <article className="w-full rounded-lg border border-black/10 p-4 dark:border-white/15 xl:w-[360px]">
      <div className="flex items-start gap-2">
        <div>
          <h2 className="text-lg font-semibold">{duplicant.name}</h2>
          <p className="text-xs opacity-70">Game Object ID: {duplicant.id}</p>
        </div>
        <Link
          href="/duplicants-editor"
          className="ml-auto rounded-md border border-white/25 px-2 py-1 text-xs font-semibold hover:bg-white/10"
        >
          Edit
        </Link>
      </div>

      <div className="mt-3 border-t border-black/10 pt-3 dark:border-white/15">
        <h3 className="text-xs font-semibold uppercase tracking-wide opacity-70">Traits</h3>
        <div className="mt-2 flex flex-wrap gap-1">
          {duplicant.traits.length === 0 ? (
            <span className="text-xs opacity-60">No traits found</span>
          ) : (
            duplicant.traits.map((trait) => (
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

      <div className="mt-3 border-t border-black/10 pt-3 dark:border-white/15">
        <h3 className="text-xs font-semibold uppercase tracking-wide opacity-70">Attributes</h3>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          {duplicant.attributes.map((attribute) => (
            <p key={attribute.attributeId} className="flex items-center justify-between">
              <span className="opacity-80">{attribute.attributeId}</span>
              <span className="font-semibold">{attribute.levelLabel}</span>
            </p>
          ))}
        </div>
      </div>
    </article>
  );
}

export default function DuplicantsPage() {
  const { saveGame, hasSave } = useSaveSession();
  const duplicants = useMemo(() => selectDuplicants(saveGame), [saveGame]);

  if (!hasSave) {
    return (
      <SaveRequiredPage
        title="Duplicants"
        description="Load a save to view and edit duplicants."
      />
    );
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold">Duplicants</h1>
      <p className="mt-2 text-sm opacity-75">
        Ported from V3 list behavior using real parsed save data.
      </p>

      {duplicants.length === 0 ? (
        <p className="mt-4 rounded-md border border-black/10 p-3 text-sm opacity-75 dark:border-white/15">
          No duplicants found in this save.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          {duplicants.map((duplicant) => (
            <DuplicantCard key={duplicant.id} duplicant={duplicant} />
          ))}
        </div>
      )}
    </section>
  );
}
