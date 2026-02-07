const DUPLICANT_ATTRIBUTE_ORDER = [
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

function getBehavior(gameObject, behaviorName) {
  if (!gameObject || !Array.isArray(gameObject.behaviors)) {
    return null;
  }
  return gameObject.behaviors.find((behavior) => behavior?.name === behaviorName) || null;
}

function getGameObjectId(gameObject) {
  const behavior = getBehavior(gameObject, "KPrefabID");
  const value = behavior?.templateData?.InstanceID;
  return Number.isFinite(value) ? value : null;
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
    const traitsBehavior = getBehavior(gameObject, "MinionTraits");
    const attributesBehavior = getBehavior(gameObject, "AttributeLevels");

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
      name: identity?.templateData?.name || `Duplicant ${id}`,
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
