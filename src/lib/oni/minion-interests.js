export const MINION_SKILL_GROUP_NAMES = [
  "Farming",
  "Ranching",
  "Mining",
  "Cooking",
  "Art",
  "Building",
  "Management",
  "Research",
  "Suits",
  "Hauling",
  "Technicals",
  "MedicalAid",
  "Basekeeping",
];

const HASH_TO_NAME = Object.fromEntries(
  MINION_SKILL_GROUP_NAMES.map((name) => [String(getSkillGroupHash(name)), name])
);

export function getHashedStringHash(name) {
  if (typeof name !== "string") {
    return 0;
  }
  let hash = 0;
  const text = name.toLowerCase();
  for (let index = 0; index < text.length; index += 1) {
    hash = text.charCodeAt(index) + (hash << 6) + (hash << 16) - hash;
    hash |= 0;
  }
  return hash;
}

export function getSkillGroupHash(name) {
  return getHashedStringHash(name);
}

export function getSkillGroupNameByHash(hash) {
  if (!Number.isFinite(hash)) {
    return null;
  }
  return HASH_TO_NAME[String(hash)] || null;
}
