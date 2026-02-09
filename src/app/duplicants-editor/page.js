"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import SaveRequiredPage from "@/components/save-required-page";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import { selectDuplicantEditorModel, selectDuplicants } from "@/lib/oni/save-selectors";
import { HAIR_OFFSET_BASES } from "@/lib/oni/hair-offsets";
import {
  HAIR_ASSET_ORDINALS,
  HEAD_ASSET_ORDINALS,
  getSafeAccessoryOrdinal,
  isAccessoryAssetAvailable,
} from "@/lib/oni/accessory-constraints";
import { withBasePath } from "@/lib/asset-paths";
import { getSkillGroupDisplayName } from "@/lib/oni/minion-interests";
import {
  OVERJOYED_TRAIT_IDS,
  STRESS_REACTION_TRAIT_IDS,
  getAllKnownTraits,
  getTraitDisplayName,
  getTraitDescription,
  normalizeTraitId,
  isBionicTraitId,
} from "@/lib/oni/trait-names";

const ATTRIBUTE_MIN_LEVEL = -20;
const ATTRIBUTE_MAX_LEVEL = 99;
const MAX_NAME_LENGTH = 64;
const EXPERIENCE_MIN = 0;
const HEALTH_MIN = 0;
const ACCESSORY_BASE_PATH = withBasePath("/images/oni");
const PREVIEW_SIZE = 32;
const CARD_SIZE = 32;
const CARD_CONTENT_SCALE = 0.65;
const CARD_CONTENT_OFFSET_Y = 25;
const CARD_SCALE_RATIO = CARD_SIZE / PREVIEW_SIZE;
const CAROUSEL_NAME_MAX = 12;
const APPEARANCE_MODAL_PREVIEW_SCALE = 0.65;
const APPEARANCE_MODAL_PREVIEW_OFFSET_Y = 25;
const APPEARANCE_MODAL_CARD_SCALE = 0.6;
const APPEARANCE_MODAL_CARD_OFFSET_Y = 22;
const HEAD_SHAPE_OPTIONS = HEAD_ASSET_ORDINALS;
const HAIR_STYLE_OPTIONS = HAIR_ASSET_ORDINALS;

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

function truncateName(name) {
  if (!name || name.length <= CAROUSEL_NAME_MAX) {
    return name;
  }
  return `${name.slice(0, Math.max(0, CAROUSEL_NAME_MAX - 3))}...`;
}

