"use client";

import Link from "next/link";
import DuplicantActionsPanel from "@/components/duplicant-actions-panel";
import { getSafeAccessoryOrdinal } from "@/lib/oni/accessory-constraints";
import { withBasePath } from "@/lib/asset-paths";
import { HAIR_OFFSET_BASES } from "@/lib/oni/hair-offsets";

const ACCESSORY_BASE_PATH = withBasePath("/images/oni");
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
  const safeType = type === "hair" ? "hair" : "head";
  const safeOrdinal = getSafeAccessoryOrdinal(safeType, ordinal);
  const padded = formatAccessoryOrdinal(safeOrdinal);
  return `${ACCESSORY_BASE_PATH}/${type}/${type}_${padded}.png`;
}

function getHairPreviewTransform(hairOrdinal, hairOffsets) {
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

  return {
    hairOffsetX: rawOffsetX * CARD_SCALE_RATIO * CARD_CONTENT_SCALE,
    hairOffsetY: rawOffsetY * CARD_SCALE_RATIO * CARD_CONTENT_SCALE + CARD_CONTENT_OFFSET_Y,
    hairScale: CARD_CONTENT_SCALE * (1 + (rawScale - 1) * CARD_SCALE_RATIO),
  };
}

export default function DuplicantCard({ duplicant, onSelect, hairOffsets }) {
  const headshapeOrdinal = duplicant.appearance?.headOrdinal ?? 1;
  const hairOrdinal = duplicant.appearance?.hairOrdinal ?? 1;
  const { hairOffsetX, hairOffsetY, hairScale } = getHairPreviewTransform(
    hairOrdinal,
    hairOffsets
  );

  return (
    <article className="m3-surface-raised w-full rounded-[1.25rem] p-4 transition-colors hover:border-[var(--outline-strong)]">
      <div className="flex items-start gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold leading-tight">{duplicant.name}</h2>
          <p className="mt-1 text-xs opacity-70">ID: {duplicant.id}</p>
        </div>
        <Link
          href={`/duplicants-editor?id=${duplicant.id}`}
          onClick={() => onSelect(duplicant.id)}
          className="m3-button m3-button-tonal ml-auto inline-flex items-center px-4 py-1.5 text-xs font-semibold"
        >
          Edit
        </Link>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--outline)] bg-[var(--surface-container-high)] p-3">
        <div className="flex flex-col items-center gap-2">
          <div className="relative h-40 w-40 overflow-hidden rounded-2xl border border-[var(--outline)] bg-[var(--surface-container-highest)]">
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
        </div>
      </div>

      <section className="mt-3 rounded-2xl border border-[var(--outline)] bg-[var(--surface-container)] p-3">
        <h3 className="text-xs font-semibold tracking-wide opacity-75">Traits</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {duplicant.traits.length === 0 ? (
            <span className="text-xs opacity-60">No traits found</span>
          ) : (
            duplicant.traits.map((trait) => (
              <span key={trait} className="m3-chip px-2.5 py-1 text-xs">
                {trait}
              </span>
            ))
          )}
        </div>
      </section>

      <section className="mt-3 rounded-2xl border border-[var(--outline)] bg-[var(--surface-container)] p-3">
        <h3 className="text-xs font-semibold tracking-wide opacity-75">Attributes</h3>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          {duplicant.attributes.map((attribute) => (
            <p
              key={attribute.attributeId}
              className="rounded-xl border border-[var(--outline)] bg-[var(--surface-container-high)] px-2 py-1.5"
            >
              <span className="opacity-75">{attribute.attributeId}</span>
              <span className="ml-1.5 font-semibold">{attribute.levelLabel}</span>
            </p>
          ))}
        </div>
      </section>

      <div className="mt-3">
        <DuplicantActionsPanel duplicantId={duplicant.id} duplicantName={duplicant.name} />
      </div>
    </article>
  );
}
