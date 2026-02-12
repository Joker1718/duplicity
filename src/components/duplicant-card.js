"use client";

import Link from "next/link";
import DuplicantActionsPanel from "@/components/duplicant-actions-panel";
import M3Chips from "@/components/ui/m3-chips";
import M3CollapsibleSection from "@/components/ui/m3-collapsible-section";
import { getSafeAccessoryOrdinal } from "@/lib/oni/accessory-constraints";
import { withBasePath } from "@/lib/asset-paths";
import { HAIR_OFFSET_BASES } from "@/lib/oni/hair-offsets";
import {
  OVERJOYED_TRAIT_IDS,
  STRESS_REACTION_TRAIT_IDS,
  getTraitDescription,
  getTraitDisplayName,
  normalizeTraitId,
} from "@/lib/oni/trait-names";

const ACCESSORY_BASE_PATH = withBasePath("/images/oni");
const PREVIEW_SIZE = 32;
const CARD_SIZE = 32;
const CARD_CONTENT_SCALE = 0.6;
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

function toTwoColumnBookOrder(items) {
  const list = Array.isArray(items) ? items : [];
  const leftColumnCount = Math.ceil(list.length / 2);
  const ordered = [];

  for (let index = 0; index < leftColumnCount; index += 1) {
    ordered.push(list[index]);
    const rightItem = list[index + leftColumnCount];
    if (rightItem) {
      ordered.push(rightItem);
    }
  }

  return ordered;
}

export default function DuplicantCard({
  duplicant,
  onSelect,
  hairOffsets,
  actionsExpandSignal,
  onBehaviorCopied,
}) {
  const headshapeOrdinal = duplicant.appearance?.headOrdinal ?? 1;
  const hairOrdinal = duplicant.appearance?.hairOrdinal ?? 1;
  const traitIds = Array.isArray(duplicant.traits) ? duplicant.traits : [];
  const overjoyedReactions = traitIds.filter((traitId) =>
    OVERJOYED_TRAIT_IDS.has(normalizeTraitId(traitId))
  );
  const stressReactions = traitIds.filter((traitId) =>
    STRESS_REACTION_TRAIT_IDS.has(normalizeTraitId(traitId))
  );
  const nonReactionTraits = traitIds.filter((traitId) => {
    const normalized = normalizeTraitId(traitId);
    return (
      normalized &&
      !OVERJOYED_TRAIT_IDS.has(normalized) &&
      !STRESS_REACTION_TRAIT_IDS.has(normalized)
    );
  });
  const { hairOffsetX, hairOffsetY, hairScale } = getHairPreviewTransform(
    hairOrdinal,
    hairOffsets
  );
  const orderedAttributes = toTwoColumnBookOrder(duplicant.attributes);

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

      <div className="relative mt-4 h-48 overflow-hidden rounded-2xl border border-[var(--outline)] bg-[var(--surface-container-high)]">
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

      <section className="mt-3 rounded-2xl border border-[var(--outline)] bg-[var(--surface-container)] p-3">
        <div className="flex flex-col gap-1 text-xs">
          <p className="flex w-full flex-wrap items-start gap-1.5">
            <span className="opacity-70">Overjoyed Reactions:</span>
            <M3Chips
              items={overjoyedReactions}
              getItemKey={(trait) => `overjoyed-${trait}`}
              getItemLabel={(trait) => getTraitDisplayName(trait)}
              getItemTitle={(trait) => getTraitDescription(trait)}
              className="ml-auto flex flex-1 flex-wrap justify-end gap-2 text-right font-medium"
              emptyLabel="None"
              emptyClassName="ml-auto text-right font-medium"
            />
          </p>
          <p className="flex w-full flex-wrap items-start gap-1.5">
            <span className="opacity-70">Stress Reactions:</span>
            <M3Chips
              items={stressReactions}
              getItemKey={(trait) => `stress-${trait}`}
              getItemLabel={(trait) => getTraitDisplayName(trait)}
              getItemTitle={(trait) => getTraitDescription(trait)}
              className="ml-auto flex flex-1 flex-wrap justify-end gap-2 text-right font-medium"
              emptyLabel="None"
              emptyClassName="ml-auto text-right font-medium"
            />
          </p>
        </div>
        <h3 className="mt-3 text-xs font-semibold tracking-wide opacity-75">Traits</h3>
        <M3Chips
          items={nonReactionTraits}
          getItemKey={(trait) => trait}
          getItemLabel={(trait) => getTraitDisplayName(trait)}
          getItemTitle={(trait) => getTraitDescription(trait)}
          className="mt-2 flex flex-wrap gap-2"
          emptyLabel="No traits found"
          emptyClassName="mt-2 text-xs opacity-60"
        />
      </section>

      <M3CollapsibleSection
        title="Attributes"
        defaultCollapsed={false}
        containerClassName="mt-3 rounded-2xl border border-[var(--outline)] bg-[var(--surface-container)] p-3"
      >
        <M3Chips
          items={orderedAttributes}
          getItemKey={(attribute) => attribute.attributeId}
          getItemLabel={(attribute) => (
            <>
              <span className="opacity-75">{attribute.displayName || attribute.attributeId}</span>
              <span className="ml-auto text-right font-semibold">{attribute.levelLabel}</span>
            </>
          )}
          className="grid grid-cols-2 gap-2 text-sm"
          chipClassName="flex w-full items-center gap-2 bg-[var(--surface-container-high)] px-2 py-1.5 hover:bg-[var(--state-hover)]"
          emptyLabel="No attributes found"
          emptyClassName="text-xs opacity-60"
        />
      </M3CollapsibleSection>

      <div className="mt-3">
        <DuplicantActionsPanel
          duplicantId={duplicant.id}
          duplicantName={duplicant.name}
          expandSignal={actionsExpandSignal}
          onCopied={onBehaviorCopied}
        />
      </div>
    </article>
  );
}
