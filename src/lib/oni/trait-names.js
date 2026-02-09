import baseTraits from "./traits-data/oni_traits.json";
import knownTraits from "./traits-data/oni_traits_known.json";
import {
  BIONIC_TRAITS,
  DUPE_OVERJOYED_REACTION_IDS,
  DUPE_STRESS_REACTION_IDS,
  DUPE_TRAITS,
} from "../../../packages/oni-save-parser/src/save-structure/game-objects/game-object-behavior/known-behaviors/ai-traits";

const TRAIT_STATUSES = new Set([
  "positive",
  "negative",
  "universal",
  "overjoyed",
  "stress",
]);

export function normalizeTraitId(id) {
  return typeof id === "string" ? id.trim().toUpperCase() : "";
}

const traitMap = new Map();
const traitDescMap = new Map();
const traitStatusMap = new Map();
const traitIds = new Set();

function registerTraits(list, options = {}) {
  const includeStatus = options.includeStatus === true;
  if (!Array.isArray(list)) {
    return;
  }
  for (const entry of list) {
    const id = typeof entry?.id === "string" ? entry.id.trim() : "";
    const name = typeof entry?.traits === "string" ? entry.traits.trim() : "";
    const desc = typeof entry?.desc === "string" ? entry.desc.trim() : "";
    const status =
      typeof entry?.status === "string" ? entry.status.trim().toLowerCase() : "";
    if (!id || !name) {
      continue;
    }
    const key = id.toUpperCase();
    traitMap.set(key, name);
    traitIds.add(key);
    if (desc) {
      traitDescMap.set(key, desc);
    }
    if (includeStatus && TRAIT_STATUSES.has(status)) {
      traitStatusMap.set(key, status);
    }
  }
}

registerTraits(DUPE_TRAITS, { includeStatus: true });
registerTraits(BIONIC_TRAITS, { includeStatus: true });
registerTraits(baseTraits);
registerTraits(knownTraits);

export const OVERJOYED_TRAIT_IDS = new Set(
  DUPE_OVERJOYED_REACTION_IDS.map((id) => normalizeTraitId(id)).filter(Boolean)
);

export const STRESS_REACTION_TRAIT_IDS = new Set(
  DUPE_STRESS_REACTION_IDS.map((id) => normalizeTraitId(id)).filter(Boolean)
);

export const POSITIVE_TRAIT_IDS = new Set(
  [...traitStatusMap.entries()]
    .filter(([, status]) => status === "positive" || status === "overjoyed")
    .map(([id]) => id)
);

export const NEGATIVE_TRAIT_IDS = new Set(
  [...traitStatusMap.entries()]
    .filter(([, status]) => status === "negative" || status === "stress")
    .map(([id]) => id)
);

export function isBionicTraitId(id) {
  const normalized = normalizeTraitId(id);
  return normalized.startsWith("BIONIC");
}

export function getTraitDisplayName(id) {
  const key = normalizeTraitId(id);
  if (!key) {
    return "";
  }
  return traitMap.get(key) || id;
}

export function getTraitDescription(id) {
  const key = normalizeTraitId(id);
  if (!key) {
    return "";
  }
  return traitDescMap.get(key) || "";
}

export function getTraitCategory(id) {
  const key = normalizeTraitId(id);
  if (!key) {
    return "universal";
  }
  if (NEGATIVE_TRAIT_IDS.has(key)) {
    return "negative";
  }
  if (POSITIVE_TRAIT_IDS.has(key)) {
    return "positive";
  }
  if (traitStatusMap.get(key) === "universal") {
    return "universal";
  }
  return "universal";
}

export function getAllKnownTraits() {
  return [...traitIds]
    .map((id) => ({
      id,
      name: getTraitDisplayName(id),
      description: getTraitDescription(id),
      category: getTraitCategory(id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