function getHairAdjustments(hairOrdinal, hairOffsets) {
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
  return { rawOffsetX, rawOffsetY, rawScale };
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
    modifyBehavior,
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
  const [addTraitCategory, setAddTraitCategory] = useState("positive");
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
  const [appearanceModalOpen, setAppearanceModalOpen] = useState(false);
  const [isAppearanceModalVisible, setIsAppearanceModalVisible] = useState(false);
  const [appearanceEditorTab, setAppearanceEditorTab] = useState("head");
  const [reactionModal, setReactionModal] = useState(null);
  const [isReactionModalVisible, setIsReactionModalVisible] = useState(false);
  const carouselRef = useRef(null);
  const cardRefs = useRef({});
  const [carouselPad, setCarouselPad] = useState(0);
  const carouselDragRef = useRef(null);
  const suppressCarouselClickRef = useRef(false);
  const appearanceModalCloseTimerRef = useRef(null);
  const appearanceModalRafRef = useRef(null);
  const reactionModalCloseTimerRef = useRef(null);
  const reactionModalRafRef = useRef(null);

  const CAROUSEL_DRAG_THRESHOLD = 6;

  useEffect(() => {
    return () => {
      if (appearanceModalCloseTimerRef.current) {
        clearTimeout(appearanceModalCloseTimerRef.current);
      }
      if (appearanceModalRafRef.current) {
        cancelAnimationFrame(appearanceModalRafRef.current);
      }
      if (reactionModalCloseTimerRef.current) {
        clearTimeout(reactionModalCloseTimerRef.current);
      }
      if (reactionModalRafRef.current) {
        cancelAnimationFrame(reactionModalRafRef.current);
      }
    };
  }, []);

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
    const raf = window.requestAnimationFrame(() => {
      const containerRect = container.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const currentLeft = container.scrollLeft;
      const targetLeft =
        currentLeft +
        (cardRect.left - containerRect.left) -
        (containerRect.width / 2 - cardRect.width / 2);
      container.scrollTo({ left: targetLeft, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [model?.id, carouselPad]);

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
      startY: event.clientY,
      startScrollLeft: container.scrollLeft,
      pointerId: event.pointerId,
      didDrag: false,
    };
  }, []);

  const onCarouselPointerMove = useCallback((event) => {
    const container = carouselRef.current;
    const drag = carouselDragRef.current;
    if (!container || !drag) {
      return;
    }
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.didDrag) {
      if (
        Math.abs(deltaX) < CAROUSEL_DRAG_THRESHOLD &&
        Math.abs(deltaY) < CAROUSEL_DRAG_THRESHOLD
      ) {
        return;
      }
      drag.didDrag = true;
      container.setPointerCapture?.(drag.pointerId);
    }
    event.preventDefault();
    container.scrollLeft = drag.startScrollLeft - deltaX;
  }, []);

  const endCarouselDrag = useCallback((event) => {
    const container = carouselRef.current;
    const drag = carouselDragRef.current;
    if (!container || !drag) {
      return;
    }
    if (drag.didDrag) {
      container.releasePointerCapture?.(drag.pointerId);
      suppressCarouselClickRef.current = true;
      setTimeout(() => {
        suppressCarouselClickRef.current = false;
      }, 0);
    }
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
  const genderShortLabel = useCallback((value) => {
    switch (value) {
      case "FEMALE":
        return "F";
      case "MALE":
        return "M";
      case "NB":
        return "X";
      default:
        return "?";
    }
  }, []);

  const overjoyedReactions = useMemo(() => {
    if (!model?.traits?.length) {
      return [];
    }
    return model.traits.filter((traitId) =>
      OVERJOYED_TRAIT_IDS.has(normalizeTraitId(traitId))
    );
  }, [model?.traits]);

  const stressReactions = useMemo(() => {
    if (!model?.traits?.length) {
      return [];
    }
    return model.traits.filter((traitId) =>
      STRESS_REACTION_TRAIT_IDS.has(normalizeTraitId(traitId))
    );
  }, [model?.traits]);

  const nonReactionTraits = useMemo(() => {
    if (!model?.traits?.length) {
      return [];
    }
    return model.traits.filter((traitId) => {
      const normalized = normalizeTraitId(traitId);
      return (
        normalized &&
        !OVERJOYED_TRAIT_IDS.has(normalized) &&
        !STRESS_REACTION_TRAIT_IDS.has(normalized)
      );
    });
  }, [model?.traits]);

  const eligibleOverjoyedTraits = useMemo(() => {
    return [...OVERJOYED_TRAIT_IDS]
      .filter((traitId) => !isBionicTraitId(traitId))
      .map((traitId) => {
        const description = getTraitDescription(traitId);
        const normalizedDescription = description.trim();
        const withOverjoyedSuffix = normalizedDescription
          ? /Overjoyed\.$/i.test(normalizedDescription)
            ? normalizedDescription
            : `${normalizedDescription} Overjoyed.`
          : "";
        return {
          id: traitId,
          name: getTraitDisplayName(traitId),
          description: withOverjoyedSuffix,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const eligibleStressTraits = useMemo(() => {
    return [...STRESS_REACTION_TRAIT_IDS]
      .filter((traitId) => !isBionicTraitId(traitId))
      .map((traitId) => ({
        id: traitId,
        name: getTraitDisplayName(traitId),
        description: getTraitDescription(traitId),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const addableTraits = useMemo(() => {
    const ownedTraitIds = new Set((model?.traits || []).map(normalizeTraitId));
    return getAllKnownTraits()
      .filter((trait) => !isBionicTraitId(trait.id))
      .filter((trait) => trait.category === addTraitCategory)
      .map((trait) => ({
        ...trait,
        isOwned: ownedTraitIds.has(trait.id),
      }));
  }, [addTraitCategory, model?.traits]);

  const selectedOverjoyedId = useMemo(
    () => normalizeTraitId(overjoyedReactions[0]),
    [overjoyedReactions]
  );
  const selectedStressId = useMemo(
    () => normalizeTraitId(stressReactions[0]),
    [stressReactions]
  );

  const applyReactionTrait = useCallback(
    (kind, traitId) => {
      if (!model?.id || typeof traitId !== "string") {
        return;
      }
      const normalizedSelected = normalizeTraitId(traitId);
      const reactionSet =
        kind === "overjoyed" ? OVERJOYED_TRAIT_IDS : STRESS_REACTION_TRAIT_IDS;
      if (!reactionSet.has(normalizedSelected)) {
        return;
      }
      const currentTraits = Array.isArray(model?.traits) ? model.traits : [];
      const filteredTraits = currentTraits.filter(
        (current) => !reactionSet.has(normalizeTraitId(current))
      );
      const nextTraitIds = [...filteredTraits, normalizedSelected];
      modifyBehavior(model.id, "Klei.AI.Traits", "templateData", { TraitIds: nextTraitIds });
      setIsReactionModalVisible(false);
      reactionModalCloseTimerRef.current = setTimeout(() => {
        setReactionModal(null);
      }, 120);
    },
    [model?.id, model?.traits, modifyBehavior]
  );

  const openReactionModal = useCallback((kind) => {
    if (reactionModalCloseTimerRef.current) {
      clearTimeout(reactionModalCloseTimerRef.current);
      reactionModalCloseTimerRef.current = null;
    }
    if (reactionModalRafRef.current) {
      cancelAnimationFrame(reactionModalRafRef.current);
      reactionModalRafRef.current = null;
    }
    setReactionModal(kind);
    if (kind === "add-traits") {
      setAddTraitCategory("positive");
    }
    setIsReactionModalVisible(false);
    reactionModalRafRef.current = requestAnimationFrame(() => {
      setIsReactionModalVisible(true);
      reactionModalRafRef.current = null;
    });
  }, []);

  const closeReactionModal = useCallback(() => {
    if (!reactionModal) {
      return;
    }
    if (reactionModalCloseTimerRef.current) {
      clearTimeout(reactionModalCloseTimerRef.current);
    }
    setIsReactionModalVisible(false);
    reactionModalCloseTimerRef.current = setTimeout(() => {
      setReactionModal(null);
      reactionModalCloseTimerRef.current = null;
    }, 120);
  }, [reactionModal]);

  const openAppearanceModal = useCallback(() => {
    if (appearanceModalCloseTimerRef.current) {
      clearTimeout(appearanceModalCloseTimerRef.current);
      appearanceModalCloseTimerRef.current = null;
    }
    if (appearanceModalRafRef.current) {
      cancelAnimationFrame(appearanceModalRafRef.current);
      appearanceModalRafRef.current = null;
    }
    setAppearanceEditorTab("head");
    setAppearanceModalOpen(true);
    setIsAppearanceModalVisible(false);
    appearanceModalRafRef.current = requestAnimationFrame(() => {
      setIsAppearanceModalVisible(true);
      appearanceModalRafRef.current = null;
    });
  }, []);

  const closeAppearanceModal = useCallback(() => {
    if (!appearanceModalOpen) {
      return;
    }
    if (appearanceModalCloseTimerRef.current) {
      clearTimeout(appearanceModalCloseTimerRef.current);
    }
    setIsAppearanceModalVisible(false);
    appearanceModalCloseTimerRef.current = setTimeout(() => {
      setAppearanceModalOpen(false);
      appearanceModalCloseTimerRef.current = null;
    }, 120);
  }, [appearanceModalOpen]);

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
  const eyesOrdinal = model.appearance?.eyesOrdinal ?? 1;
  const hasCurrentHairAsset = isAccessoryAssetAvailable("hair", hairOrdinal);
  const hasCurrentHeadAsset = isAccessoryAssetAvailable("head", headshapeOrdinal);
  const { rawOffsetX, rawOffsetY, rawScale } = getHairAdjustments(hairOrdinal, hairOffsets);
  const modalPreviewHairOffsetX = rawOffsetX * APPEARANCE_MODAL_PREVIEW_SCALE;
  const modalPreviewHairOffsetY =
    rawOffsetY * APPEARANCE_MODAL_PREVIEW_SCALE + APPEARANCE_MODAL_PREVIEW_OFFSET_Y;
  const modalPreviewHairScale = APPEARANCE_MODAL_PREVIEW_SCALE * rawScale;
  const modalCardHairOffsetX = rawOffsetX * APPEARANCE_MODAL_CARD_SCALE;
  const modalCardHairOffsetY =
    rawOffsetY * APPEARANCE_MODAL_CARD_SCALE + APPEARANCE_MODAL_CARD_OFFSET_Y;
  const modalCardHairScale = APPEARANCE_MODAL_CARD_SCALE * rawScale;

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
                  onClick={() => {
                    if (suppressCarouselClickRef.current) {
                      return;
                    }
                    onSelectDuplicant(duplicant.id);
                  }}
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
                    {truncateName(duplicant.name)} ({duplicant.id}){" "}
                    {genderShortLabel(duplicant.gender)}
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
        <h2 className="text-lg font-semibold">Identity</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex min-w-[360px] flex-1 flex-col gap-1 text-sm">
            <span className="opacity-80">Name</span>
            <div className="flex flex-1 items-center gap-2">
              <input
                type="text"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                maxLength={MAX_NAME_LENGTH}
                className="min-w-[320px] flex-1 rounded-md border border-white/25 bg-black px-3 py-2 text-sm"
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
          </label>
          <label className="flex w-[180px] flex-col gap-1 text-sm">
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
          <label className="flex w-[200px] flex-col gap-1 text-sm">
            <span className="opacity-80">Appearance</span>
            <button
              type="button"
              onClick={openAppearanceModal}
              className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#000000] hover:brightness-110"
            >
              Edit Appearance
            </button>
          </label>
        </div>
      </div>

      {appearanceModalOpen ? (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 transition-opacity duration-150 ${
            isAppearanceModalVisible ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeAppearanceModal}
        >
          <div
            className={`m3-surface-raised flex max-h-[85vh] w-full max-w-3xl flex-col p-5 transition duration-150 ${
              isAppearanceModalVisible
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-1 scale-[0.99] opacity-0"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold">Edit Appearance</h3>
              <button
                type="button"
                onClick={closeAppearanceModal}
                className="m3-button m3-button-outlined px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="relative h-44 w-44 overflow-hidden rounded-lg border border-white/15 bg-black/30">
                <img
                  src={getAccessorySrc("head", headshapeOrdinal)}
                  alt={`Headshape ${headshapeOrdinal}`}
                  className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                  style={{
                    transform: `translateY(${APPEARANCE_MODAL_PREVIEW_OFFSET_Y}px) scale(${APPEARANCE_MODAL_PREVIEW_SCALE})`,
                    transformOrigin: "center",
                  }}
                  draggable={false}
                />
                <img
                  src={getAccessorySrc("hair", hairOrdinal)}
                  alt={`Hair ${hairOrdinal}`}
                  className="pointer-events-none absolute left-1/2 top-1/2 h-full w-full object-contain"
                  style={{
                    transform: `translate(calc(-50% + ${modalPreviewHairOffsetX}px), calc(-50% + ${modalPreviewHairOffsetY}px)) scale(${modalPreviewHairScale})`,
                    transformOrigin: "center",
                  }}
                  draggable={false}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAppearanceEditorTab("head")}
                className={`rounded-md px-3 py-2 text-sm font-semibold text-[#000000] ${
                  appearanceEditorTab === "head"
                    ? "bg-[#7f56c5]"
                    : "bg-[var(--accent)] hover:bg-[#a98add]"
                }`}
              >
                Head
              </button>
              <button
                type="button"
                onClick={() => setAppearanceEditorTab("hair")}
                className={`rounded-md px-3 py-2 text-sm font-semibold text-[#000000] ${
                  appearanceEditorTab === "hair"
                    ? "bg-[#7f56c5]"
                    : "bg-[var(--accent)] hover:bg-[#a98add]"
                }`}
              >
                Hair
              </button>
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-md bg-[#7f56c5] px-3 py-2 text-sm font-semibold text-[#000000] opacity-60"
              >
                Eyes
              </button>
            </div>

            {appearanceEditorTab === "head" ? (
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 touch-pan-y">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {HEAD_SHAPE_OPTIONS.map((headOrdinal) => {
                    const isSelected = headOrdinal === headshapeOrdinal;
                    return (
                      <button
                        key={headOrdinal}
                        type="button"
                        onClick={() =>
                          updateDuplicantAppearance(model.id, "headshape", headOrdinal)
                        }
                        className={`rounded-lg border p-2 text-left transition ${
                          isSelected
                            ? "border-transparent bg-[#7f56c5] text-[#000000]"
                            : "border-white/15 bg-[var(--surface-container)] text-[var(--foreground)] hover:bg-white/5"
                        }`}
                      >
                        <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-md border border-white/15 bg-black/30">
                          <img
                            src={getAccessorySrc("head", headOrdinal)}
                            alt={`Headshape ${headOrdinal}`}
                            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                            style={{
                              transform: `translateY(${APPEARANCE_MODAL_CARD_OFFSET_Y}px) scale(${APPEARANCE_MODAL_CARD_SCALE})`,
                              transformOrigin: "center",
                            }}
                            draggable={false}
                          />
                          <img
                            src={getAccessorySrc("hair", hairOrdinal)}
                            alt={`Hair ${hairOrdinal}`}
                            className="pointer-events-none absolute left-1/2 top-1/2 h-full w-full object-contain"
                            style={{
                              transform: `translate(calc(-50% + ${modalCardHairOffsetX}px), calc(-50% + ${modalCardHairOffsetY}px)) scale(${modalCardHairScale})`,
                              transformOrigin: "center",
                            }}
                            draggable={false}
                          />
                        </div>
                        <p className="mt-2 text-center text-xs font-semibold">
                          Headshape {headOrdinal}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {appearanceEditorTab === "hair" ? (
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 touch-pan-y">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {HAIR_STYLE_OPTIONS.map((hairOptionOrdinal) => {
                    const isSelected = hairOptionOrdinal === hairOrdinal;
                    const hairAdjustments = getHairAdjustments(hairOptionOrdinal, hairOffsets);
                    const optionHairOffsetX =
                      hairAdjustments.rawOffsetX * APPEARANCE_MODAL_CARD_SCALE;
                    const optionHairOffsetY =
                      hairAdjustments.rawOffsetY * APPEARANCE_MODAL_CARD_SCALE +
                      APPEARANCE_MODAL_CARD_OFFSET_Y;
                    const optionHairScale =
                      APPEARANCE_MODAL_CARD_SCALE * hairAdjustments.rawScale;

                    return (
                      <button
                        key={hairOptionOrdinal}
                        type="button"
                        onClick={() =>
                          updateDuplicantAppearance(model.id, "hair", hairOptionOrdinal)
                        }
                        className={`rounded-lg border p-2 text-left transition ${
                          isSelected
                            ? "border-transparent bg-[#7f56c5] text-[#000000]"
                            : "border-white/15 bg-[var(--surface-container)] text-[var(--foreground)] hover:bg-white/5"
                        }`}
                      >
                        <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-md border border-white/15 bg-black/30">
                          <img
                            src={getAccessorySrc("head", headshapeOrdinal)}
                            alt={`Headshape ${headshapeOrdinal}`}
                            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                            style={{
                              transform: `translateY(${APPEARANCE_MODAL_CARD_OFFSET_Y}px) scale(${APPEARANCE_MODAL_CARD_SCALE})`,
                              transformOrigin: "center",
                            }}
                            draggable={false}
                          />
                          <img
                            src={getAccessorySrc("hair", hairOptionOrdinal)}
                            alt={`Hair ${hairOptionOrdinal}`}
                            className="pointer-events-none absolute left-1/2 top-1/2 h-full w-full object-contain"
                            style={{
                              transform: `translate(calc(-50% + ${optionHairOffsetX}px), calc(-50% + ${optionHairOffsetY}px)) scale(${optionHairScale})`,
                              transformOrigin: "center",
                            }}
                            draggable={false}
                          />
                        </div>
                        <p className="mt-2 text-center text-xs font-semibold">
                          Hair {hairOptionOrdinal}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <p className="mt-3 text-xs opacity-70">
              Eyes ({eyesOrdinal}) editor is planned next.
            </p>
            {!hasCurrentHeadAsset || !hasCurrentHairAsset ? (
              <p className="mt-1 text-xs opacity-60">
                Preview uses fallback assets when current ID has no local image.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-white/20 p-4">
        <h2 className="text-lg font-semibold">Traits</h2>
        <div className="mt-3 flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="opacity-70">Overjoyed Reactions:</span>
            <button
              type="button"
              onClick={() => openReactionModal("overjoyed")}
              className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#000000] hover:brightness-110"
            >
              {overjoyedReactions.length === 0
                ? "None"
                : overjoyedReactions.map(getTraitDisplayName).join(", ")}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="opacity-70">Stress Reactions:</span>
            <button
              type="button"
              onClick={() => openReactionModal("stress")}
              className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#000000] hover:brightness-110"
            >
              {stressReactions.length === 0
                ? "None"
                : stressReactions.map(getTraitDisplayName).join(", ")}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="opacity-70">Traits:</span>
            <button
              type="button"
              onClick={() => openReactionModal("add-traits")}
              className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#000000] hover:brightness-110"
            >
              Add Traits
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {nonReactionTraits.length === 0 ? (
            <span className="text-sm opacity-70">No traits</span>
          ) : (
            nonReactionTraits.map((trait) => (
              <button
                key={trait}
                type="button"
                onClick={() => removeDuplicantTrait(model.id, trait)}
                className="rounded-md border border-white/25 px-2 py-1 text-xs hover:bg-white/10"
                title="Remove trait"
              >
                {getTraitDisplayName(trait)} x
              </button>
            ))
          )}
        </div>
      </div>

      {reactionModal ? (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 transition-opacity duration-150 ${
            isReactionModalVisible ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeReactionModal}
        >
          <div
            className={`m3-surface-raised flex max-h-[85vh] w-full max-w-lg flex-col p-5 transition duration-150 ${
              isReactionModalVisible
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-1 scale-[0.99] opacity-0"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold">
                {reactionModal === "overjoyed"
                  ? "Overjoyed Reactions"
                  : reactionModal === "stress"
                    ? "Stress Reactions"
                    : "Add Traits"}
              </h3>
              <button
                type="button"
                onClick={closeReactionModal}
                className="m3-button m3-button-outlined px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>
            {reactionModal === "add-traits" ? (
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAddTraitCategory("positive")}
                  className={`rounded-md px-3 py-2 text-sm font-semibold text-[#000000] ${
                    addTraitCategory === "positive"
                      ? "bg-[#7f56c5]"
                      : "bg-[var(--accent)] hover:bg-[#a98add]"
                  }`}
                >
                  Positive
                </button>
                <button
                  type="button"
                  onClick={() => setAddTraitCategory("universal")}
                  className={`rounded-md px-3 py-2 text-sm font-semibold text-[#000000] ${
                    addTraitCategory === "universal"
                      ? "bg-[#7f56c5]"
                      : "bg-[var(--accent)] hover:bg-[#a98add]"
                  }`}
                >
                  Universal
                </button>
                <button
                  type="button"
                  onClick={() => setAddTraitCategory("negative")}
                  className={`rounded-md px-3 py-2 text-sm font-semibold text-[#000000] ${
                    addTraitCategory === "negative"
                      ? "bg-[#7f56c5]"
                      : "bg-[var(--accent)] hover:bg-[#a98add]"
                  }`}
                >
                  Negative
                </button>
              </div>
            ) : null}
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 touch-pan-y">
              <div className="flex flex-col gap-2">
                {(reactionModal === "overjoyed"
                  ? eligibleOverjoyedTraits
                  : reactionModal === "stress"
                    ? eligibleStressTraits
                    : addableTraits
                ).map((trait) => {
                  if (reactionModal === "add-traits") {
                    return (
                      <button
                        key={trait.id}
                        type="button"
                        onClick={() => addDuplicantTrait(model.id, trait.id)}
                        disabled={trait.isOwned}
                        className={`w-full rounded-md border px-4 py-2.5 text-left text-[#000000] transition ${
                          trait.isOwned
                            ? "cursor-not-allowed border-[#5f3f98] bg-[#7f56c5] opacity-60"
                            : "border-transparent bg-[var(--accent)] hover:bg-[#a98add]"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                          <span>{trait.name}</span>
                          {trait.isOwned ? <span className="text-xs font-bold">Owned</span> : null}
                        </span>
                        {trait.description ? (
                          <span className="mt-1 block text-xs italic text-black/80">
                            {trait.description}
                          </span>
                        ) : null}
                      </button>
                    );
                  }
                  const normalizedTraitId = normalizeTraitId(trait.id);
                  const isSelected =
                    (reactionModal === "overjoyed" ? selectedOverjoyedId : selectedStressId) ===
                    normalizedTraitId;
                  return (
                    <button
                      key={trait.id}
                      type="button"
                      disabled={isSelected}
                      onClick={() => applyReactionTrait(reactionModal, trait.id)}
                      className={`w-full rounded-md border px-4 py-2.5 text-left text-[#000000] transition disabled:opacity-100 ${
                        isSelected
                          ? "cursor-not-allowed border-transparent bg-[#7f56c5]"
                          : "border-transparent bg-[var(--accent)] hover:bg-[#a98add]"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                        <span>{trait.name}</span>
                        {isSelected ? <span className="text-xs font-bold">Current</span> : null}
                      </span>
                      {trait.description ? (
                        <span className="mt-1 block text-xs italic text-black/80">
                          {trait.description}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
                {getSkillGroupDisplayName(interest)} x
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
                    {getSkillGroupDisplayName(interest)}
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
