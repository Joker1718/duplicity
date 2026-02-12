"use client";

import { useEffect, useMemo, useState } from "react";
import SaveRequiredPage from "@/components/save-required-page";
import DuplicantCard from "@/components/duplicant-card";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import { selectDuplicants } from "@/lib/oni/save-selectors";

export default function DuplicantsPage() {
  const { saveGame, hasSave, setSelectedDuplicantId } = useSaveSession();
  const duplicants = useMemo(() => selectDuplicants(saveGame), [saveGame]);
  const [hairOffsets, setHairOffsets] = useState({});
  const [actionsExpandSignal, setActionsExpandSignal] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem("duplicity.hairOffsets");
    if (!stored) {
      setHairOffsets({});
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        setHairOffsets(parsed);
      } else {
        setHairOffsets({});
      }
    } catch (_error) {
      setHairOffsets({});
    }
  }, []);

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
      {duplicants.length === 0 ? (
        <p className="rounded-md border border-black/10 p-3 text-sm opacity-75 dark:border-white/15">
          No duplicants found in this save.
        </p>
      ) : (
        <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-3">
          {duplicants.map((duplicant) => (
            <DuplicantCard
              key={duplicant.id}
              duplicant={duplicant}
              onSelect={setSelectedDuplicantId}
              hairOffsets={hairOffsets}
              actionsExpandSignal={actionsExpandSignal}
              onBehaviorCopied={() =>
                setActionsExpandSignal((previous) => previous + 1)
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
