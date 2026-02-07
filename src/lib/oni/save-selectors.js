import {
  AI_EFFECT_IDS,
  DUPLICANT_HEALTH_MODIFIERS,
  GEYSER_TYPE_NAMES,
  MINION_SKILL_NAMES,
} from "@/lib/oni/oni-constants";
import {
  MINION_SKILL_GROUP_NAMES,
  getHashedStringHash,
  getSkillGroupNameByHash,
} from "@/lib/oni/minion-interests";

export const DUPLICANT_ATTRIBUTE_ORDER = [
  "Athletics",
  "Cooking",
  "Digging",
  "Caring",
  "Ranching",
  "Machinery",
  "Construction",
  "Art",
  "Botanist",
  "Learning",
  "Strength",
];

const DEFAULT_DIFFICULTY_OPTIONS = {
  ImmuneSystem: ["Compromised", "Weak", "Default", "Strong", "Invincible"],
  Stress: ["Doomed", "Pessimistic", "Default", "Optimistic", "Indomitable"],
  Morale: ["VeryHard", "Hard", "Default", "Easy", "Disabled"],
  CalorieBurn: ["VeryHard", "Hard", "Default", "Easy", "Disabled"],
  StressBreaks: ["Disabled", "Default"],
  SandboxMode: ["Disabled", "Enabled"],
};

const DUPLICANT_HEALTH_MAX = {
  Calories: 4000000,
};

const GEYSER_TYPE_BY_HASH = Object.fromEntries(
  GEYSER_TYPE_NAMES.map((typeName) => [String(getHashedStringHash(typeName)), typeName])
);

function getBehavior(gameObject, behaviorName) {
  if (!gameObject || !Array.isArray(gameObject.behaviors)) {
    return null;
  }
  return gameObject.behaviors.find((behavior) => behavior?.name === behaviorName) || null;
}

function getBehaviorAny(gameObject, behaviorNames) {
  for (const behaviorName of behaviorNames) {
    const behavior = getBehavior(gameObject, behaviorName);
    if (behavior) {
      return behavior;
    }
  }
  return null;
}

function asString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function levelWithSign(level) {
  if (!Number.isFinite(level)) {
    return "?";
  }
  if (level > 0) {
    return `+${level}`;
  }
  return String(level);
}

function getGameObjectId(gameObject) {
  const behavior = getBehavior(gameObject, "KPrefabID");
  const value = behavior?.templateData?.InstanceID;
  return Number.isFinite(value) ? value : null;
}

function parseAccessoryName(accessory) {
  const guid = accessory?.guid?.Guid;
  if (typeof guid !== "string") {
    return null;
  }
  const prefix = "Root.Accessories.";
  if (!guid.startsWith(prefix)) {
    return null;
  }
  return guid.slice(prefix.length);
}

