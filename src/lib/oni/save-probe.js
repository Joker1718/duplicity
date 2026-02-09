const PROBE_TERMS = [
  { id: "disease", label: "Disease", patterns: ["disease", "germ", "germs"] },
  { id: "hunger", label: "Hunger", patterns: ["hunger", "calorie", "calories"] },
  { id: "morale", label: "Morale", patterns: ["morale"] },
  { id: "durability", label: "Durability", patterns: ["durability"] },
  { id: "meteor_showers", label: "Meteor Showers", patterns: ["meteor", "meteors"] },
  { id: "radiation", label: "Radiation", patterns: ["radiation"] },
  { id: "stress", label: "Stress", patterns: ["stress"] },
  { id: "stress_reactions", label: "Stress Reactions", patterns: ["stressreaction", "stressreactions"] },
  { id: "care_packages", label: "Care Packages", patterns: ["carepackage", "carepackages"] },
  { id: "sandbox_mode", label: "Sandbox Mode", patterns: ["sandbox", "sandboxmode"] },
  { id: "fast_workers", label: "Fast Workers", patterns: ["fastworker", "fastworkers"] },
  { id: "teleporters", label: "Teleporters", patterns: ["teleporter", "teleporters"] },
  { id: "bionic_wattage", label: "Bionic Wattage", patterns: ["bionicwattage", "bionic"] },
  { id: "demolior_impact", label: "Demolior Impact", patterns: ["demolior"] },
];

function normalizeKey(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isObjectLike(value) {
  return value !== null && typeof value === "object";
}

function formatPath(pathParts) {
  if (!Array.isArray(pathParts) || pathParts.length === 0) {
    return "root";
  }
  return pathParts
    .map((part) => (typeof part === "number" ? `[${part}]` : part))
    .join(".");
}

function previewValue(value) {
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return value.length > 120 ? `${value.slice(0, 120)}…` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }
  if (typeof value === "object") {
    return "{...}";
  }
  return String(value);
}

function extractQualityLevels(saveGame) {
  const entries = saveGame?.gameData?.customGameSettings?.CurrentQualityLevelsBySetting;
  if (!Array.isArray(entries)) {
    return null;
  }
  return entries
    .filter((entry) => Array.isArray(entry) && entry.length >= 2)
    .map((entry) => ({
      name: entry[0],
      value: entry[1],
    }));
}

const ACCESSORY_PREFIX = "Root.Accessories.";

function getAccessoryGuid(accessory) {
  if (typeof accessory === "string") {
    return accessory;
  }
  if (accessory && typeof accessory === "object") {
    return accessory?.guid?.Guid ?? null;
  }
  return null;
}

function parseAccessoryName(accessory) {
  const guid = getAccessoryGuid(accessory);
  if (typeof guid !== "string" || !guid.startsWith(ACCESSORY_PREFIX)) {
    return null;
  }
  return guid.slice(ACCESSORY_PREFIX.length);
}

function extractAppearanceSummary(saveGame) {
  const groups = Array.isArray(saveGame?.gameObjects) ? saveGame.gameObjects : [];
  const minionGroup = groups.find((group) => group?.name === "Minion");
  const minions = Array.isArray(minionGroup?.gameObjects) ? minionGroup.gameObjects : [];

  const hairNames = new Set();
  const headshapeNames = new Set();
  const eyeNames = new Set();
  let hairTotal = 0;
  let headshapeTotal = 0;
  let eyesTotal = 0;

  for (const gameObject of minions) {
    const behaviors = Array.isArray(gameObject?.behaviors) ? gameObject.behaviors : [];
    const accessorizer = behaviors.find((behavior) => behavior?.name === "Accessorizer");
    const accessories = Array.isArray(accessorizer?.templateData?.accessories)
      ? accessorizer.templateData.accessories
      : [];

    for (const accessory of accessories) {
      const name = parseAccessoryName(accessory);
      if (!name) {
        continue;
      }
      if (name.startsWith("hair_")) {
        hairTotal += 1;
        hairNames.add(name);
        continue;
      }
      if (name.startsWith("headshape_")) {
        headshapeTotal += 1;
        headshapeNames.add(name);
        continue;
      }
      if (name.startsWith("eyes_")) {
        eyesTotal += 1;
        eyeNames.add(name);
      }
    }
  }

  return {
    hair: {
      total: hairTotal,
      unique: hairNames.size,
      names: [...hairNames].sort(),
    },
    headshape: {
      total: headshapeTotal,
      unique: headshapeNames.size,
      names: [...headshapeNames].sort(),
    },
    eyes: {
      total: eyesTotal,
      unique: eyeNames.size,
      names: [...eyeNames].sort(),
    },
  };
}

export function probeSaveGame(saveGame, options = {}) {
  const maxNodes = Number.isFinite(options.maxNodes) ? options.maxNodes : 250000;
  const maxMatchesPerTerm = Number.isFinite(options.maxMatchesPerTerm)
    ? options.maxMatchesPerTerm
    : 120;
  const fileName = options.fileName || null;

  const results = PROBE_TERMS.map((term) => ({
    ...term,
    matches: [],
  }));
  const patterns = PROBE_TERMS.map((term) => term.patterns.map(normalizeKey));

  const stack = [{ value: saveGame, path: [] }];
  let scanned = 0;
  let truncated = false;

  while (stack.length > 0) {
    const next = stack.pop();
    scanned += 1;
    if (scanned > maxNodes) {
      truncated = true;
      break;
    }

    const value = next.value;
    if (!isObjectLike(value)) {
      continue;
    }

    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        if (!(index in value)) {
          continue;
        }
        stack.push({ value: value[index], path: [...next.path, index] });
      }
      continue;
    }

    for (const key of Object.keys(value)) {
      const normalizedKey = normalizeKey(key);
      if (normalizedKey) {
        for (let termIndex = 0; termIndex < results.length; termIndex += 1) {
          const termResult = results[termIndex];
          const termPatterns = patterns[termIndex];
          if (termResult.matches.length >= maxMatchesPerTerm) {
            continue;
          }
          if (termPatterns.some((pattern) => normalizedKey.includes(pattern))) {
            const matchValue = value[key];
            termResult.matches.push({
              path: formatPath([...next.path, key]),
              key,
              type: Array.isArray(matchValue) ? "array" : typeof matchValue,
              preview: previewValue(matchValue),
            });
          }
        }
      }

      stack.push({ value: value[key], path: [...next.path, key] });
    }
  }

  const summary = results.map((term) => ({
    id: term.id,
    label: term.label,
    count: term.matches.length,
  }));

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      fileName,
      saveMajorVersion: saveGame?.header?.gameInfo?.saveMajorVersion ?? null,
      saveMinorVersion: saveGame?.header?.gameInfo?.saveMinorVersion ?? null,
      baseName: saveGame?.header?.gameInfo?.baseName ?? null,
      dlcIds: saveGame?.header?.gameInfo?.dlcIds ?? [],
    },
    scan: {
      scannedNodes: scanned,
      maxNodes,
      truncated,
      maxMatchesPerTerm,
    },
    appearance: extractAppearanceSummary(saveGame),
    qualityLevels: extractQualityLevels(saveGame),
    terms: summary,
    matches: results.reduce((acc, term) => {
      acc[term.id] = term.matches;
      return acc;
    }, {}),
  };
}
