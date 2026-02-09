"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import { parseSaveInWorker, writeSaveInWorker } from "@/lib/oni/parser-client";
import { getHashedStringHash, getSkillGroupHash } from "@/lib/oni/minion-interests";
import { setPathValue } from "@/lib/oni/raw-path-utils";

const SaveSessionContext = createContext(null);

const DUPLICANT_CLONE_BEHAVIOR_BLACKLIST = new Set([
  "StateMachineController",
  "Navigator",
]);

const BEHAVIOR_ALIASES = {
  "Klei.AI.AttributeLevels": ["AttributeLevels"],
  AttributeLevels: ["Klei.AI.AttributeLevels"],
  "Klei.AI.Traits": ["MinionTraits"],
  MinionTraits: ["Klei.AI.Traits"],
};

const ACCESSORY_PREFIX = "Root.Accessories.";
const STRICTNESS_STORAGE_KEY = "duplicity.strictness";
const DEFAULT_STRICTNESS = "major";

const INITIAL_STATE = {
  status: "idle",
  progressMessage: "",
  error: null,
  saveGame: null,
  fileName: null,
  fileHandle: null,
  parseTimeMs: null,
  lastWrittenBytes: null,
  isModified: false,
  selectedDuplicantId: null,
  selectedCreatureId: null,
  pendingFile: null,
  preferredStrictness: DEFAULT_STRICTNESS,
  lastLoadAttemptStrictness: "major",
  copyPasteData: null,
  importWarning: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_STRICTNESS":
      return {
        ...state,
        preferredStrictness: action.strictness || DEFAULT_STRICTNESS,
      };
    case "LOAD_BEGIN":
      return {
        ...state,
        status: "loading",
        progressMessage: "",
        error: null,
        pendingFile: action.file,
        lastLoadAttemptStrictness: action.strictness,
      };
    case "LOAD_PROGRESS":
      return {
        ...state,
        progressMessage: action.message || "",
      };
    case "LOAD_SUCCESS":
      return {
        ...state,
        status: "ready",
        progressMessage: "",
        error: null,
        saveGame: action.saveGame,
        fileName: action.fileName,
        fileHandle: action.fileHandle || null,
        parseTimeMs: action.parseTimeMs,
        lastWrittenBytes: null,
        isModified: false,
        selectedDuplicantId: null,
        selectedCreatureId: null,
        pendingFile: null,
        importWarning: null,
      };
    case "LOAD_ERROR":
      return {
        ...state,
        status: "error",
        progressMessage: "",
        error: action.error,
      };
    case "SAVE_BEGIN":
      return {
        ...state,
        status: "saving",
        progressMessage: "",
        error: null,
      };
    case "SAVE_PROGRESS":
      return {
        ...state,
        progressMessage: action.message || "",
      };
    case "SAVE_SUCCESS":
      return {
        ...state,
        status: "ready",
        progressMessage: "",
        error: null,
        lastWrittenBytes: action.bytes,
        isModified: false,
      };
    case "SAVE_ERROR":
      return {
        ...state,
        status: "error",
        progressMessage: "",
        error: action.error,
      };
    case "SET_SAVE_GAME":
      return {
        ...state,
        saveGame: action.saveGame,
        isModified: action.isModified ?? true,
      };
    case "SET_COPY_PASTE_DATA":
      return {
        ...state,
        copyPasteData: action.copyPasteData || null,
      };
    case "SET_IMPORT_WARNING":
      return {
        ...state,
        importWarning: action.importWarning || null,
      };
    case "CLEAR_IMPORT_WARNING":
      return {
        ...state,
        importWarning: null,
      };
    case "SET_SELECTED_DUPLICANT":
      return {
        ...state,
        selectedDuplicantId: action.id,
      };
    case "SET_SELECTED_CREATURE":
      return {
        ...state,
        selectedCreatureId: action.id,
      };
    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
        status: state.saveGame ? "ready" : "idle",
      };
    case "SET_ERROR":
      return {
        ...state,
        error: action.error || null,
      };
    default:
      return state;
  }
}

function normalizeError(error) {
  if (!error || typeof error !== "object") {
    return { message: "Unknown error" };
  }
  return {
    message: error.message || "Unknown error",
    code: error.code || null,
    stack: error.stack || null,
  };
}

function normalizeStrictness(value) {
  if (value === "minor" || value === "none") {
    return value;
  }
  return DEFAULT_STRICTNESS;
}

function hasSavExtension(fileName) {
  return typeof fileName === "string" && fileName.trim().toLowerCase().endsWith(".sav");
}

function ensureSavExtension(fileName) {
  const raw = typeof fileName === "string" ? fileName.trim() : "";
  if (!raw) {
    return "duplicity-save.sav";
  }
  if (raw.toLowerCase().endsWith(".sav")) {
    return raw;
  }
  const withoutExtension = raw.replace(/\.[^./\\]+$/, "");
  const base = withoutExtension || raw;
  return `${base}.sav`;
}

function formatBackupTimestamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hour}${minute}${second}`;
}

function deriveBackupName(fileName) {
  const baseName = ensureSavExtension(fileName || "duplicity-save.sav");
  return baseName.replace(/\.sav$/i, `.backup-${formatBackupTimestamp(new Date())}.sav`);
}

function deriveOutputName(fileName, saveGame) {
  if (typeof fileName === "string" && fileName.trim().length > 0) {
    return ensureSavExtension(fileName);
  }
  const colonyName = saveGame?.header?.gameInfo?.baseName;
  if (colonyName) {
    return ensureSavExtension(colonyName);
  }
  return "duplicity-save.sav";
}

function downloadArrayBuffer(data, fileName) {
  const blob = new Blob([data], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function writeToFileHandle(fileHandle, data) {
  if (!fileHandle || typeof fileHandle.createWritable !== "function") {
    throw new Error("Writable file handle is not available.");
  }
  const writable = await fileHandle.createWritable();
  await writable.write(data);
  await writable.close();
}

function downloadText(content, fileName) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function withErrorCode(message, code = null) {
  return {
    message,
    code,
    stack: null,
  };
}

function deepClone(value) {
  if (value === undefined) {
    return undefined;
  }
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function getBehaviorCandidates(behaviorName) {
  if (typeof behaviorName !== "string" || behaviorName.length === 0) {
    return [];
  }
  const aliases = Array.isArray(BEHAVIOR_ALIASES[behaviorName])
    ? BEHAVIOR_ALIASES[behaviorName]
    : [];
  return [behaviorName, ...aliases];
}

function upsertDifficultySetting(current, difficultyType, value) {
  const list = Array.isArray(current) ? [...current] : [];
  const index = list.findIndex(
    (item) => Array.isArray(item) && item[0] === difficultyType
  );
  const nextEntry = [difficultyType, value];
  if (index === -1) {
    list.push(nextEntry);
  } else {
    list[index] = nextEntry;
  }
  return list;
}

function getBehavior(gameObject, behaviorName) {
  if (!gameObject || !Array.isArray(gameObject.behaviors)) {
    return null;
  }
  return gameObject.behaviors.find((behavior) => behavior?.name === behaviorName) || null;
}

function getGameObjectId(gameObject) {
  const behavior = getBehavior(gameObject, "KPrefabID");
  const id = behavior?.templateData?.InstanceID;
  return Number.isFinite(id) ? id : null;
}

function resolveBehaviorName(gameObject, behaviorName) {
  const candidates = getBehaviorCandidates(behaviorName);
  for (const candidate of candidates) {
    if (getBehavior(gameObject, candidate)) {
      return candidate;
    }
  }
  return null;
}

function findGameObjectLocation(saveGame, gameObjectId) {
  const groups = Array.isArray(saveGame?.gameObjects) ? saveGame.gameObjects : [];
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex];
    const objects = Array.isArray(group?.gameObjects) ? group.gameObjects : [];
    for (let objectIndex = 0; objectIndex < objects.length; objectIndex += 1) {
      const gameObject = objects[objectIndex];
      if (getGameObjectId(gameObject) === gameObjectId) {
        return {
          groupIndex,
          objectIndex,
          group,
          gameObject,
        };
      }
    }
  }
  return null;
}

function getGameObjectById(saveGame, gameObjectId) {
  const location = findGameObjectLocation(saveGame, gameObjectId);
  return location?.gameObject || null;
}

function getGameObjectTypeById(saveGame, gameObjectId) {
  const location = findGameObjectLocation(saveGame, gameObjectId);
  return location?.group?.name || null;
}

function replaceGameObjectAtLocation(saveGame, location, nextObject) {
  if (!location || !nextObject) {
    return saveGame;
  }
  const nextGroups = saveGame.gameObjects.map((group, groupIndex) => {
    if (groupIndex !== location.groupIndex || !Array.isArray(group?.gameObjects)) {
      return group;
    }
    const nextObjects = group.gameObjects.map((gameObject, objectIndex) => {
      if (objectIndex !== location.objectIndex) {
        return gameObject;
      }
      return nextObject;
    });
    return {
      ...group,
      gameObjects: nextObjects,
    };
  });

  return {
    ...saveGame,
    gameObjects: nextGroups,
  };
}

function moveGameObjectToGroup(saveGame, location, nextObject, targetGroupName) {
  if (!location || !nextObject || !targetGroupName) {
    return saveGame;
  }
  const groups = Array.isArray(saveGame?.gameObjects) ? saveGame.gameObjects : [];
  const sourceGroup = groups[location.groupIndex];
  if (!sourceGroup) {
    return saveGame;
  }

  if (sourceGroup.name === targetGroupName) {
    return replaceGameObjectAtLocation(saveGame, location, nextObject);
  }

  const nextGroups = groups.map((group, groupIndex) => {
    if (groupIndex !== location.groupIndex) {
      return group;
    }
    const gameObjects = Array.isArray(group?.gameObjects) ? group.gameObjects : [];
    return {
      ...group,
      gameObjects: gameObjects.filter((_, objectIndex) => objectIndex !== location.objectIndex),
    };
  });

  const targetIndex = nextGroups.findIndex((group) => group?.name === targetGroupName);
  if (targetIndex >= 0) {
    const targetGroup = nextGroups[targetIndex];
    const targetObjects = Array.isArray(targetGroup?.gameObjects)
      ? targetGroup.gameObjects
      : [];
    nextGroups[targetIndex] = {
      ...targetGroup,
      gameObjects: [...targetObjects, nextObject],
    };
  } else {
    nextGroups.push({
      name: targetGroupName,
      gameObjects: [nextObject],
    });
  }

  return {
    ...saveGame,
    gameObjects: nextGroups,
  };
}

function updateBehaviorTemplate(gameObject, behaviorName, updater) {
  if (!Array.isArray(gameObject?.behaviors)) {
    return gameObject;
  }
  let changed = false;
  const nextBehaviors = gameObject.behaviors.map((behavior) => {
    if (behavior?.name !== behaviorName) {
      return behavior;
    }
    const nextTemplate = updater(behavior.templateData);
    if (nextTemplate === behavior.templateData) {
      return behavior;
    }
    changed = true;
    return {
      ...behavior,
      templateData: nextTemplate,
    };
  });
  return changed ? { ...gameObject, behaviors: nextBehaviors } : gameObject;
}

function updateBehaviorTemplateAny(gameObject, behaviorNames, updater) {
  for (const behaviorName of behaviorNames) {
    const next = updateBehaviorTemplate(gameObject, behaviorName, updater);
    if (next !== gameObject) {
      return next;
    }
  }
  return gameObject;
}

function updateBehaviorData(gameObject, behaviorName, behaviorData) {
  if (!Array.isArray(gameObject?.behaviors) || !behaviorData || typeof behaviorData !== "object") {
    return gameObject;
  }

  const hasTemplateData = Object.prototype.hasOwnProperty.call(behaviorData, "templateData");
  const hasExtraData = Object.prototype.hasOwnProperty.call(behaviorData, "extraData");
  if (!hasTemplateData && !hasExtraData) {
    return gameObject;
  }

  let changed = false;
  const nextBehaviors = gameObject.behaviors.map((behavior) => {
    if (behavior?.name !== behaviorName) {
      return behavior;
    }
    changed = true;
    const nextBehavior = { ...behavior };
    if (hasTemplateData) {
      nextBehavior.templateData = deepClone(behaviorData.templateData);
    }
    if (hasExtraData) {
      nextBehavior.extraData = deepClone(behaviorData.extraData);
    }
    return nextBehavior;
  });

  return changed ? { ...gameObject, behaviors: nextBehaviors } : gameObject;
}

function mutateGameObjectById(saveGame, gameObjectId, mutator) {
  const location = findGameObjectLocation(saveGame, gameObjectId);
  if (!location) {
    return saveGame;
  }
  const nextObject = mutator(location.gameObject, location);
  if (!nextObject || nextObject === location.gameObject) {
    return saveGame;
  }
  return replaceGameObjectAtLocation(saveGame, location, nextObject);
}

function mutateDuplicant(saveGame, duplicantId, mutator) {
  if (!saveGame || !Array.isArray(saveGame.gameObjects)) {
    return saveGame;
  }
  const location = findGameObjectLocation(saveGame, duplicantId);
  if (!location || location.group?.name !== "Minion") {
    return saveGame;
  }
  const nextObject = mutator(location.gameObject);
  if (!nextObject || nextObject === location.gameObject) {
    return saveGame;
  }
  return replaceGameObjectAtLocation(saveGame, location, nextObject);
}

function applySandboxModeFlags(saveGame, enabled) {
  const nextHeader = {
    ...saveGame.header,
    gameInfo: {
      ...saveGame.header?.gameInfo,
      sandboxEnabled: enabled,
    },
  };

  const nextGroups = Array.isArray(saveGame.gameObjects)
    ? saveGame.gameObjects.map((group) => {
        if (group?.name !== "SaveGame" || !Array.isArray(group.gameObjects)) {
          return group;
        }
        return {
          ...group,
          gameObjects: group.gameObjects.map((obj) => {
            if (!Array.isArray(obj?.behaviors)) {
              return obj;
            }
            let changed = false;
            const nextBehaviors = obj.behaviors.map((behavior) => {
              if (behavior?.name !== "SaveGame" || !behavior.templateData) {
                return behavior;
              }
              changed = true;
              return {
                ...behavior,
                templateData: {
                  ...behavior.templateData,
                  sandboxEnabled: enabled,
                },
              };
            });
            return changed ? { ...obj, behaviors: nextBehaviors } : obj;
          }),
        };
      })
    : saveGame.gameObjects;

  return {
    ...saveGame,
    header: nextHeader,
    gameObjects: nextGroups,
  };
}

function padAccessoryOrdinal(ordinal) {
  return String(ordinal).padStart(3, "0");
}

function parseAccessoryGuid(accessory) {
  const guid = accessory?.guid?.Guid;
  if (typeof guid !== "string" || !guid.startsWith(ACCESSORY_PREFIX)) {
    return null;
  }
  return guid.slice(ACCESSORY_PREFIX.length);
}

function replaceAccessoryGuid(accessory, replacementName) {
  return {
    ...(accessory || {}),
    guid: {
      ...(accessory?.guid || {}),
      Guid: `${ACCESSORY_PREFIX}${replacementName}`,
    },
  };
}

function updateAccessoryList(accessories, type, ordinal) {
  if (!Array.isArray(accessories)) {
    return accessories;
  }

  const padded = padAccessoryOrdinal(ordinal);
  return accessories.map((accessory) => {
    const name = parseAccessoryGuid(accessory);
    if (!name) {
      return accessory;
    }
    if (name.startsWith(`${type}_`)) {
      return replaceAccessoryGuid(accessory, `${type}_${padded}`);
    }
    if (type === "hair" && name.startsWith("hat_hair_")) {
      return replaceAccessoryGuid(accessory, `hat_hair_${padded}`);
    }
    if (type === "hair" && name.startsWith("hair_always_")) {
      return replaceAccessoryGuid(accessory, `hair_always_${padded}`);
    }
    return accessory;
  });
}

function updateModifierAmounts(amounts, modifierName, nextValue) {
  const list = Array.isArray(amounts) ? [...amounts] : [];
  const index = list.findIndex((entry) => entry?.name === modifierName);
  const patch = {
    name: modifierName,
    value: {
      value: nextValue,
    },
  };

  if (index === -1) {
    list.push(patch);
    return list;
  }

  list[index] = patch;
  return list;
}

function setMasteryValue(entries, skillId, enabled) {
  const list = Array.isArray(entries) ? [...entries] : [];
  const index = list.findIndex((entry) => Array.isArray(entry) && entry[0] === skillId);
  if (enabled) {
    if (index >= 0) {
      list[index] = [skillId, true];
    } else {
      list.push([skillId, true]);
    }
    return list;
  }

  if (index >= 0) {
    list.splice(index, 1);
  }
  return list;
}

function setEffectCycles(saveLoadEffects, effectId, cycles, mode = "update") {
  const list = Array.isArray(saveLoadEffects) ? [...saveLoadEffects] : [];
  const timeRemaining = Number(cycles) * 200;
  const index = list.findIndex((entry) => entry?.id === effectId);

  if (mode === "remove") {
    if (index >= 0) {
      list.splice(index, 1);
    }
    return list;
  }

  const patch = {
    id: effectId,
    timeRemaining,
  };

  if (mode === "add") {
    if (index === -1) {
      list.push(patch);
    } else {
      list[index] = patch;
    }
    return list;
  }

  if (index === -1) {
    return list;
  }

  list[index] = patch;
  return list;
}

function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value
      .map((entry) => (entry === undefined ? "null" : stableSerialize(entry)))
      .join(",")}]`;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort();
    const keyValues = keys.map(
      (key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`
    );
    return `{${keyValues.join(",")}}`;
  }
  return JSON.stringify(value);
}

async function sha1HexFromString(text) {
  if (!globalThis.crypto?.subtle) {
    return null;
  }
  const data = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest("SHA-1", data);
  const bytes = new Uint8Array(digest);
  return [...bytes].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function hashObjectSha1(value) {
  const serialized = stableSerialize(value);
  return sha1HexFromString(serialized);
}

export function SaveSessionProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STRICTNESS_STORAGE_KEY);
      if (stored) {
        dispatch({ type: "SET_STRICTNESS", strictness: normalizeStrictness(stored) });
      }
    } catch {
      // Ignore storage read failures.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STRICTNESS_STORAGE_KEY, state.preferredStrictness);
    } catch {
      // Ignore storage write failures.
    }
  }, [state.preferredStrictness]);

  const loadSaveFile = useCallback(async (file, options = {}) => {
    if (!file) {
      return;
    }
    if (!hasSavExtension(file.name)) {
      dispatch({
        type: "LOAD_ERROR",
        error: withErrorCode("Only .sav files are supported.", "E_FILE_EXTENSION"),
      });
      return;
    }
    const strictness =
      options.versionStrictness || state.preferredStrictness || DEFAULT_STRICTNESS;
    dispatch({ type: "LOAD_BEGIN", file, strictness });
    try {
      const data = await file.arrayBuffer();
      const startedAt = performance.now();
      const saveGame = await parseSaveInWorker(data, {
        versionStrictness: strictness,
        reportProgress: true,
        onProgress: (message) => dispatch({ type: "LOAD_PROGRESS", message }),
      });
      const parseTimeMs = Math.round(performance.now() - startedAt);
      dispatch({
        type: "LOAD_SUCCESS",
        saveGame,
        fileName: file.name,
        fileHandle: options.fileHandle || null,
        parseTimeMs,
      });
    } catch (error) {
      dispatch({ type: "LOAD_ERROR", error: normalizeError(error) });
    }
  }, [state.preferredStrictness]);

  const loadSaveWithPicker = useCallback(async (options = {}) => {
    if (typeof window === "undefined" || typeof window.showOpenFilePicker !== "function") {
      return false;
    }

    try {
      const startIn = state.fileHandle || "documents";
      const [handle] = await window.showOpenFilePicker({
        id: "oni-save-files",
        startIn,
        multiple: false,
        excludeAcceptAllOption: true,
        types: [
          {
            description: "Oxygen Not Included Save (*.sav)",
            accept: {
              "application/x-oxygen-not-included-save": [".sav"],
            },
          },
        ],
      });
      if (!handle) {
        return false;
      }
      const file = await handle.getFile();
      await loadSaveFile(file, {
        versionStrictness: options.versionStrictness,
        fileHandle: handle,
      });
      return true;
    } catch (error) {
      if (error?.name === "AbortError") {
        return true;
      }
      dispatch({ type: "LOAD_ERROR", error: normalizeError(error) });
      return true;
    }
  }, [loadSaveFile, state.fileHandle]);

  const forceLoadPendingFile = useCallback(async () => {
    if (!state.pendingFile) {
      return;
    }
    await loadSaveFile(state.pendingFile, { versionStrictness: "major" });
  }, [loadSaveFile, state.pendingFile]);

  const retryLoadPendingFile = useCallback(async () => {
    if (!state.pendingFile) {
      return;
    }
    await loadSaveFile(state.pendingFile, {
      versionStrictness: state.lastLoadAttemptStrictness || "major",
    });
  }, [loadSaveFile, state.lastLoadAttemptStrictness, state.pendingFile]);

  const saveCurrentFile = useCallback(async (options = {}) => {
    if (!state.saveGame) {
      return;
    }
    dispatch({ type: "SAVE_BEGIN" });
    try {
      const data = await writeSaveInWorker(state.saveGame, {
        reportProgress: true,
        onProgress: (message) => dispatch({ type: "SAVE_PROGRESS", message }),
      });
      const preferInPlaceSave = options.inPlace !== false;
      if (preferInPlaceSave && state.fileHandle) {
        try {
          if (options.backup !== false && typeof state.fileHandle.getFile === "function") {
            const existingFile = await state.fileHandle.getFile();
            const existingData = await existingFile.arrayBuffer();
            if (existingData.byteLength > 0) {
              downloadArrayBuffer(
                existingData,
                deriveBackupName(existingFile.name || state.fileName)
              );
            }
          }
          await writeToFileHandle(state.fileHandle, data);
        } catch {
          const outputName = deriveOutputName(
            options.fileName ?? state.fileName,
            state.saveGame
          );
          downloadArrayBuffer(data, outputName);
        }
      } else {
        const outputName = deriveOutputName(
          options.fileName ?? state.fileName,
          state.saveGame
        );
        downloadArrayBuffer(data, outputName);
      }
      dispatch({ type: "SAVE_SUCCESS", bytes: data.byteLength });
    } catch (error) {
      dispatch({ type: "SAVE_ERROR", error: normalizeError(error) });
    }
  }, [state.fileHandle, state.fileName, state.saveGame]);

  const setParseStrictness = useCallback((strictness) => {
    dispatch({ type: "SET_STRICTNESS", strictness: normalizeStrictness(strictness) });
  }, []);

  const setSaveGame = useCallback((saveGame, options = {}) => {
    dispatch({
      type: "SET_SAVE_GAME",
      saveGame,
      isModified: options.isModified,
    });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  const setError = useCallback((message, code = null) => {
    dispatch({
      type: "SET_ERROR",
      error: withErrorCode(message, code),
    });
  }, []);

  const setCopyPasteData = useCallback((copyPasteData) => {
    dispatch({ type: "SET_COPY_PASTE_DATA", copyPasteData });
  }, []);

  const setImportWarning = useCallback((importWarning) => {
    dispatch({ type: "SET_IMPORT_WARNING", importWarning });
  }, []);

  const clearImportWarning = useCallback(() => {
    dispatch({ type: "CLEAR_IMPORT_WARNING" });
  }, []);

  const setSelectedDuplicantId = useCallback((id) => {
    dispatch({ type: "SET_SELECTED_DUPLICANT", id: Number.isFinite(id) ? id : null });
  }, []);

  const setSelectedCreatureId = useCallback((id) => {
    dispatch({ type: "SET_SELECTED_CREATURE", id: Number.isFinite(id) ? id : null });
  }, []);

  const updateDifficultySetting = useCallback(
    (difficultyType, value) => {
      if (!state.saveGame) {
        return;
      }
      const currentSettings =
        state.saveGame.gameData?.customGameSettings?.CurrentQualityLevelsBySetting;

      const nextSettings = upsertDifficultySetting(
        currentSettings,
        difficultyType,
        value
      );

      let nextSaveGame = {
        ...state.saveGame,
        gameData: {
          ...state.saveGame.gameData,
          customGameSettings: {
            ...state.saveGame.gameData.customGameSettings,
            CurrentQualityLevelsBySetting: nextSettings,
          },
        },
      };

      if (difficultyType === "SandboxMode") {
        nextSaveGame = applySandboxModeFlags(nextSaveGame, value === "Enabled");
      }

      setSaveGame(nextSaveGame, { isModified: true });
    },
    [setSaveGame, state.saveGame]
  );

  const updateDuplicantName = useCallback(
    (duplicantId, name) => {
      if (!state.saveGame) {
        return;
      }
      const next = mutateDuplicant(state.saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplate(gameObject, "MinionIdentity", (template) => {
          if (!template || typeof template !== "object") {
            return template;
          }
          return {
            ...template,
            name,
          };
        })
      );
      setSaveGame(next, { isModified: next !== state.saveGame });
    },
    [setSaveGame, state.saveGame]
  );

  const addDuplicantTrait = useCallback(
    (duplicantId, traitId) => {
      if (!state.saveGame || !traitId) {
        return;
      }
      const cleanTraitId = String(traitId).trim();
      if (!cleanTraitId) {
        return;
      }
      const next = mutateDuplicant(state.saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplateAny(gameObject, ["Klei.AI.Traits", "MinionTraits"], (template) => {
          const current = Array.isArray(template?.TraitIds) ? template.TraitIds : [];
          if (current.includes(cleanTraitId)) {
            return template;
          }
          return {
            ...(template || {}),
            TraitIds: [...current, cleanTraitId],
          };
        })
      );
      setSaveGame(next, { isModified: next !== state.saveGame });
    },
    [setSaveGame, state.saveGame]
  );

  const removeDuplicantTrait = useCallback(
    (duplicantId, traitId) => {
      if (!state.saveGame) {
        return;
      }
      const next = mutateDuplicant(state.saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplateAny(gameObject, ["Klei.AI.Traits", "MinionTraits"], (template) => {
          const current = Array.isArray(template?.TraitIds) ? template.TraitIds : [];
          const filtered = current.filter((item) => item !== traitId);
          if (filtered.length === current.length) {
            return template;
          }
          return {
            ...(template || {}),
            TraitIds: filtered,
          };
        })
      );
      setSaveGame(next, { isModified: next !== state.saveGame });
    },
    [setSaveGame, state.saveGame]
  );

  const updateDuplicantAttributeLevel = useCallback(
    (duplicantId, attributeId, nextLevel) => {
      if (!state.saveGame || !Number.isFinite(nextLevel)) {
        return;
      }
      const next = mutateDuplicant(state.saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplateAny(
          gameObject,
          ["Klei.AI.AttributeLevels", "AttributeLevels"],
          (template) => {
            const levels = Array.isArray(template?.saveLoadLevels) ? template.saveLoadLevels : [];
            let found = false;
            const nextLevels = levels.map((entry) => {
              if (entry?.attributeId !== attributeId) {
                return entry;
              }
              found = true;
              return {
                ...entry,
                level: nextLevel,
              };
            });
            if (!found) {
              nextLevels.push({
                attributeId,
                experience: 0,
                level: nextLevel,
              });
            }
            return {
              ...(template || {}),
              saveLoadLevels: nextLevels,
            };
          }
        )
      );
      setSaveGame(next, { isModified: next !== state.saveGame });
    },
    [setSaveGame, state.saveGame]
  );

  const setDuplicantInterest = useCallback(
    (duplicantId, interestName, enabled) => {
      if (!state.saveGame || typeof interestName !== "string") {
        return;
      }
      const hash = getSkillGroupHash(interestName);
      if (!Number.isFinite(hash)) {
        return;
      }

      const next = mutateDuplicant(state.saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplate(gameObject, "MinionResume", (template) => {
          if (!template || typeof template !== "object") {
            return template;
          }

          const entries = Array.isArray(template.AptitudeBySkillGroup)
            ? template.AptitudeBySkillGroup
            : [];

          if (enabled) {
            let found = false;
            const nextEntries = entries.map((entry) => {
              if (!Array.isArray(entry) || entry.length < 2) {
                return entry;
              }
              if (entry[0]?.hash !== hash) {
                return entry;
              }
              found = true;
              return [{ hash }, 1];
            });
            if (!found) {
              nextEntries.push([{ hash }, 1]);
            }
            return {
              ...template,
              AptitudeBySkillGroup: nextEntries,
            };
          }

          const nextEntries = entries.filter((entry) => {
            if (!Array.isArray(entry) || entry.length < 2) {
              return true;
            }
            return entry[0]?.hash !== hash;
          });

          if (nextEntries.length === entries.length) {
            return template;
          }

          return {
            ...template,
            AptitudeBySkillGroup: nextEntries,
          };
        })
      );

      setSaveGame(next, { isModified: next !== state.saveGame });
    },
    [setSaveGame, state.saveGame]
  );

  const addDuplicantInterest = useCallback(
    (duplicantId, interestName) => {
      setDuplicantInterest(duplicantId, interestName, true);
    },
    [setDuplicantInterest]
  );

  const removeDuplicantInterest = useCallback(
    (duplicantId, interestName) => {
      setDuplicantInterest(duplicantId, interestName, false);
    },
    [setDuplicantInterest]
  );

  const updateDuplicantAppearance = useCallback(
    (duplicantId, type, ordinal) => {
      if (!state.saveGame || !Number.isFinite(ordinal)) {
        return;
      }
      const normalizedType = String(type || "");
      if (!["hair", "headshape", "eyes"].includes(normalizedType)) {
        return;
      }
      const maxByType = {
        headshape: 7,
      };
      const nextOrdinal = Math.max(1, Math.floor(ordinal));
      const max = maxByType[normalizedType];
      const clampedOrdinal = Number.isFinite(max)
        ? Math.min(max, nextOrdinal)
        : nextOrdinal;
      const next = mutateDuplicant(state.saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplate(gameObject, "Accessorizer", (template) => {
          if (!template || typeof template !== "object") {
            return template;
          }
          const accessories = Array.isArray(template.accessories)
            ? template.accessories
            : [];
          return {
            ...template,
            accessories: updateAccessoryList(accessories, normalizedType, clampedOrdinal),
          };
        })
      );
      setSaveGame(next, { isModified: next !== state.saveGame });
    },
    [setSaveGame, state.saveGame]
  );

  const updateDuplicantGender = useCallback(
    (duplicantId, gender) => {
      if (!state.saveGame) {
        return;
      }
      const normalized = String(gender || "").toUpperCase();
      const allowed = new Set(["MALE", "FEMALE", "NB"]);
      if (!allowed.has(normalized)) {
        return;
      }
      const next = mutateDuplicant(state.saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplate(gameObject, "MinionIdentity", (template) => {
          if (!template || typeof template !== "object") {
            return template;
          }
          return {
            ...template,
            gender: normalized,
            genderStringKey: normalized,
          };
        })
      );
      setSaveGame(next, { isModified: next !== state.saveGame });
    },
    [setSaveGame, state.saveGame]
  );

  const updateDuplicantHealthModifier = useCallback(
    (duplicantId, modifier, value) => {
      if (!state.saveGame || !modifier || !Number.isFinite(value)) {
        return;
      }
      const nextValue = Math.max(0, Number(value));
      const next = mutateDuplicant(state.saveGame, duplicantId, (gameObject) => {
        const behavior = getBehavior(gameObject, "MinionModifiers");
        if (!behavior) {
          return gameObject;
        }
        const extraData = behavior.extraData || {};
        const amounts = updateModifierAmounts(extraData.amounts, modifier, nextValue);
        return updateBehaviorData(gameObject, "MinionModifiers", {
          extraData: {
            ...extraData,
            amounts,
          },
        });
      });

      setSaveGame(next, { isModified: next !== state.saveGame });
    },
    [setSaveGame, state.saveGame]
  );

  const updateDuplicantExperience = useCallback(
    (duplicantId, experience) => {
      if (!state.saveGame || !Number.isFinite(experience)) {
        return;
      }
      const nextExperience = Math.max(0, Number(experience));
      const next = mutateDuplicant(state.saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplate(gameObject, "MinionResume", (template) => {
          if (!template || typeof template !== "object") {
            return template;
          }
          return {
            ...template,
            totalExperienceGained: nextExperience,
          };
        })
      );
      setSaveGame(next, { isModified: next !== state.saveGame });
    },
    [setSaveGame, state.saveGame]
  );

  const setDuplicantSkillMastery = useCallback(
    (duplicantId, skillId, enabled) => {
      if (!state.saveGame || !skillId) {
        return;
      }
      const next = mutateDuplicant(state.saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplate(gameObject, "MinionResume", (template) => {
          if (!template || typeof template !== "object") {
            return template;
          }
          return {
            ...template,
            MasteryBySkillID: setMasteryValue(template.MasteryBySkillID, skillId, Boolean(enabled)),
          };
        })
      );
      setSaveGame(next, { isModified: next !== state.saveGame });
    },
    [setSaveGame, state.saveGame]
  );

  const addDuplicantEffect = useCallback(
    (duplicantId, effectId, cycles) => {
      if (!state.saveGame || !effectId || !Number.isFinite(cycles) || cycles <= 0) {
        return;
      }
      const next = mutateDuplicant(state.saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplate(gameObject, "Klei.AI.Effects", (template) => {
          if (!template || typeof template !== "object") {
            return template;
          }
          return {
            ...template,
            saveLoadEffects: setEffectCycles(template.saveLoadEffects, effectId, cycles, "add"),
          };
        })
      );
      setSaveGame(next, { isModified: next !== state.saveGame });
    },
    [setSaveGame, state.saveGame]
  );

  const updateDuplicantEffectCycles = useCallback(
    (duplicantId, effectId, cycles) => {
      if (!state.saveGame || !effectId || !Number.isFinite(cycles) || cycles < 0) {
        return;
      }
      const next = mutateDuplicant(state.saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplate(gameObject, "Klei.AI.Effects", (template) => {
          if (!template || typeof template !== "object") {
            return template;
          }
          return {
            ...template,
            saveLoadEffects: setEffectCycles(template.saveLoadEffects, effectId, cycles, "update"),
          };
        })
      );
      setSaveGame(next, { isModified: next !== state.saveGame });
    },
    [setSaveGame, state.saveGame]
  );

  const removeDuplicantEffect = useCallback(
    (duplicantId, effectId) => {
      if (!state.saveGame || !effectId) {
        return;
      }
      const next = mutateDuplicant(state.saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplate(gameObject, "Klei.AI.Effects", (template) => {
          if (!template || typeof template !== "object") {
            return template;
          }
          return {
            ...template,
            saveLoadEffects: setEffectCycles(template.saveLoadEffects, effectId, 0, "remove"),
          };
        })
      );
      setSaveGame(next, { isModified: next !== state.saveGame });
    },
    [setSaveGame, state.saveGame]
  );

  const copyDuplicantBehaviors = useCallback(
    (duplicantId, behaviorNames) => {
      if (!state.saveGame || !Array.isArray(behaviorNames) || behaviorNames.length === 0) {
        return;
      }
      const gameObject = getGameObjectById(state.saveGame, duplicantId);
      const gameObjectType = getGameObjectTypeById(state.saveGame, duplicantId);
      if (!gameObject || !gameObjectType) {
        return;
      }

      const copyBehaviors = {};
      for (const requestedName of behaviorNames) {
        const resolvedName = resolveBehaviorName(gameObject, requestedName);
        if (!resolvedName) {
          continue;
        }
        const behavior = getBehavior(gameObject, resolvedName);
        if (!behavior) {
          continue;
        }
        const payload = {};
        if (behavior.templateData !== undefined) {
          payload.templateData = deepClone(behavior.templateData);
        }
        if (behavior.extraData !== undefined) {
          payload.extraData = deepClone(behavior.extraData);
        }
        copyBehaviors[requestedName] = payload;
      }

      setCopyPasteData({
        gameObjectType,
        behaviors: copyBehaviors,
      });
    },
    [setCopyPasteData, state.saveGame]
  );

  const canPasteBehaviorsTo = useCallback(
    (gameObjectId) => {
      if (!state.copyPasteData || !state.saveGame) {
        return false;
      }
      const targetType = getGameObjectTypeById(state.saveGame, gameObjectId);
      if (!targetType) {
        return false;
      }
      return state.copyPasteData.gameObjectType === targetType;
    },
    [state.copyPasteData, state.saveGame]
  );

  const applyBehaviorMerge = useCallback((saveGame, gameObjectId, behaviorDataMap, selectedNames = null) => {
    if (!saveGame || !behaviorDataMap || typeof behaviorDataMap !== "object") {
      return saveGame;
    }
    const targetNames =
      Array.isArray(selectedNames) && selectedNames.length > 0
        ? selectedNames
        : Object.keys(behaviorDataMap);

    return mutateGameObjectById(saveGame, gameObjectId, (gameObject) => {
      let nextObject = gameObject;
      for (const behaviorName of targetNames) {
        const behaviorData = behaviorDataMap[behaviorName];
        if (!behaviorData) {
          continue;
        }
        const resolvedName = resolveBehaviorName(nextObject, behaviorName);
        if (!resolvedName) {
          continue;
        }
        nextObject = updateBehaviorData(nextObject, resolvedName, behaviorData);
      }
      return nextObject;
    });
  }, []);

  const pasteDuplicantBehaviors = useCallback(
    (duplicantId, behaviorNames = null) => {
      if (!state.saveGame || !state.copyPasteData) {
        return;
      }
      if (!canPasteBehaviorsTo(duplicantId)) {
        return;
      }
      const next = applyBehaviorMerge(
        state.saveGame,
        duplicantId,
        state.copyPasteData.behaviors,
        behaviorNames
      );
      setSaveGame(next, { isModified: next !== state.saveGame });
    },
    [applyBehaviorMerge, canPasteBehaviorsTo, setSaveGame, state.copyPasteData, state.saveGame]
  );

  const exportDuplicantBehaviors = useCallback(
    async (duplicantId, behaviorNames) => {
      if (!state.saveGame || !Array.isArray(behaviorNames) || behaviorNames.length === 0) {
        return;
      }
      const gameObject = getGameObjectById(state.saveGame, duplicantId);
      const gameObjectType = getGameObjectTypeById(state.saveGame, duplicantId);
      if (!gameObject || !gameObjectType) {
        return;
      }

      const behaviors = {};
      for (const requestedName of behaviorNames) {
        const resolvedName = resolveBehaviorName(gameObject, requestedName);
        if (!resolvedName) {
          continue;
        }
        const behavior = getBehavior(gameObject, resolvedName);
        if (!behavior) {
          continue;
        }
        const payload = {};
        if (behavior.templateData !== undefined) {
          payload.templateData = deepClone(behavior.templateData);
        }
        if (behavior.extraData !== undefined) {
          payload.extraData = deepClone(behavior.extraData);
        }
        behaviors[requestedName] = payload;
      }

      const exportObject = {
        gameObjectType,
        behaviors,
      };

      const hash = await hashObjectSha1(exportObject);
      const output = hash
        ? {
            ...exportObject,
            $sha1: hash,
          }
        : exportObject;

      const identity = getBehavior(gameObject, "MinionIdentity");
      const safeName = identity?.templateData?.name || `duplicant-${duplicantId}`;
      downloadText(JSON.stringify(output, null, 2), `${safeName}.json`);
    },
    [state.saveGame]
  );

  const validateImportPayload = useCallback((payload) => {
    if (!payload || typeof payload !== "object") {
      return "Import file must be a JSON object.";
    }
    if (typeof payload.gameObjectType !== "string" || !payload.gameObjectType) {
      return "Import file is missing gameObjectType.";
    }
    if (!payload.behaviors || typeof payload.behaviors !== "object" || Array.isArray(payload.behaviors)) {
      return "Import file is missing behaviors.";
    }
    return null;
  }, []);

  const importDuplicantBehaviors = useCallback(
    async (duplicantId, file) => {
      if (!state.saveGame || !file) {
        return;
      }
      const targetType = getGameObjectTypeById(state.saveGame, duplicantId);
      if (!targetType) {
        setError("Target game object not found for import.");
        return;
      }

      let parsed;
      try {
        const text = await file.text();
        parsed = JSON.parse(text);
      } catch (_error) {
        setError("Invalid import JSON file.");
        return;
      }

      const expectedHash = typeof parsed.$sha1 === "string" ? parsed.$sha1 : null;
      if (Object.prototype.hasOwnProperty.call(parsed, "$sha1")) {
        delete parsed.$sha1;
      }

      const validationError = validateImportPayload(parsed);
      if (validationError) {
        setError(validationError);
        return;
      }

      if (parsed.gameObjectType !== targetType) {
        setError(
          `Import gameObjectType mismatch. Expected ${targetType}, got ${parsed.gameObjectType}.`
        );
        return;
      }

      const actualHash = await hashObjectSha1(parsed);
      const mismatch =
        Boolean(expectedHash) &&
        Boolean(actualHash) &&
        String(expectedHash).toLowerCase() !== String(actualHash).toLowerCase();

      if (mismatch) {
        setImportWarning({
          duplicantId,
          fileName: file.name || "import.json",
          expectedHash,
          actualHash,
          payload: parsed,
        });
        return;
      }

      const next = applyBehaviorMerge(state.saveGame, duplicantId, parsed.behaviors);
      setSaveGame(next, { isModified: next !== state.saveGame });
    },
    [applyBehaviorMerge, setError, setImportWarning, setSaveGame, state.saveGame, validateImportPayload]
  );

  const confirmImportWarning = useCallback(
    (shouldContinue) => {
      const warning = state.importWarning;
      clearImportWarning();
      if (!shouldContinue || !warning || !state.saveGame) {
        return;
      }
      const next = applyBehaviorMerge(
        state.saveGame,
        warning.duplicantId,
        warning.payload.behaviors
      );
      setSaveGame(next, { isModified: next !== state.saveGame });
    },
    [applyBehaviorMerge, clearImportWarning, setSaveGame, state.importWarning, state.saveGame]
  );

  const cloneDuplicant = useCallback(
    (duplicantId) => {
      if (!state.saveGame || !Array.isArray(state.saveGame.gameObjects)) {
        return;
      }
      const location = findGameObjectLocation(state.saveGame, duplicantId);
      if (!location || location.group?.name !== "Minion") {
        return;
      }
      const source = location.gameObject;
      const newId = Number.isFinite(state.saveGame?.settings?.nextUniqueID)
        ? state.saveGame.settings.nextUniqueID
        : null;
      if (!Number.isFinite(newId)) {
        setError("Unable to clone duplicant: save has no nextUniqueID.");
        return;
      }

      let clone = {
        ...deepClone(source),
        behaviors: Array.isArray(source.behaviors)
          ? deepClone(source.behaviors).filter(
              (behavior) => !DUPLICANT_CLONE_BEHAVIOR_BLACKLIST.has(behavior?.name)
            )
          : [],
      };

      clone = updateBehaviorTemplate(clone, "KPrefabID", (template) => ({
        ...(template || {}),
        InstanceID: newId,
      }));

      const identity = getBehavior(source, "MinionIdentity");
      const oldName = identity?.templateData?.name || `Duplicant ${duplicantId}`;

      clone = updateBehaviorTemplate(clone, "MinionIdentity", (template) => ({
        ...(template || {}),
        assignableProxy: { id: -1 },
        name: `Clone of ${oldName}`,
      }));

      const nextGroups = state.saveGame.gameObjects.map((group, index) => {
        if (index !== location.groupIndex || !Array.isArray(group?.gameObjects)) {
          return group;
        }
        return {
          ...group,
          gameObjects: [...group.gameObjects, clone],
        };
      });

      const nextSaveGame = {
        ...state.saveGame,
        settings: {
          ...state.saveGame.settings,
          nextUniqueID: newId + 1,
        },
        gameObjects: nextGroups,
      };
      setSaveGame(nextSaveGame, { isModified: true });
      setSelectedDuplicantId(newId);
    },
    [setError, setSaveGame, setSelectedDuplicantId, state.saveGame]
  );

  const updateGeyserType = useCallback(
    (gameObjectId, geyserType) => {
      if (!state.saveGame || typeof geyserType !== "string" || !geyserType) {
        return;
      }
      const location = findGameObjectLocation(state.saveGame, gameObjectId);
      if (!location) {
        return;
      }

      const nextObject = updateBehaviorTemplate(location.gameObject, "Geyser", (template) => {
        const configuration = template?.configuration || {};
        return {
          ...(template || {}),
          configuration: {
            ...configuration,
            typeId: { hash: getHashedStringHash(geyserType) },
          },
        };
      });

      const moved = moveGameObjectToGroup(
        state.saveGame,
        location,
        nextObject,
        `GeyserGeneric_${geyserType}`
      );

      setSaveGame(moved, { isModified: moved !== state.saveGame });
    },
    [setSaveGame, state.saveGame]
  );

  const updateGeyserParameter = useCallback(
    (gameObjectId, parameterName, value) => {
      if (!state.saveGame || !parameterName || !Number.isFinite(value)) {
        return;
      }
      const next = mutateGameObjectById(state.saveGame, gameObjectId, (gameObject) =>
        updateBehaviorTemplate(gameObject, "Geyser", (template) => {
          const configuration = template?.configuration || {};
          return {
            ...(template || {}),
            configuration: {
              ...configuration,
              [parameterName]: Number(value),
            },
          };
        })
      );
      setSaveGame(next, { isModified: next !== state.saveGame });
    },
    [setSaveGame, state.saveGame]
  );

  const updateRawValue = useCallback(
    (path, value) => {
      if (!state.saveGame || !Array.isArray(path) || path.length === 0) {
        return;
      }
      const nextSaveGame = setPathValue(state.saveGame, path, value);
      setSaveGame(nextSaveGame, { isModified: true });
    },
    [setSaveGame, state.saveGame]
  );

  const value = useMemo(() => {
    const hasSave = Boolean(state.saveGame);
    const isBusy = state.status === "loading" || state.status === "saving";
    const canForceLoad =
      Boolean(state.pendingFile) &&
      state.lastLoadAttemptStrictness === "minor" &&
      state.error?.code === "E_VERSION_MINOR";

    return {
      ...state,
      hasSave,
      isBusy,
      canForceLoad,
      parseStrictness: state.preferredStrictness,
      setParseStrictness,
      loadSaveFile,
      loadSaveWithPicker,
      forceLoadPendingFile,
      retryLoadPendingFile,
      saveCurrentFile,
      setSaveGame,
      clearError,
      clearImportWarning,
      setSelectedDuplicantId,
      setSelectedCreatureId,
      updateDifficultySetting,
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
      copyDuplicantBehaviors,
      canPasteBehaviorsTo,
      pasteDuplicantBehaviors,
      exportDuplicantBehaviors,
      importDuplicantBehaviors,
      confirmImportWarning,
      cloneDuplicant,
      updateGeyserType,
      updateGeyserParameter,
      updateRawValue,
    };
  }, [
    addDuplicantEffect,
    addDuplicantInterest,
    addDuplicantTrait,
    canPasteBehaviorsTo,
    clearImportWarning,
    cloneDuplicant,
    confirmImportWarning,
    copyDuplicantBehaviors,
    exportDuplicantBehaviors,
    removeDuplicantInterest,
    removeDuplicantEffect,
    removeDuplicantTrait,
    forceLoadPendingFile,
    importDuplicantBehaviors,
    retryLoadPendingFile,
    loadSaveFile,
    loadSaveWithPicker,
    pasteDuplicantBehaviors,
    saveCurrentFile,
    setParseStrictness,
    setDuplicantSkillMastery,
    setSaveGame,
    clearError,
    setSelectedDuplicantId,
    setSelectedCreatureId,
    state,
    updateDuplicantAttributeLevel,
    updateDuplicantAppearance,
    updateDuplicantGender,
    updateDuplicantEffectCycles,
    updateDuplicantExperience,
    updateDuplicantHealthModifier,
    updateDifficultySetting,
    updateDuplicantName,
    updateGeyserParameter,
    updateGeyserType,
    updateRawValue,
  ]);

  return (
    <SaveSessionContext.Provider value={value}>
      {children}
    </SaveSessionContext.Provider>
  );
}

export function useSaveSession() {
  const value = useContext(SaveSessionContext);
  if (!value) {
    throw new Error("useSaveSession must be used within SaveSessionProvider");
  }
  return value;
}
