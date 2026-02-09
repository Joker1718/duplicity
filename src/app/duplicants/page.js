"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SaveRequiredPage from "@/components/save-required-page";
import DuplicantActionsPanel from "@/components/duplicant-actions-panel";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import { selectDuplicants } from "@/lib/oni/save-selectors";
import { HAIR_OFFSET_BASES } from "@/lib/oni/hair-offsets";

const ACCESSORY_BASE_PATH = "/images/oni";
const PREVIEW_SIZE = 32;
const CARD_SIZE = 32;
const CARD_CONTENT_SCALE = 0.65;
const CARD_CONTENT_OFFSET_Y = 25;
const CARD_SCALE_RATIO = CARD_SIZE / PREVIEW_SIZE;

function formatAccessoryOrdinal(ordinal) {
  const safe = Number.isFinite(ordinal) ? Math.max(1, Math.floor(ordinal)) : 1;
  return String(safe);
}

function getAccessorySrc(type, ordinal) {
  const padded = formatAccessoryOrdinal(ordinal);
  return `${ACCESSORY_BASE_PATH}/${type}/${type}_${padded}.png`;
}

function DuplicantCard({ duplicant, onSelect, hairOffsets }) {
  const headshapeOrdinal = duplicant.appearance?.headOrdinal ?? 1;
  const hairOrdinal = duplicant.appearance?.hairOrdinal ?? 1;
  const hairOffset = hairOffsets?.[String(hairOrdinal)] ?? hairOffsets?.[hairOrdinal];
  const baseOffset = HAIR_OFFSET_BASES[hairOrdinal] || {};
  const rawOffsetX =
    (Number.isFinite(baseOffset.x) ? baseOffset.x : 0) +
    (Number.isFinite(hairOffset?.x) ? hairOffset.x : 0);
  const rawOffsetY =
    (Number.isFinite(baseOffset.y) ? baseOffset.y : 0) +
    (Number.isFinite(hairOffset?.y) ? hairOffset.y : 0);
  const rawScale =
    (Number.isFinite(baseOffset.scale) ? baseOffset.scale : 1) *
    (Number.isFinite(hairOffset?.scale) ? hairOffset.scale : 1);
  const hairOffsetX = rawOffsetX * CARD_SCALE_RATIO * CARD_CONTENT_SCALE;
  const hairOffsetY = rawOffsetY * CARD_SCALE_RATIO * CARD_CONTENT_SCALE + CARD_CONTENT_OFFSET_Y;
  const hairScale = CARD_CONTENT_SCALE * (1 + (rawScale - 1) * CARD_SCALE_RATIO);

  return (
    <article className="w-full rounded-lg border border-black/10 p-4 dark:border-white/15">
      <div className="flex items-start gap-2">
        <div>
          <h2 className="text-lg font-semibold">{duplicant.name}</h2>
          <p className="text-xs opacity-70">Game Object ID: {duplicant.id}</p>
        </div>
        <Link
          href={`/duplicants-editor?id=${duplicant.id}`}
          onClick={() => onSelect(duplicant.id)}
          className="ml-auto rounded-md border border-white/25 px-2 py-1 text-xs font-semibold hover:bg-white/10"
        >
          Edit
        </Link>
      </div>

      <div className="mt-3 border-t border-black/10 pt-3 dark:border-white/15">
        <div className="flex flex-col items-center gap-2">
          <div className="relative h-40 w-40 overflow-hidden rounded-md border border-white/15 bg-black/30">
            <img
              src={getAccessorySrc("head", headshapeOrdinal)}
              alt={`Headshape ${headshapeOrdinal}`}
              className="absolute inset-0 h-full w-full object-contain"
              style={{
                transform: `translateY(${CARD_CONTENT_OFFSET_Y}px) scale(${CARD_CONTENT_SCALE})`,
                transformOrigin: "50% 50%",
              }}
              loading="lazy"
            />
            <img
              src={getAccessorySrc("hair", hairOrdinal)}
              alt={`Hair ${hairOrdinal}`}
              className="absolute inset-0 h-full w-full object-contain"
              style={{
                transform: `translate(${hairOffsetX}px, ${hairOffsetY}px) scale(${hairScale})`,
                transformOrigin: "50% 50%",
              }}
              loading="lazy"
            />
          </div>
          <div className="text-xs opacity-70">
            Headshape {headshapeOrdinal} · Hair {hairOrdinal}
          </div>
        </div>
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

      <div className="mt-3 border-t border-black/10 pt-3 dark:border-white/15">
        <DuplicantActionsPanel duplicantId={duplicant.id} duplicantName={duplicant.name} />
      </div>
    </article>
  );
}

export default function DuplicantsPage() {
  const { saveGame, hasSave, setSelectedDuplicantId } = useSaveSession();
  const duplicants = useMemo(() => selectDuplicants(saveGame), [saveGame]);
  const [hairOffsets, setHairOffsets] = useState({});

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
            />
          ))}
        </div>
      )}
    </section>
  );
}
