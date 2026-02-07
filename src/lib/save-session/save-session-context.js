"use client";

import { createContext, useCallback, useContext, useMemo, useReducer } from "react";
import { parseSaveInWorker, writeSaveInWorker } from "@/lib/oni/parser-client";

const SaveSessionContext = createContext(null);

const INITIAL_STATE = {
  status: "idle",
  progressMessage: "",
  error: null,
  saveGame: null,
  fileName: null,
  parseTimeMs: null,
  lastWrittenBytes: null,
  isModified: false,
  pendingFile: null,
  lastLoadAttemptStrictness: "major",
};

function reducer(state, action) {
  switch (action.type) {
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
        parseTimeMs: action.parseTimeMs,
        lastWrittenBytes: null,
        isModified: false,
        pendingFile: null,
      };
    case "LOAD_ERROR":
      return {
        ...state,
        status: "error",
        progressMessage: "",
        error: action.error,
        saveGame: null,
        parseTimeMs: null,
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

function deriveOutputName(fileName, saveGame) {
  if (fileName && fileName.toLowerCase().endsWith(".sav")) {
    return fileName;
  }
  const colonyName = saveGame?.header?.gameInfo?.baseName;
  if (colonyName) {
    return `${colonyName}.sav`;
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

export function SaveSessionProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const loadSaveFile = useCallback(async (file, options = {}) => {
    if (!file) {
      return;
    }
    const strictness = options.versionStrictness || "major";
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
        parseTimeMs,
      });
    } catch (error) {
      dispatch({ type: "LOAD_ERROR", error: normalizeError(error) });
    }
  }, []);

  const forceLoadPendingFile = useCallback(async () => {
    if (!state.pendingFile) {
      return;
    }
    await loadSaveFile(state.pendingFile, { versionStrictness: "major" });
  }, [loadSaveFile, state.pendingFile]);

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
      const outputName =
        options.fileName || deriveOutputName(state.fileName, state.saveGame);
      downloadArrayBuffer(data, outputName);
      dispatch({ type: "SAVE_SUCCESS", bytes: data.byteLength });
    } catch (error) {
      dispatch({ type: "SAVE_ERROR", error: normalizeError(error) });
    }
  }, [state.fileName, state.saveGame]);

  const setSaveGame = useCallback((saveGame, options = {}) => {
    dispatch({
      type: "SET_SAVE_GAME",
      saveGame,
      isModified: options.isModified,
    });
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
      loadSaveFile,
      forceLoadPendingFile,
      saveCurrentFile,
      setSaveGame,
      updateDifficultySetting,
    };
  }, [
    forceLoadPendingFile,
    loadSaveFile,
    saveCurrentFile,
    setSaveGame,
    state,
    updateDifficultySetting,
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
