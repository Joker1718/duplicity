"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import SaveRequiredPage from "@/components/save-required-page";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import { selectDuplicantEditorModel, selectDuplicants } from "@/lib/oni/save-selectors";
import { HAIR_OFFSET_BASES } from "@/lib/oni/hair-offsets";

const TRAIT_ID_PATTERN = /^[A-Za-z][A-Za-z0-9._-]*$/;
const ATTRIBUTE_MIN_LEVEL = -20;
const ATTRIBUTE_MAX_LEVEL = 99;
const MAX_NAME_LENGTH = 64;
const EXPERIENCE_MIN = 0;
const HEALTH_MIN = 0;
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

function DuplicantEditorFallback() {
  return (
    <section className="rounded-xl border border-white/20 p-5">
      <h1 className="text-2xl font-semibold">Duplicant Editor</h1>
      <p className="mt-2 text-sm opacity-80">Loading editor...</p>
    </section>
  );
}

function DuplicantEditorPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    saveGame,
    hasSave,
    selectedDuplicantId,
    setSelectedDuplicantId,
    updateDuplicantName,
    addDuplicantTrait,
    removeDuplicantTrait,
    addDuplicantInterest,
    removeDuplicantInterest,
    updateDuplicantAttributeLevel,
    updateDuplicantAppearance,
    updateDuplicantGender,
    updateDuplicantHealthModifier,
    updateDuplicantExperience,
    setDuplicantSkillMastery,
    addDuplicantEffect,
    updateDuplicantEffectCycles,
    removeDuplicantEffect,
  } = useSaveSession();

  const duplicants = useMemo(() => selectDuplicants(saveGame), [saveGame]);
  const fallbackId = duplicants[0]?.id ?? null;
  const requestedIdParam = searchParams.get("id");
  const requestedId = requestedIdParam === null ? null : Number(requestedIdParam);
  const hasValidRequestedId = requestedIdParam !== null && Number.isFinite(requestedId);
  const requestedExists =
    hasValidRequestedId && duplicants.some((dup) => dup.id === requestedId);

  const activeId =
    hasValidRequestedId
      ? requestedExists
        ? requestedId
        : null
      : Number.isFinite(selectedDuplicantId) && duplicants.some((dup) => dup.id === selectedDuplicantId)
        ? selectedDuplicantId
        : fallbackId;

  useEffect(() => {
    if (
      hasValidRequestedId &&
      requestedExists &&
      selectedDuplicantId !== requestedId
    ) {
      setSelectedDuplicantId(requestedId);
      return;
    }
    if (
      requestedIdParam === null &&
      !Number.isFinite(selectedDuplicantId) &&
      Number.isFinite(fallbackId)
    ) {
      setSelectedDuplicantId(fallbackId);
    }
  }, [
    fallbackId,
    hasValidRequestedId,
    requestedExists,
    requestedId,
    requestedIdParam,
    selectedDuplicantId,
    setSelectedDuplicantId,
  ]);

  const model = useMemo(
    () => selectDuplicantEditorModel(saveGame, activeId),
    [activeId, saveGame]
  );

  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState("");
  const [newTraitId, setNewTraitId] = useState("");
  const [traitError, setTraitError] = useState("");
  const [interestToAdd, setInterestToAdd] = useState("");
  const [attributeDrafts, setAttributeDrafts] = useState({});
  const [attributeErrors, setAttributeErrors] = useState({});
  const [healthDrafts, setHealthDrafts] = useState({});
  const [healthErrors, setHealthErrors] = useState({});
  const [experienceDraft, setExperienceDraft] = useState("0");
  const [experienceError, setExperienceError] = useState("");
  const [effectCycleDrafts, setEffectCycleDrafts] = useState({});
  const [effectErrors, setEffectErrors] = useState({});
  const [newEffectId, setNewEffectId] = useState("");
  const [newEffectCycles, setNewEffectCycles] = useState("5");
  const [newEffectError, setNewEffectError] = useState("");
  const [hairOffsets, setHairOffsets] = useState({});
  const carouselRef = useRef(null);
  const cardRefs = useRef({});
  const [carouselPad, setCarouselPad] = useState(0);
  const carouselDragRef = useRef(null);

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

  useEffect(() => {
    const container = carouselRef.current;
    if (!container || !model?.id) {
      return;
    }
    const card = cardRefs.current[model.id];
    if (!card) {
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const currentLeft = container.scrollLeft;
    const targetLeft =
      currentLeft +
      (cardRect.left - containerRect.left) -
      (containerRect.width / 2 - cardRect.width / 2);
    container.scrollTo({ left: targetLeft, behavior: "smooth" });
  }, [model?.id]);

  useEffect(() => {
    const container = carouselRef.current;
    if (!container) {
      return;
    }
    const computePad = () => {
      const containerRect = container.getBoundingClientRect();
      const sampleCard =
        cardRefs.current[model?.id] ||
        cardRefs.current[duplicants[0]?.id];
      if (!sampleCard) {
        return;
      }
      const cardRect = sampleCard.getBoundingClientRect();
      const pad = Math.max(0, (containerRect.width - cardRect.width) / 2);
      setCarouselPad(pad);
    };

    computePad();
    const observer = new ResizeObserver(() => computePad());
    observer.observe(container);
    return () => observer.disconnect();
  }, [duplicants, model?.id]);

  const scrollCarouselBy = useCallback((direction) => {
    const container = carouselRef.current;
    if (!container) {
      return;
    }
    const delta = container.clientWidth * 0.8 * direction;
    container.scrollBy({ left: delta, behavior: "smooth" });
  }, []);

  const onCarouselPointerDown = useCallback((event) => {
    const container = carouselRef.current;
    if (!container) {
      return;
    }
    carouselDragRef.current = {
      startX: event.clientX,
      startScrollLeft: container.scrollLeft,
      pointerId: event.pointerId,
    };
    container.setPointerCapture?.(event.pointerId);
  }, []);

  const onCarouselPointerMove = useCallback((event) => {
    const container = carouselRef.current;
    const drag = carouselDragRef.current;
    if (!container || !drag) {
      return;
    }
    const deltaX = event.clientX - drag.startX;
    container.scrollLeft = drag.startScrollLeft - deltaX;
  }, []);

  const endCarouselDrag = useCallback((event) => {
    const container = carouselRef.current;
    const drag = carouselDragRef.current;
    if (!container || !drag) {
      return;
    }
    container.releasePointerCapture?.(drag.pointerId);
    carouselDragRef.current = null;
  }, []);

  useEffect(() => {
    setNameDraft(model?.name || "");
    setNameError("");
  }, [model?.name, model?.id]);

  useEffect(() => {
    const nextDrafts = {};
    for (const attribute of model?.attributes || []) {
      nextDrafts[attribute.attributeId] = String(attribute.level);
    }
    setAttributeDrafts(nextDrafts);
    setAttributeErrors({});
  }, [model?.attributes, model?.id]);

  useEffect(() => {
    const firstAvailable = model?.availableInterests?.[0] || "";
    setInterestToAdd(firstAvailable);
  }, [model?.availableInterests, model?.id]);

  useEffect(() => {
    const drafts = {};
    for (const item of model?.health || []) {
      drafts[item.modifier] = String(item.value);
    }
    setHealthDrafts(drafts);
    setHealthErrors({});
  }, [model?.health, model?.id]);

  useEffect(() => {
    setExperienceDraft(String(model?.skills?.totalExperienceGained ?? 0));
    setExperienceError("");
  }, [model?.skills?.totalExperienceGained, model?.id]);

  useEffect(() => {
    const drafts = {};
    for (const effect of model?.effects || []) {
      drafts[effect.id] = String(effect.cyclesRemaining);
    }
    setEffectCycleDrafts(drafts);
    setEffectErrors({});
    setNewEffectId(model?.availableEffects?.[0] || "");
    setNewEffectCycles("5");
    setNewEffectError("");
  }, [model?.effects, model?.availableEffects, model?.id]);

  const genderOptions = useMemo(
    () => [
      { value: "FEMALE", label: "Female" },
      { value: "MALE", label: "Male" },
      { value: "NB", label: "Non-binary" },
    ],
    []
  );

  if (!hasSave) {
    return (
      <SaveRequiredPage
        title="Duplicant Editor"
        description="Load a save first to edit duplicants."
      />
    );
  }

  if (requestedIdParam !== null && !hasValidRequestedId) {
    return (
      <section className="rounded-xl border border-white/20 p-5">
        <h1 className="text-2xl font-semibold">Duplicant Not Found</h1>
        <p className="mt-2 text-sm opacity-80">
          Invalid duplicant ID in route query: <code>{requestedIdParam}</code>
        </p>
        <p className="mt-3 text-sm opacity-70">
          Open <Link href="/duplicants" className="underline">Duplicants</Link> and select a valid entry.
        </p>
      </section>
    );
  }

  if (hasValidRequestedId && !requestedExists) {
    return (
      <section className="rounded-xl border border-white/20 p-5">
        <h1 className="text-2xl font-semibold">Duplicant Not Found</h1>
        <p className="mt-2 text-sm opacity-80">
          No duplicant with Game Object ID <code>{requestedId}</code> exists in this save.
        </p>
        <p className="mt-3 text-sm opacity-70">
          Open <Link href="/duplicants" className="underline">Duplicants</Link> and select an existing duplicant.
        </p>
      </section>
    );
  }

  if (!model) {
    return (
      <section className="rounded-xl border border-white/20 p-5">
        <h1 className="text-2xl font-semibold">Duplicant Editor</h1>
        <p className="mt-2 text-sm opacity-80">
          No duplicant data found in this save.
        </p>
      </section>
    );
  }

  const onAddTrait = () => {
    const value = newTraitId.trim();
    if (!value) {
      setTraitError("Trait ID is required.");
      return;
    }
    if (!TRAIT_ID_PATTERN.test(value)) {
      setTraitError("Trait ID must start with a letter and use letters, numbers, ., _, -.");
      return;
    }
    if (model.traits.includes(value)) {
      setTraitError("Trait already exists on this duplicant.");
      return;
    }
    addDuplicantTrait(model.id, value);
    setNewTraitId("");
    setTraitError("");
  };

  const onApplyName = () => {
    const nextName = nameDraft.trim();
    if (!nextName) {
      setNameError("Name cannot be empty.");
      return;
    }
    if (nextName.length > MAX_NAME_LENGTH) {
      setNameError(`Name cannot exceed ${MAX_NAME_LENGTH} characters.`);
      return;
    }
    updateDuplicantName(model.id, nextName);
    setNameError("");
  };

  const commitAttribute = (attributeId) => {
    const rawValue = attributeDrafts[attributeId];
    const parsed = Number(rawValue);

    if (!Number.isInteger(parsed)) {
      setAttributeErrors((prev) => ({
        ...prev,
        [attributeId]: "Use a whole number.",
      }));
      return;
    }

    if (parsed < ATTRIBUTE_MIN_LEVEL || parsed > ATTRIBUTE_MAX_LEVEL) {
      setAttributeErrors((prev) => ({
        ...prev,
        [attributeId]: `Level must be ${ATTRIBUTE_MIN_LEVEL} to ${ATTRIBUTE_MAX_LEVEL}.`,
      }));
      return;
    }

    updateDuplicantAttributeLevel(model.id, attributeId, parsed);
    setAttributeErrors((prev) => ({
      ...prev,
      [attributeId]: "",
    }));
  };

  const commitHealth = (modifier) => {
    const rawValue = healthDrafts[modifier];
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      setHealthErrors((prev) => ({
        ...prev,
        [modifier]: "Use a valid number.",
      }));
      return;
    }
    if (parsed < HEALTH_MIN) {
      setHealthErrors((prev) => ({
        ...prev,
        [modifier]: "Value cannot be negative.",
      }));
      return;
    }
    updateDuplicantHealthModifier(model.id, modifier, parsed);
    setHealthErrors((prev) => ({
      ...prev,
      [modifier]: "",
    }));
  };

  const commitExperience = () => {
    const parsed = Number(experienceDraft);
    if (!Number.isFinite(parsed) || parsed < EXPERIENCE_MIN) {
      setExperienceError("Experience must be a non-negative number.");
      return;
    }
    updateDuplicantExperience(model.id, parsed);
    setExperienceError("");
  };

  const commitEffectCycles = (effectId) => {
    const rawValue = effectCycleDrafts[effectId];
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setEffectErrors((prev) => ({
        ...prev,
        [effectId]: "Cycles must be zero or greater.",
      }));
      return;
    }
    updateDuplicantEffectCycles(model.id, effectId, parsed);
    setEffectErrors((prev) => ({
      ...prev,
      [effectId]: "",
    }));
  };

  const onAddEffect = () => {
    const parsed = Number(newEffectCycles);
    if (!newEffectId) {
      setNewEffectError("Select an effect.");
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setNewEffectError("Cycles must be greater than 0.");
      return;
    }
    addDuplicantEffect(model.id, newEffectId, parsed);
    setNewEffectError("");
  };

  const onSelectDuplicant = (id) => {
    setSelectedDuplicantId(id);
    router.replace(`/duplicants-editor?id=${id}`);
  };

  const headshapeOrdinal = model.appearance?.headOrdinal ?? 1;
  const hairOrdinal = model.appearance?.hairOrdinal ?? 1;
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
  const hairOffsetY =
    rawOffsetY * CARD_SCALE_RATIO * CARD_CONTENT_SCALE + CARD_CONTENT_OFFSET_Y;
  const hairScale =
    CARD_CONTENT_SCALE * (1 + (rawScale - 1) * CARD_SCALE_RATIO);

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-white/20 p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollCarouselBy(-1)}
              className="m3-button m3-button-outlined px-2 py-1 text-xs"
              aria-label="Scroll left"
            >
              ◀
            </button>
            <div
              ref={carouselRef}
              className="no-scrollbar flex flex-1 snap-x snap-mandatory items-center gap-3 overflow-x-auto pb-2 cursor-grab select-none active:cursor-grabbing"
              style={{ paddingLeft: carouselPad, paddingRight: carouselPad }}
              onPointerDown={onCarouselPointerDown}
              onPointerMove={onCarouselPointerMove}
              onPointerUp={endCarouselDrag}
              onPointerLeave={endCarouselDrag}
              onPointerCancel={endCarouselDrag}
            >
            {duplicants.map((duplicant) => {
              const isSelected = duplicant.id === model.id;
              const appearance = duplicant.appearance || {};
              const dupHead = appearance.headOrdinal ?? 1;
              const dupHair = appearance.hairOrdinal ?? 1;
              const dupHairOffset =
                hairOffsets?.[String(dupHair)] ?? hairOffsets?.[dupHair];
              const dupBaseOffset = HAIR_OFFSET_BASES[dupHair] || {};
              const dupRawOffsetX =
                (Number.isFinite(dupBaseOffset.x) ? dupBaseOffset.x : 0) +
                (Number.isFinite(dupHairOffset?.x) ? dupHairOffset.x : 0);
              const dupRawOffsetY =
                (Number.isFinite(dupBaseOffset.y) ? dupBaseOffset.y : 0) +
                (Number.isFinite(dupHairOffset?.y) ? dupHairOffset.y : 0);
              const dupRawScale =
                (Number.isFinite(dupBaseOffset.scale) ? dupBaseOffset.scale : 1) *
                (Number.isFinite(dupHairOffset?.scale) ? dupHairOffset.scale : 1);
              const dupHairOffsetX =
                dupRawOffsetX * CARD_SCALE_RATIO * CARD_CONTENT_SCALE;
              const dupHairOffsetY =
                dupRawOffsetY * CARD_SCALE_RATIO * CARD_CONTENT_SCALE +
                CARD_CONTENT_OFFSET_Y;
              const dupHairScale =
                CARD_CONTENT_SCALE * (1 + (dupRawScale - 1) * CARD_SCALE_RATIO);

              const imageToneClass = isSelected
                ? ""
                : "grayscale group-hover:grayscale-0";

              return (
                <button
                  key={duplicant.id}
                  type="button"
                  onClick={() => onSelectDuplicant(duplicant.id)}
                  ref={(node) => {
                    if (node) {
                      cardRefs.current[duplicant.id] = node;
                    }
                  }}
                  className={`group flex min-w-[140px] snap-center flex-col items-center gap-2 rounded-lg border px-3 py-3 text-left transition ${
                    isSelected
                      ? "border-white/40 bg-white/5"
                      : "border-white/15 hover:bg-white/5"
                  }`}
                >
                  <div className="relative h-32 w-32 overflow-hidden rounded-md border border-white/15 bg-black/30">
                    <img
                      src={getAccessorySrc("head", dupHead)}
                      alt={`Headshape ${dupHead}`}
                      className={`absolute inset-0 h-full w-full object-contain ${imageToneClass}`}
                      style={{
                        transform: `translateY(${CARD_CONTENT_OFFSET_Y}px) scale(${CARD_CONTENT_SCALE})`,
                        transformOrigin: "50% 50%",
                      }}
                      draggable={false}
                      loading="lazy"
                    />
                    <img
                      src={getAccessorySrc("hair", dupHair)}
                      alt={`Hair ${dupHair}`}
                      className={`absolute inset-0 h-full w-full object-contain ${imageToneClass}`}
                      style={{
                        transform: `translate(${dupHairOffsetX}px, ${dupHairOffsetY}px) scale(${dupHairScale})`,
                        transformOrigin: "50% 50%",
                      }}
                      draggable={false}
                      loading="lazy"
                    />
                  </div>
                  <div className="text-xs opacity-80">
                    {duplicant.name} ({duplicant.id})
                  </div>
                </button>
              );
            })}
            </div>
            <button
              type="button"
              onClick={() => scrollCarouselBy(1)}
              className="m3-button m3-button-outlined px-2 py-1 text-xs"
              aria-label="Scroll right"
            >
              ▶
            </button>
          </div>
        </div>
      </header>

      <div className="rounded-xl border border-white/20 p-4">
        <h2 className="text-lg font-semibold">Name</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            maxLength={MAX_NAME_LENGTH}
            className="min-w-[240px] rounded-md border border-white/25 bg-black px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={onApplyName}
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-black hover:brightness-110"
          >
            Apply Name
          </button>
        </div>
        {nameError ? <p className="mt-2 text-xs text-red-300">{nameError}</p> : null}
      </div>

      <div className="rounded-xl border border-white/20 p-4">
        <h2 className="text-lg font-semibold">Identity</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="opacity-80">Gender</span>
            <select
              value={model.gender || "FEMALE"}
              onChange={(event) => updateDuplicantGender(model.id, event.target.value)}
              className="rounded-md border border-white/25 bg-black px-3 py-2 text-sm"
            >
              {genderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-white/20 p-4">
        <h2 className="text-lg font-semibold">Traits</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {model.traits.length === 0 ? (
            <span className="text-sm opacity-70">No traits</span>
          ) : (
            model.traits.map((trait) => (
              <button
                key={trait}
                type="button"
                onClick={() => removeDuplicantTrait(model.id, trait)}
                className="rounded-md border border-white/25 px-2 py-1 text-xs hover:bg-white/10"
                title="Remove trait"
              >
                {trait} x
              </button>
            ))
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newTraitId}
            onChange={(event) => setNewTraitId(event.target.value)}
            placeholder="Trait ID (e.g. FastLearner)"
            className="min-w-[260px] rounded-md border border-white/25 bg-black px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={onAddTrait}
            className="rounded-md border border-white/25 px-3 py-2 text-sm font-semibold hover:bg-white/10"
          >
            Add Trait
          </button>
        </div>
        {traitError ? <p className="mt-2 text-xs text-red-300">{traitError}</p> : null}
      </div>

      <div className="rounded-xl border border-white/20 p-4">
        <h2 className="text-lg font-semibold">Interests</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {model.interests.length === 0 ? (
            <span className="text-sm opacity-70">No interests</span>
          ) : (
            model.interests.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => removeDuplicantInterest(model.id, interest)}
                className="rounded-md border border-white/25 px-2 py-1 text-xs hover:bg-white/10"
                title="Remove interest"
              >
                {interest} x
              </button>
            ))
          )}
        </div>

        {model.unknownInterestHashes.length > 0 ? (
          <p className="mt-2 text-xs opacity-70">
            Unknown interest hashes preserved: {model.unknownInterestHashes.join(", ")}
          </p>
        ) : null}

        {model.availableInterests.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={interestToAdd}
              onChange={(event) => setInterestToAdd(event.target.value)}
              className="rounded-md border border-white/25 bg-black px-3 py-2 text-sm"
            >
              {model.availableInterests.map((interest) => (
                <option key={interest} value={interest}>
                  {interest}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                if (interestToAdd) {
                  addDuplicantInterest(model.id, interestToAdd);
                }
              }}
              className="rounded-md border border-white/25 px-3 py-2 text-sm font-semibold hover:bg-white/10"
            >
              Add Interest
            </button>
          </div>
        ) : (
          <p className="mt-3 text-xs opacity-70">All known interests already selected.</p>
        )}
      </div>

      <div className="rounded-xl border border-white/20 p-4">
        <h2 className="text-lg font-semibold">Attributes</h2>
        <p className="mt-1 text-xs opacity-70">
          Allowed range: {ATTRIBUTE_MIN_LEVEL} to {ATTRIBUTE_MAX_LEVEL}, whole numbers only.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {model.attributes.map((attribute) => (
            <div
              key={attribute.attributeId}
              className="flex items-center justify-between gap-3 rounded-md border border-white/10 px-3 py-2"
            >
              <label className="text-sm opacity-80">{attribute.attributeId}</label>
              <div>
                <input
                  type="number"
                  step="1"
                  value={attributeDrafts[attribute.attributeId] ?? ""}
                  onChange={(event) =>
                    setAttributeDrafts((prev) => ({
                      ...prev,
                      [attribute.attributeId]: event.target.value,
                    }))
                  }
                  onBlur={() => commitAttribute(attribute.attributeId)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      commitAttribute(attribute.attributeId);
                    }
                  }}
                  className="w-20 rounded-md border border-white/25 bg-black px-2 py-1 text-right text-sm"
                />
                {attributeErrors[attribute.attributeId] ? (
                  <p className="mt-1 w-36 text-right text-xs text-red-300">
                    {attributeErrors[attribute.attributeId]}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/20 p-4">
        <h2 className="text-lg font-semibold">Appearance</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="opacity-80">Hair</span>
            <input
              type="number"
              min="1"
              value={model.appearance.hairOrdinal}
              onChange={(event) =>
                updateDuplicantAppearance(model.id, "hair", Number(event.target.value))
              }
              className="rounded-md border border-white/25 bg-black px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="opacity-80">Head Shape</span>
            <input
              type="number"
              min="1"
              max="7"
              value={model.appearance.headOrdinal}
              onChange={(event) =>
                updateDuplicantAppearance(model.id, "headshape", Number(event.target.value))
              }
              className="rounded-md border border-white/25 bg-black px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="opacity-80">Eyes</span>
            <input
              type="number"
              min="1"
              value={model.appearance.eyesOrdinal}
              onChange={(event) =>
                updateDuplicantAppearance(model.id, "eyes", Number(event.target.value))
              }
              className="rounded-md border border-white/25 bg-black px-3 py-2 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-white/20 p-4">
        <h2 className="text-lg font-semibold">Health</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {model.health.map((entry) => (
            <div
              key={entry.modifier}
              className="rounded-md border border-white/10 px-3 py-2"
            >
              <label className="text-sm opacity-80">{entry.modifier}</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={HEALTH_MIN}
                  max={entry.max}
                  value={healthDrafts[entry.modifier] ?? ""}
                  onChange={(event) =>
                    setHealthDrafts((prev) => ({
                      ...prev,
                      [entry.modifier]: event.target.value,
                    }))
                  }
                  onBlur={() => commitHealth(entry.modifier)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      commitHealth(entry.modifier);
                    }
                  }}
                  className="w-28 rounded-md border border-white/25 bg-black px-2 py-1 text-sm"
                />
                <span className="text-xs opacity-70">max {entry.max}</span>
              </div>
              {healthErrors[entry.modifier] ? (
                <p className="mt-1 text-xs text-red-300">{healthErrors[entry.modifier]}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/20 p-4">
        <h2 className="text-lg font-semibold">Skills</h2>
        <div className="mt-3 rounded-md border border-white/10 p-3">
          <label className="text-sm opacity-80">Total Experience</label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={EXPERIENCE_MIN}
              value={experienceDraft}
              onChange={(event) => setExperienceDraft(event.target.value)}
              onBlur={commitExperience}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitExperience();
                }
              }}
              className="w-40 rounded-md border border-white/25 bg-black px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={commitExperience}
              className="rounded-md border border-white/25 px-3 py-2 text-sm font-semibold hover:bg-white/10"
            >
              Apply
            </button>
          </div>
          {experienceError ? <p className="mt-1 text-xs text-red-300">{experienceError}</p> : null}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {model.skills.skills.map((skill) => (
            <label
              key={skill.skillId}
              className="flex items-center justify-between gap-2 rounded-md border border-white/10 px-3 py-2 text-sm"
            >
              <span className="opacity-80">{skill.skillId}</span>
              <input
                type="checkbox"
                checked={skill.mastered}
                onChange={(event) =>
                  setDuplicantSkillMastery(model.id, skill.skillId, event.target.checked)
                }
                className="h-4 w-4 accent-[var(--accent)]"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/20 p-4">
        <h2 className="text-lg font-semibold">Effects</h2>
        {model.effects.length === 0 ? (
          <p className="mt-2 text-sm opacity-70">No active effects.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {model.effects.map((effect) => (
              <div
                key={effect.id}
                className="rounded-md border border-white/10 px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm opacity-85">{effect.id}</span>
                  <input
                    type="number"
                    min="0"
                    value={effectCycleDrafts[effect.id] ?? ""}
                    onChange={(event) =>
                      setEffectCycleDrafts((prev) => ({
                        ...prev,
                        [effect.id]: event.target.value,
                      }))
                    }
                    onBlur={() => commitEffectCycles(effect.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        commitEffectCycles(effect.id);
                      }
                    }}
                    className="w-24 rounded-md border border-white/25 bg-black px-2 py-1 text-sm"
                  />
                  <span className="text-xs opacity-70">cycles</span>
                  <button
                    type="button"
                    onClick={() => removeDuplicantEffect(model.id, effect.id)}
                    className="ml-auto rounded-md border border-white/25 px-2 py-1 text-xs font-semibold hover:bg-white/10"
                  >
                    Remove
                  </button>
                </div>
                {effectErrors[effect.id] ? (
                  <p className="mt-1 text-xs text-red-300">{effectErrors[effect.id]}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-md border border-white/10 p-3">
          <h3 className="text-sm font-semibold">Add Effect</h3>
          {model.availableEffects.length === 0 ? (
            <p className="mt-2 text-xs opacity-70">No remaining known effects to add.</p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                value={newEffectId}
                onChange={(event) => setNewEffectId(event.target.value)}
                className="rounded-md border border-white/25 bg-black px-3 py-2 text-sm"
              >
                {model.availableEffects.map((effectId) => (
                  <option key={effectId} value={effectId}>
                    {effectId}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={newEffectCycles}
                onChange={(event) => setNewEffectCycles(event.target.value)}
                className="w-24 rounded-md border border-white/25 bg-black px-2 py-1 text-sm"
              />
              <span className="text-xs opacity-70">cycles</span>
              <button
                type="button"
                onClick={onAddEffect}
                className="rounded-md border border-white/25 px-3 py-2 text-sm font-semibold hover:bg-white/10"
              >
                Add
              </button>
            </div>
          )}
          {newEffectError ? <p className="mt-1 text-xs text-red-300">{newEffectError}</p> : null}
        </div>
      </div>
    </section>
  );
}

export default function DuplicantEditorPage() {
  return (
    <Suspense fallback={<DuplicantEditorFallback />}>
      <DuplicantEditorPageContent />
    </Suspense>
  );
}
