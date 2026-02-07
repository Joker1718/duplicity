"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";
import SaveRequiredPage from "@/components/save-required-page";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import { selectCreatureEditorModel, selectCreatures } from "@/lib/oni/save-selectors";

function CreatureEditorFallback() {
  return (
    <section className="rounded-xl border border-white/20 p-5">
      <h1 className="text-2xl font-semibold">Creature Editor</h1>
      <p className="mt-2 text-sm opacity-80">Loading editor...</p>
    </section>
  );
}

function CreatureEditorPageContent() {
  const searchParams = useSearchParams();
  const {
    saveGame,
    hasSave,
    selectedCreatureId,
    setSelectedCreatureId,
  } = useSaveSession();

  const creatures = useMemo(() => selectCreatures(saveGame), [saveGame]);
  const fallbackId = creatures[0]?.id ?? null;
  const requestedIdParam = searchParams.get("id");
  const requestedId = requestedIdParam === null ? null : Number(requestedIdParam);
  const hasValidRequestedId = requestedIdParam !== null && Number.isFinite(requestedId);
  const requestedExists =
    hasValidRequestedId && creatures.some((creature) => creature.id === requestedId);

  const activeId =
    hasValidRequestedId
      ? requestedExists
        ? requestedId
        : null
      : Number.isFinite(selectedCreatureId) && creatures.some((creature) => creature.id === selectedCreatureId)
        ? selectedCreatureId
        : fallbackId;

  useEffect(() => {
    if (
      hasValidRequestedId &&
      requestedExists &&
      selectedCreatureId !== requestedId
    ) {
      setSelectedCreatureId(requestedId);
      return;
    }

    if (
      requestedIdParam === null &&
      !Number.isFinite(selectedCreatureId) &&
      Number.isFinite(fallbackId)
    ) {
      setSelectedCreatureId(fallbackId);
    }
  }, [
    fallbackId,
    hasValidRequestedId,
    requestedExists,
    requestedId,
    requestedIdParam,
    selectedCreatureId,
    setSelectedCreatureId,
  ]);

  const model = useMemo(
    () => selectCreatureEditorModel(saveGame, activeId),
    [activeId, saveGame]
  );

  if (!hasSave) {
    return (
      <SaveRequiredPage
        title="Creature Editor"
        description="Load a save first to inspect a creature."
      />
    );
  }

  if (requestedIdParam !== null && !hasValidRequestedId) {
    return (
      <section className="rounded-xl border border-white/20 p-5">
        <h1 className="text-2xl font-semibold">Creature Not Found</h1>
        <p className="mt-2 text-sm opacity-80">
          Invalid creature ID in route query: <code>{requestedIdParam}</code>
        </p>
        <p className="mt-3 text-sm opacity-70">
          Open <Link href="/creatures" className="underline">Creatures</Link> and select a valid entry.
        </p>
      </section>
    );
  }

  if (hasValidRequestedId && !requestedExists) {
    return (
      <section className="rounded-xl border border-white/20 p-5">
        <h1 className="text-2xl font-semibold">Creature Not Found</h1>
        <p className="mt-2 text-sm opacity-80">
          No creature with Game Object ID <code>{requestedId}</code> exists in this save.
        </p>
        <p className="mt-3 text-sm opacity-70">
          Open <Link href="/creatures" className="underline">Creatures</Link> and select an existing creature.
        </p>
      </section>
    );
  }

  if (!model) {
    return (
      <section className="rounded-xl border border-white/20 p-5">
        <h1 className="text-2xl font-semibold">Creature Editor</h1>
        <p className="mt-2 text-sm opacity-80">
          No creature data found in this save.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-white/20 p-4">
        <h1 className="text-2xl font-semibold">Creature Editor</h1>
        <p className="mt-1 text-sm opacity-75">
          Route parity is complete. Full creature editing remains deferred by parity scope.
        </p>
      </header>

      <div className="rounded-xl border border-white/20 p-4">
        <p className="text-sm">
          <span className="opacity-75">Type:</span>{" "}
          <span className="font-semibold">{model.type}</span>
        </p>
        <p className="mt-1 text-sm">
          <span className="opacity-75">Game Object ID:</span>{" "}
          <code>{model.id}</code>
        </p>
        <p className="mt-1 text-sm">
          <span className="opacity-75">Position:</span>{" "}
          <code>{model.position.x.toFixed(1)}, {model.position.y.toFixed(1)}, {model.position.z.toFixed(1)}</code>
        </p>
        <p className="mt-3 text-xs opacity-70">
          This page currently validates creature route selection and object resolution.
        </p>
      </div>
    </section>
  );
}

export default function CreatureEditorPage() {
  return (
    <Suspense fallback={<CreatureEditorFallback />}>
      <CreatureEditorPageContent />
    </Suspense>
  );
}
