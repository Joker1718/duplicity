import {
  AI_EFFECT_IDS,
  DUPLICANT_HEALTH_MODIFIERS,
  GEYSER_TYPE_NAMES,
  MINION_SKILL_NAMES,
} from "@/lib/oni/oni-constants";
import {
  DUPLICANT_INTEREST_NAMES,
  getSkillGroupDisplayName,
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

const DUPLICANT_PILOTING_ATTRIBUTE_IDS = ["Piloting", "SpaceNavigation", "Rocketry"];

const DUPLICANT_ATTRIBUTE_DISPLAY_NAMES = {
  SpaceNavigation: "Piloting",
  Piloting: "Piloting",
  Rocketry: "Piloting",
  Construction: "Construction",
  Digging: "Excavation",
  Machinery: "Machinery",
  Athletics: "Athletics",
  Learning: "Science",
  Cooking: "Cuisine",
  Caring: "Medicine",
  Strength: "Strength",
  Art: "Creativity",
  Botanist: "Agriculture",
  Ranching: "Husbandry",
};

function getAttributeDisplayName(attributeId) {
  if (typeof attributeId !== "string" || !attributeId.trim()) {
    return "";
  }
  return DUPLICANT_ATTRIBUTE_DISPLAY_NAMES[attributeId] || attributeId;
}

function getPilotingAttributeId(attributeMap) {
  for (const attributeId of DUPLICANT_PILOTING_ATTRIBUTE_IDS) {
    if (Object.prototype.hasOwnProperty.call(attributeMap, attributeId)) {
      return attributeId;
    }
  }
  return DUPLICANT_PILOTING_ATTRIBUTE_IDS[0];
}

function getOrderedDuplicantAttributeIds(attributeMap) {
  return [...DUPLICANT_ATTRIBUTE_ORDER, getPilotingAttributeId(attributeMap)].sort((a, b) => {
    const nameA = getAttributeDisplayName(a);
    const nameB = getAttributeDisplayName(b);
    const byName = nameA.localeCompare(nameB);
    if (byName !== 0) {
      return byName;
    }
    return a.localeCompare(b);
  });
}

const DIFFICULTY_SETTING_ORDER = [
  "ImmuneSystem",
  "CalorieBurn",
  "Morale",
  "Durability",
  "MeteorShowers",
  "Radiation",
  "Stress",
  "StressBreaks",
  "CarePackages",
  "SandboxMode",
  "FastWorkersMode",
  "Teleporters",
  "BionicWattage",
  "DemoliorDifficulty",
];

const DIFFICULTY_SETTING_IGNORE = new Set(["ClusterLayout", "WorldgenSeed", "SaveToCloud"]);
const TOGGLE_OPTIONS = ["Disabled", "Enabled"];
const DIFFICULTY_SCALE_OPTIONS = ["VeryHard", "Hard", "Default", "Easy", "VeryEasy"];

const DEFAULT_DIFFICULTY_OPTIONS = {
  ImmuneSystem: ["Compromised", "Weak", "Default", "Strong", "Invincible"],
  Stress: ["Doomed", "Pessimistic", "Default", "Optimistic", "Indomitable"],
  Morale: ["VeryHard", "Hard", "Default", "Easy", "Disabled"],
  CalorieBurn: ["VeryHard", "Hard", "Default", "Easy", "Disabled"],
  StressBreaks: ["Disabled", "Default"],
  SandboxMode: TOGGLE_OPTIONS,
  CarePackages: TOGGLE_OPTIONS,
  FastWorkersMode: TOGGLE_OPTIONS,
  Teleporters: TOGGLE_OPTIONS,
  Durability: ["Threadbare", "Flimsy", "Default", "Reinforced", "Indestructible"],
  MeteorShowers: ["ClearSkies", "SpringShowers", "Default", "Intense", "Doomsday"],
  Radiation: ["NukeProof", "HealthyGlow", "Default", "ToxicPositivity", "CriticalMass"],
  BionicWattage: DIFFICULTY_SCALE_OPTIONS,
  DemoliorDifficulty: DIFFICULTY_SCALE_OPTIONS,
};

const DIFFICULTY_SETTING_LABELS = {
  ImmuneSystem: "Disease",
  CalorieBurn: "Hunger",
  Morale: "Morale",
  Durability: "Durability",
  MeteorShowers: "Meteor Showers",
  Radiation: "Radiation",
  Stress: "Stress",
  StressBreaks: "Stress Reactions",
  CarePackages: "Care Packages",
  SandboxMode: "Sandbox Mode",
  FastWorkersMode: "Fast Workers",
  Teleporters: "Teleporters",
  BionicWattage: "Bionic Wattage",
  DemoliorDifficulty: "Demolior Impact",
};

const DIFFICULTY_VALUE_LABELS = {
  ImmuneSystem: {
    Compromised: "Outbreak Prone",
    Weak: "Germ Susceptible",
    Default: "Default",
    Strong: "Germ Resistant",
    Invincible: "Total Immunity",
  },
  CalorieBurn: {
    VeryHard: "Ravenous",
    Hard: "Rumbly Tummies",
    Default: "Default",
    Easy: "Fasting",
    Disabled: "Tummyless",
  },
  Morale: {
    VeryHard: "Draconian",
    Hard: "A Bit Persnickety",
    Default: "Default",
    Easy: "Chill",
    Disabled: "Totally Blase",
  },
  Durability: {
    Indestructible: "Indestructible",
    Reinforced: "Reinforced",
    Default: "Default",
    Flimsy: "Flimsy",
    Threadbare: "Threadbare",
  },
  MeteorShowers: {
    ClearSkies: "Clear Skies",
    SpringShowers: "Spring Showers",
    Default: "Default",
    Intense: "Cosmic Storm",
    Doomsday: "Doomsday",
  },
  Radiation: {
    NukeProof: "Nuke-Proof",
    HealthyGlow: "Healthy Glow",
    Default: "Default",
    ToxicPositivity: "Toxic Positivity",
    CriticalMass: "Critical Mass",
  },
  Stress: {
    Doomed: "Frankly Depressing",
    Pessimistic: "Glum",
    Default: "Default",
    Optimistic: "Chipper",
    Indomitable: "Cloud Nine",
  },
  StressBreaks: {
    Disabled: "Disabled",
    Default: "Default",
  },
  CarePackages: {
    Disabled: "Disabled",
    Enabled: "Enabled",
  },
  SandboxMode: {
    Disabled: "Disabled",
    Enabled: "Enabled",
  },
  FastWorkersMode: {
    Disabled: "Disabled",
    Enabled: "Enabled",
  },
  Teleporters: {
    Disabled: "Disabled",
    Enabled: "Enabled",
  },
  BionicWattage: {
    VeryEasy: "Analog",
    Easy: "Energy Efficient",
    Default: "Default",
    Hard: "Power Hungry",
    VeryHard: "Energy Vampire",
  },
  DemoliorDifficulty: {
    VeryEasy: "Far-Off Forecast",
    Easy: "Slightly Delayed",
    Default: "Default",
    Hard: "Early Arrival",
    VeryHard: "Imminent Extinction",
  },
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

  const settingOrder = [
    ...DIFFICULTY_SETTING_ORDER.filter((key) => key in selectedValues),
    ...Object.keys(selectedValues).filter(
      (key) =>
        !DIFFICULTY_SETTING_IGNORE.has(key) &&
        !DIFFICULTY_SETTING_ORDER.includes(key)
    ),
  ];

  const optionsBySetting = {};
  for (const settingName of settingOrder) {
    const selected = selectedValues[settingName];
    const baseOptions = DEFAULT_DIFFICULTY_OPTIONS[settingName];
    if (Array.isArray(baseOptions) && baseOptions.length) {
      optionsBySetting[settingName] =
        selected && !baseOptions.includes(selected)
          ? [...baseOptions, selected]
          : baseOptions;
      continue;
    }
    if (selected === "Enabled" || selected === "Disabled") {
      optionsBySetting[settingName] = TOGGLE_OPTIONS;
      continue;
    }
    optionsBySetting[settingName] = [];
  }
  return {
    optionsBySetting,
    selectedValues,
    settingOrder,
  };
}

export function getDifficultySettingLabel(settingName) {
  return DIFFICULTY_SETTING_LABELS[settingName] || settingName;
}

export function getDifficultyValueLabel(settingName, value) {
  const labels = DIFFICULTY_VALUE_LABELS[settingName];
  if (labels && labels[value]) {
    return labels[value];
  }
  if (!value) {
    return "";
  }
  return String(value).replace(/([a-z])([A-Z])/g, "$1 $2");
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
    const accessorizerBehavior = getBehavior(gameObject, "Accessorizer");

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
      gender: asString(
        identity?.templateData?.genderStringKey ?? identity?.templateData?.gender,
        "UNKNOWN"
      ),
      traits: Array.isArray(traitsBehavior?.templateData?.TraitIds)
        ? traitsBehavior.templateData.TraitIds
        : [],
      appearance: readAccessoryOrdinals(accessorizerBehavior?.templateData?.accessories),
      attributes: getOrderedDuplicantAttributeIds(attributeMap).map((attributeId) => ({
        attributeId,
        displayName: getAttributeDisplayName(attributeId),
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

  const identityBehavior = getBehavior(source, "MinionIdentity");
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

  const compareInterestsByDisplayName = (a, b) => {
    const aName = getSkillGroupDisplayName(a);
    const bName = getSkillGroupDisplayName(b);
    const byName = aName.localeCompare(bName);
    if (byName !== 0) {
      return byName;
    }
    return a.localeCompare(b);
  };

  const selectedInterests = [...selectedInterestSet].sort(compareInterestsByDisplayName);
  const unknownInterestHashes = [...unknownInterestSet];
  const selectedSet = new Set(selectedInterests);

  return {
    id: summary.id,
    name: summary.name,
    traits: summary.traits,
    interests: selectedInterests,
    availableInterests: DUPLICANT_INTEREST_NAMES
      .filter((name) => !selectedSet.has(name))
      .sort(compareInterestsByDisplayName),
    unknownInterestHashes,
    attributes: getOrderedDuplicantAttributeIds(attributeMap).map((attributeId) => ({
      attributeId,
      displayName: getAttributeDisplayName(attributeId),
      level: Number.isFinite(attributeMap[attributeId]) ? attributeMap[attributeId] : 0,
    })),
    gender: asString(identityBehavior?.templateData?.gender, "UNKNOWN"),
    genderStringKey: asString(identityBehavior?.templateData?.genderStringKey, "UNKNOWN"),
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