function parseAccessoryOrdinal(accessoryName, fallback = 1) {
  if (typeof accessoryName !== "string") {
    return fallback;
  }
  const match = accessoryName.match(/_(\d+)$/);
  if (!match) {
    return fallback;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readAccessoryOrdinals(accessories) {
  const list = Array.isArray(accessories) ? accessories : [];

  let hairOrdinal = 1;
  let headOrdinal = 1;
  let eyesOrdinal = 1;

  for (const accessory of list) {
    const name = parseAccessoryName(accessory);
    if (!name) {
      continue;
    }
    if (name.startsWith("hair_")) {
      hairOrdinal = parseAccessoryOrdinal(name, hairOrdinal);
    }
    if (name.startsWith("headshape_")) {
      headOrdinal = parseAccessoryOrdinal(name, headOrdinal);
    }
    if (name.startsWith("eyes_")) {
      eyesOrdinal = parseAccessoryOrdinal(name, eyesOrdinal);
    }
  }

  return {
    hairOrdinal,
    headOrdinal,
    eyesOrdinal,
  };
}

function readHealthModifiers(modifiersBehavior) {
  const amounts = Array.isArray(modifiersBehavior?.extraData?.amounts)
    ? modifiersBehavior.extraData.amounts
    : [];

  const map = {};
  for (const amount of amounts) {
    const name = amount?.name;
    if (typeof name !== "string") {
      continue;
    }
    map[name] = asNumber(amount?.value?.value, 0);
  }

  return DUPLICANT_HEALTH_MODIFIERS.map((modifier) => ({
    modifier,
    value: asNumber(map[modifier], 0),
    max: DUPLICANT_HEALTH_MAX[modifier] || 100,
  }));
}

function readSkillModel(resumeBehavior) {
  const template = resumeBehavior?.templateData || {};
  const experience = asNumber(template.totalExperienceGained, 0);
  const masteryList = Array.isArray(template.MasteryBySkillID)
    ? template.MasteryBySkillID
    : [];

  const masterySet = new Set(
    masteryList.filter((entry) => Array.isArray(entry) && entry[1] === true).map((entry) => entry[0])
  );

  return {
    totalExperienceGained: experience,
    masteredSkills: [...masterySet],
    skills: MINION_SKILL_NAMES.map((skillId) => ({
      skillId,
      mastered: masterySet.has(skillId),
    })),
  };
}

function readEffectsModel(effectsBehavior) {
  const saveLoadEffects = Array.isArray(effectsBehavior?.templateData?.saveLoadEffects)
    ? effectsBehavior.templateData.saveLoadEffects
    : [];

  const effectIds = new Set(saveLoadEffects.map((effect) => effect?.id).filter(Boolean));

  return {
    effects: saveLoadEffects
      .filter((effect) => typeof effect?.id === "string")
      .map((effect) => ({
        id: effect.id,
        timeRemaining: asNumber(effect.timeRemaining, 0),
        cyclesRemaining: asNumber(effect.timeRemaining, 0) / 200,
      })),
    availableEffects: AI_EFFECT_IDS.filter((effectId) => !effectIds.has(effectId)),
  };
}

export function selectDifficultySettings(saveGame) {
  const pairs = saveGame?.gameData?.customGameSettings?.CurrentQualityLevelsBySetting;
  const selectedValues = {};
  if (Array.isArray(pairs)) {
    for (const pair of pairs) {
      if (Array.isArray(pair) && pair.length >= 2) {
        selectedValues[pair[0]] = pair[1];
      }
    }
  }
  return {
    optionsBySetting: DEFAULT_DIFFICULTY_OPTIONS,
    selectedValues,
  };
}

export function selectDuplicants(saveGame) {
  const minionGroup = Array.isArray(saveGame?.gameObjects)
    ? saveGame.gameObjects.find((group) => group?.name === "Minion")
    : null;

  const minions = Array.isArray(minionGroup?.gameObjects) ? minionGroup.gameObjects : [];
  const list = [];

  for (const gameObject of minions) {
    const id = getGameObjectId(gameObject);
    if (id === null) {
      continue;
    }
    const identity = getBehavior(gameObject, "MinionIdentity");
    const traitsBehavior = getBehaviorAny(gameObject, ["Klei.AI.Traits", "MinionTraits"]);
    const attributesBehavior = getBehaviorAny(gameObject, [
      "Klei.AI.AttributeLevels",
      "AttributeLevels",
    ]);

    const rawAttributes = Array.isArray(attributesBehavior?.templateData?.saveLoadLevels)
      ? attributesBehavior.templateData.saveLoadLevels
      : [];

    const attributeMap = {};
    for (const entry of rawAttributes) {
      const attributeId = entry?.attributeId;
      if (!attributeId) {
        continue;
      }
      attributeMap[attributeId] = entry?.level;
    }

    list.push({
      id,
      name: asString(identity?.templateData?.name, `Duplicant ${id}`),
      traits: Array.isArray(traitsBehavior?.templateData?.TraitIds)
        ? traitsBehavior.templateData.TraitIds
        : [],
      attributes: DUPLICANT_ATTRIBUTE_ORDER.map((attributeId) => ({
        attributeId,
        levelLabel: levelWithSign(attributeMap[attributeId]),
      })),
    });
  }

  return list.sort((a, b) => a.id - b.id);
}

export function selectDuplicantEditorModel(saveGame, duplicantId) {
  if (!Number.isFinite(duplicantId)) {
    return null;
  }
  const duplicants = selectDuplicants(saveGame);
  const summary = duplicants.find((item) => item.id === duplicantId);
  if (!summary) {
    return null;
  }

  const minionGroup = Array.isArray(saveGame?.gameObjects)
    ? saveGame.gameObjects.find((group) => group?.name === "Minion")
    : null;
  const minions = Array.isArray(minionGroup?.gameObjects) ? minionGroup.gameObjects : [];

  const source = minions.find((obj) => getGameObjectId(obj) === duplicantId);

  const attributesBehavior = getBehaviorAny(source, [
    "Klei.AI.AttributeLevels",
    "AttributeLevels",
  ]);
  const resumeBehavior = getBehavior(source, "MinionResume");
  const effectsBehavior = getBehavior(source, "Klei.AI.Effects");
  const modifiersBehavior = getBehavior(source, "MinionModifiers");
  const accessorizerBehavior = getBehavior(source, "Accessorizer");

  const rawAttributes = Array.isArray(attributesBehavior?.templateData?.saveLoadLevels)
    ? attributesBehavior.templateData.saveLoadLevels
    : [];
  const rawInterests = Array.isArray(resumeBehavior?.templateData?.AptitudeBySkillGroup)
    ? resumeBehavior.templateData.AptitudeBySkillGroup
    : [];

  const attributeMap = {};
  const selectedInterestSet = new Set();
  const unknownInterestSet = new Set();

  for (const entry of rawAttributes) {
    if (!entry?.attributeId) {
      continue;
    }
    attributeMap[entry.attributeId] = Number.isFinite(entry.level) ? entry.level : 0;
  }

  for (const entry of rawInterests) {
    if (!Array.isArray(entry) || entry.length < 2) {
      continue;
    }
    const hashedName = entry[0];
    const value = entry[1];
    const hash = hashedName?.hash;
    if (!Number.isFinite(hash) || !Number.isFinite(value) || value <= 0) {
      continue;
    }
    const knownName = getSkillGroupNameByHash(hash);
    if (knownName) {
      selectedInterestSet.add(knownName);
    } else {
      unknownInterestSet.add(hash);
    }
  }

  const selectedInterests = [...selectedInterestSet].sort();
  const unknownInterestHashes = [...unknownInterestSet];
  const selectedSet = new Set(selectedInterests);

  return {
    id: summary.id,
    name: summary.name,
    traits: summary.traits,
    interests: selectedInterests,
    availableInterests: MINION_SKILL_GROUP_NAMES.filter((name) => !selectedSet.has(name)),
    unknownInterestHashes,
    attributes: DUPLICANT_ATTRIBUTE_ORDER.map((attributeId) => ({
      attributeId,
      level: Number.isFinite(attributeMap[attributeId]) ? attributeMap[attributeId] : 0,
    })),
    appearance: readAccessoryOrdinals(accessorizerBehavior?.templateData?.accessories),
    health: readHealthModifiers(modifiersBehavior),
    skills: readSkillModel(resumeBehavior),
    ...readEffectsModel(effectsBehavior),
  };
}

export function selectCreatures(saveGame) {
  const groups = Array.isArray(saveGame?.gameObjects) ? saveGame.gameObjects : [];
  const list = [];

  for (const group of groups) {
    const gameObjects = Array.isArray(group?.gameObjects) ? group.gameObjects : [];
    for (const gameObject of gameObjects) {
      const id = getGameObjectId(gameObject);
      if (id === null) {
        continue;
      }
      const hasCreatureBrain = Boolean(getBehavior(gameObject, "CreatureBrain"));
      if (!hasCreatureBrain) {
        continue;
      }

      const traitsBehavior = getBehaviorAny(gameObject, ["Klei.AI.Traits", "MinionTraits"]);
      const traits = Array.isArray(traitsBehavior?.templateData?.TraitIds)
        ? traitsBehavior.templateData.TraitIds
        : [];

      const position = gameObject?.position;
      list.push({
        id,
        type: asString(group?.name, "Creature"),
        traits,
        position: {
          x: asNumber(position?.x),
          y: asNumber(position?.y),
          z: asNumber(position?.z),
        },
      });
    }
  }

  return list.sort((a, b) => a.id - b.id);
}

export function selectCreatureEditorModel(saveGame, creatureId) {
  if (!Number.isFinite(creatureId)) {
    return null;
  }
  const creatures = selectCreatures(saveGame);
  const creature = creatures.find((item) => item.id === creatureId);
  if (!creature) {
    return null;
  }
  return creature;
}

export function selectGeysers(saveGame) {
  const groups = Array.isArray(saveGame?.gameObjects) ? saveGame.gameObjects : [];
  const list = [];

  for (const group of groups) {
    const gameObjects = Array.isArray(group?.gameObjects) ? group.gameObjects : [];
    for (const gameObject of gameObjects) {
      const geyserBehavior = getBehavior(gameObject, "Geyser");
      if (!geyserBehavior) {
        continue;
      }
      const id = getGameObjectId(gameObject);
      if (!Number.isFinite(id)) {
        continue;
      }
      const config = geyserBehavior.templateData?.configuration || {};
      const typeHash = config.typeId?.hash;
      const resolvedType =
        (Number.isFinite(typeHash) ? GEYSER_TYPE_BY_HASH[String(typeHash)] : null) ||
        asString(group?.name).replace(/^GeyserGeneric_/, "") ||
        "steam";

      list.push({
        id,
        objectType: asString(group?.name, "Geyser"),
        geyserType: resolvedType,
        emitRate: asNumber(config.rateRoll, 0),
        lifecycleLength: asNumber(config.yearLengthRoll, 0),
        activeFraction: asNumber(config.yearPercentRoll, 0),
        emissionFraction: asNumber(config.iterationPercentRoll, 0),
        iterationLength: asNumber(config.iterationLengthRoll, 0),
      });
    }
  }

  return list.sort((a, b) => a.id - b.id);
}
