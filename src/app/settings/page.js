"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/i18n-context";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import { probeSaveGame } from "@/lib/oni/save-probe";
import { HAIR_OFFSET_BASES } from "@/lib/oni/hair-offsets";
import M3Select from "@/components/ui/m3-select";
import M3ExpressiveLoadingIndicator from "@/components/ui/m3-expressive-loading-indicator";
import { withBasePath } from "@/lib/asset-paths";

export default function SettingsPage() {
  const { locale, setLocale, languages, supportedLocales, t } = useI18n();
  const { parseStrictness, setParseStrictness, saveGame, fileName, hasSave } =
    useSaveSession();
  const currentLanguageLabel = useMemo(
    () => languages.find((entry) => entry.code === locale)?.label || locale,
    [languages, locale]
  );
  const isSingleLocale = supportedLocales.length <= 1;
  const [probe, setProbe] = useState(null);
  const [probeError, setProbeError] = useState("");
  const [hairOffsets, setHairOffsets] = useState({});
  const [hairOffsetsLoaded, setHairOffsetsLoaded] = useState(false);
  const [hairOffsetHairId, setHairOffsetHairId] = useState("1");
  const [hairOffsetX, setHairOffsetX] = useState("0");
  const [hairOffsetY, setHairOffsetY] = useState("0");
  const [hairOffsetScale, setHairOffsetScale] = useState("1");
  const [hairOffsetError, setHairOffsetError] = useState("");
  const [hairOffsetJson, setHairOffsetJson] = useState("");
  const [modalPreview, setModalPreview] = useState(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem("duplicity.hairOffsets");
    if (!stored) {
      setHairOffsets({});
      setHairOffsetsLoaded(true);
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
    } finally {
      setHairOffsetsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!hairOffsetsLoaded) {
      return;
    }
    window.localStorage.setItem("duplicity.hairOffsets", JSON.stringify(hairOffsets));
  }, [hairOffsets, hairOffsetsLoaded]);

  useEffect(() => {
    if (!modalPreview || typeof window === "undefined") {
      return;
    }
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setModalPreview(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [modalPreview]);

  useEffect(() => {
    const parsedHairId = Number(hairOffsetHairId);
    if (!Number.isFinite(parsedHairId)) {
      return;
    }
    const entry = hairOffsets[String(parsedHairId)];
    if (entry && Number.isFinite(entry.x) && Number.isFinite(entry.y)) {
      setHairOffsetX(String(entry.x));
      setHairOffsetY(String(entry.y));
      setHairOffsetScale(
        Number.isFinite(entry.scale) ? String(entry.scale) : "1"
      );
      return;
    }
    setHairOffsetX("0");
    setHairOffsetY("0");
    setHairOffsetScale("1");
  }, [hairOffsetHairId, hairOffsets]);

  const hairOffsetEntries = useMemo(() => {
    return Object.entries(hairOffsets)
      .map(([key, value]) => ({
        hairId: String(key),
        x: Number(value?.x ?? 0),
        y: Number(value?.y ?? 0),
        scale: Number(value?.scale ?? 1),
      }))
      .sort((a, b) => Number(a.hairId) - Number(b.hairId));
  }, [hairOffsets]);

  const saveHairOffset = useCallback(() => {
    const parsedHairId = Number(hairOffsetHairId);
    if (!Number.isFinite(parsedHairId) || parsedHairId < 1 || parsedHairId > 99) {
      setHairOffsetError("Hair ID must be between 1 and 99.");
      return;
    }
    const parsedX = Number(hairOffsetX);
    const parsedY = Number(hairOffsetY);
    const parsedScale = Number(hairOffsetScale);
    if (
      !Number.isFinite(parsedX) ||
      !Number.isFinite(parsedY) ||
      !Number.isFinite(parsedScale)
    ) {
      setHairOffsetError("Offsets must be valid numbers.");
      return;
    }
    if (parsedScale < 0.5 || parsedScale > 2) {
      setHairOffsetError("Scale must be between 0.5 and 2.");
      return;
    }
    setHairOffsets((prev) => ({
      ...prev,
      [String(parsedHairId)]: {
        x: Math.trunc(parsedX),
        y: Math.trunc(parsedY),
        scale: Number(parsedScale.toFixed(2)),
      },
    }));
    setHairOffsetError("");
  }, [hairOffsetHairId, hairOffsetScale, hairOffsetX, hairOffsetY]);

  const removeHairOffset = useCallback((hairId) => {
    setHairOffsets((prev) => {
      const next = { ...prev };
      delete next[hairId];
      return next;
    });
  }, []);

  const applyHairOffsetJson = useCallback(() => {
    if (!hairOffsetJson.trim()) {
      setHairOffsetError("Paste a JSON object first.");
      return;
    }
    try {
      const parsed = JSON.parse(hairOffsetJson);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setHairOffsetError("JSON must be an object keyed by hair id.");
        return;
      }
      setHairOffsets(parsed);
      setHairOffsetError("");
    } catch (_error) {
      setHairOffsetError("Invalid JSON.");
    }
  }, [hairOffsetJson]);

  const downloadJson = useCallback((payload, name) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, []);

  const exportHairOffsets = useCallback(() => {
    downloadJson(hairOffsets, "duplicity-hair-offsets.json");
  }, [downloadJson, hairOffsets]);

  const previewHairId = useMemo(() => {
    const parsed = Number(hairOffsetHairId);
    if (!Number.isFinite(parsed)) {
      return 1;
    }
    return Math.min(99, Math.max(1, Math.floor(parsed)));
  }, [hairOffsetHairId]);

  const previewOffset = useMemo(() => {
    const base = HAIR_OFFSET_BASES[previewHairId] || {};
    const deltaX = Number(hairOffsetX) || 0;
    const deltaY = Number(hairOffsetY) || 0;
    const deltaScale = Number(hairOffsetScale) || 1;
    return {
      baseX: Number.isFinite(base.x) ? base.x : 0,
      baseY: Number.isFinite(base.y) ? base.y : 0,
      baseScale: Number.isFinite(base.scale) ? base.scale : 1,
      deltaX,
      deltaY,
      deltaScale,
      x: (Number.isFinite(base.x) ? base.x : 0) + deltaX,
      y: (Number.isFinite(base.y) ? base.y : 0) + deltaY,
      scale: (Number.isFinite(base.scale) ? base.scale : 1) * deltaScale,
    };
  }, [hairOffsetScale, hairOffsetX, hairOffsetY, previewHairId]);

  const onHairDragStart = useCallback(
    (event) => {
      event.preventDefault();
      const baseX = Number.isFinite(previewOffset.x) ? previewOffset.x : 0;
      const baseY = Number.isFinite(previewOffset.y) ? previewOffset.y : 0;
      dragRef.current = {
        hairId: String(previewHairId),
        startX: event.clientX,
        startY: event.clientY,
        baseX,
        baseY,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [previewHairId, previewOffset.x, previewOffset.y]
  );

  const onHairDragMove = useCallback(
    (event) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      const nextEffectiveX = Math.trunc(drag.baseX + deltaX);
      const nextEffectiveY = Math.trunc(drag.baseY + deltaY);
      const nextDeltaX = Math.trunc(nextEffectiveX - previewOffset.baseX);
      const nextDeltaY = Math.trunc(nextEffectiveY - previewOffset.baseY);
      setHairOffsetX(String(nextDeltaX));
      setHairOffsetY(String(nextDeltaY));
      setHairOffsets((prev) => ({
        ...prev,
        [drag.hairId]: {
          x: nextDeltaX,
          y: nextDeltaY,
          scale: Number(hairOffsetScale) || 1,
        },
      }));
    },
    [hairOffsetScale, previewOffset.baseX, previewOffset.baseY, setHairOffsets]
  );

  const onHairDragEnd = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragRef.current = null;
  }, []);

  const runProbe = useCallback(() => {
    if (!saveGame) {
      setProbeError("Load a save file to generate a probe report.");
      return null;
    }
    try {
      const nextProbe = probeSaveGame(saveGame, { fileName });
      setProbe(nextProbe);
      setProbeError("");
      return nextProbe;
    } catch (error) {
      setProbeError(error?.message || "Failed to generate probe report.");
      return null;
    }
  }, [fileName, saveGame]);

  const onDownloadProbe = useCallback(() => {
    const result = probe || runProbe();
    if (!result) {
      return;
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputName = `duplicity-probe-${timestamp}.json`;
    downloadJson(result, outputName);
  }, [downloadJson, probe, runProbe]);

  return (
    <>
      <section className="rounded-xl border border-black/10 p-5 dark:border-white/15">
      <h1 className="text-2xl font-semibold">
        {t("app.page-title.settings", { fallback: "Settings" })}
      </h1>

      <div className="mt-5 max-w-md rounded-xl border border-white/20 p-4">
        <label className="text-sm font-semibold" htmlFor="language-select">
          {t("settings.language.title", { fallback: "Language" })}
        </label>
        <M3Select
          id="language-select"
          containerClassName="mt-2"
          className="m3-field w-full px-3 py-2 text-sm"
          value={locale}
          onChange={(event) => setLocale(event.target.value)}
          disabled={isSingleLocale}
        >
          {languages.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.label}
            </option>
          ))}
        </M3Select>
        <p className="mt-3 text-xs opacity-75">
          {t("settings.language.current", {
            fallback: "Current language: {language}",
            params: { language: currentLanguageLabel },
          })}
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-white/15 p-4 text-xs opacity-75">
        <p>
          {t("settings.i18n.namespaces", { fallback: "Loaded namespaces: common, oni" })}
        </p>
        <p className="mt-1">
          {t("settings.i18n.languages", {
            fallback: "Supported language packs: English only (for now).",
          })}
        </p>
      </div>

      <div className="mt-5 max-w-md rounded-xl border border-white/20 p-4">
        <label className="text-sm font-semibold" htmlFor="strictness-select">
          {t("settings.strictness.title", { fallback: "Save Parse Strictness" })}
        </label>
        <p className="mt-1 text-xs opacity-75">
          {t("settings.strictness.description", {
            fallback:
              "Controls how strictly the parser enforces save version checks when loading.",
          })}
        </p>
        <M3Select
          id="strictness-select"
          containerClassName="mt-2"
          className="m3-field w-full px-3 py-2 text-sm"
          value={parseStrictness}
          onChange={(event) => setParseStrictness(event.target.value)}
        >
          <option value="major">major (recommended)</option>
          <option value="minor">minor</option>
          <option value="none">none</option>
        </M3Select>
      </div>

      </section>

      <section className="mt-5 rounded-xl border border-black/10 p-5 dark:border-white/15">
      <h2 className="text-2xl font-semibold">Dev Tools</h2>

      <div className="mt-5 rounded-xl border border-white/15 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">
              {t("settings.probe.title", { fallback: "Save Schema Probe" })}
            </h2>
            <p className="mt-1 text-xs opacity-75">
              {t("settings.probe.description", {
                fallback:
                  "Scans the loaded save file for settings like disease, morale, radiation, stress, and other game rules.",
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runProbe}
              disabled={!hasSave}
              className="m3-button m3-button-outlined px-3 py-2 text-xs"
            >
              {t("settings.probe.generate", { fallback: "Generate Probe" })}
            </button>
            <button
              type="button"
              onClick={onDownloadProbe}
              disabled={!hasSave}
              className="m3-button m3-button-tonal px-3 py-2 text-xs"
            >
              {t("settings.probe.download", { fallback: "Download JSON" })}
            </button>
          </div>
        </div>

        {probeError ? (
          <p className="mt-3 text-xs text-red-300">{probeError}</p>
        ) : null}

        {probe ? (
          <div className="mt-4 grid gap-2 text-xs opacity-85">
            <p>
              Scan: {probe.scan.scannedNodes} nodes
              {probe.scan.truncated ? ` (truncated at ${probe.scan.maxNodes})` : ""}
            </p>
            <p>
              Matches per term (max {probe.scan.maxMatchesPerTerm}):
            </p>
            <div className="grid gap-1">
              {probe.terms.map((term) => (
                <p key={term.id}>
                  {term.label}: {term.count}
                </p>
              ))}
            </div>
            {probe.appearance ? (
              <div className="mt-2 grid gap-1">
                <p>Appearance (hair/headshape/eyes):</p>
                <p>
                  Hair: {probe.appearance.hair?.unique ?? 0} unique /{" "}
                  {probe.appearance.hair?.total ?? 0} total
                </p>
                <p>
                  Headshape: {probe.appearance.headshape?.unique ?? 0} unique /{" "}
                  {probe.appearance.headshape?.total ?? 0} total
                </p>
                <p>
                  Eyes: {probe.appearance.eyes?.unique ?? 0} unique /{" "}
                  {probe.appearance.eyes?.total ?? 0} total
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-5 rounded-xl border border-white/20 p-4">
        <label className="text-sm font-semibold">Hair Overlay Offsets (px)</label>
        <p className="mt-1 text-xs opacity-75">
          Set per-hair offsets relative to the baked defaults.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_260px]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col items-center gap-2 rounded-md border border-white/15 bg-black/40 px-4 py-3">
                <span className="text-xs uppercase tracking-wide opacity-70">Preview</span>
                <div className="relative h-32 w-32 rounded-md border border-white/10 bg-[var(--foreground)]">
                  <img
                    src={withBasePath("/images/oni/head/head_1.png")}
                    alt="Head base"
                    className="absolute inset-0 h-full w-full object-contain"
                    draggable="false"
                  />
                  <img
                    src={withBasePath(`/images/oni/hair/hair_${previewHairId}.png`)}
                    alt={`Hair ${previewHairId}`}
                    className="absolute inset-0 h-full w-full cursor-move object-contain"
                    style={{
                      transform: `translate(${previewOffset.x}px, ${previewOffset.y}px) scale(${previewOffset.scale})`,
                      transformOrigin: "50% 50%",
                    }}
                    onPointerDown={onHairDragStart}
                    onPointerMove={onHairDragMove}
                    onPointerUp={onHairDragEnd}
                    onPointerCancel={onHairDragEnd}
                    draggable="false"
                  />
                </div>
                <span className="text-[11px] opacity-70">
                  Drag hair to reposition (delta applied on top of baked base)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs opacity-80">
                <span>Hair ID</span>
                <input
                  type="number"
                  min="1"
                  max="99"
                  step="1"
                  value={hairOffsetHairId}
                  onChange={(event) => setHairOffsetHairId(event.target.value)}
                  className="w-20 rounded-md border border-white/25 bg-black px-2 py-1 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs opacity-80">
                <span>X</span>
                <input
                  type="number"
                  step="1"
                  value={hairOffsetX}
                  onChange={(event) => setHairOffsetX(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      saveHairOffset();
                    }
                  }}
                  className="w-20 rounded-md border border-white/25 bg-black px-2 py-1 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs opacity-80">
                <span>Y</span>
                <input
                  type="number"
                  step="1"
                  value={hairOffsetY}
                  onChange={(event) => setHairOffsetY(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      saveHairOffset();
                    }
                  }}
                  className="w-20 rounded-md border border-white/25 bg-black px-2 py-1 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs opacity-80">
                <span>Scale</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.5"
                  max="2"
                  value={hairOffsetScale}
                  onChange={(event) => setHairOffsetScale(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      saveHairOffset();
                    }
                  }}
                  className="w-20 rounded-md border border-white/25 bg-black px-2 py-1 text-sm"
                />
              </label>
              <button
                type="button"
                onClick={saveHairOffset}
                className="m3-button m3-button-tonal px-3 py-2 text-xs"
              >
                Save Offset
              </button>
              <button
                type="button"
                onClick={() => {
                  setHairOffsetHairId("1");
                  setHairOffsetX("0");
                  setHairOffsetY("0");
                  setHairOffsetScale("1");
                }}
                className="m3-button m3-button-outlined px-3 py-2 text-xs"
              >
                Reset Fields
              </button>
              <button
                type="button"
                onClick={() => setHairOffsets({})}
                className="m3-button m3-button-outlined px-3 py-2 text-xs"
              >
                Clear All
              </button>
            </div>
            {hairOffsetError ? (
              <p className="text-xs text-red-300">{hairOffsetError}</p>
            ) : null}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide opacity-70">
                Paste JSON
              </label>
              <textarea
                value={hairOffsetJson}
                onChange={(event) => setHairOffsetJson(event.target.value)}
                placeholder='{"1":{"x":0,"y":0},"2":{"x":2,"y":-1}}'
                className="mt-2 h-28 w-full rounded-md border border-white/20 bg-black/40 p-2 text-xs"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={applyHairOffsetJson}
                  className="m3-button m3-button-outlined px-3 py-2 text-xs"
                >
                  Apply JSON
                </button>
                <button
                  type="button"
                  onClick={() => setHairOffsetJson(JSON.stringify(hairOffsets, null, 2))}
                  className="m3-button m3-button-outlined px-3 py-2 text-xs"
                >
                  Load Current JSON
                </button>
              </div>
            </div>
          </div>

          <aside className="rounded-md border border-white/10 bg-black/40 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">Adjusted Hairs</span>
              <button
                type="button"
                onClick={exportHairOffsets}
                className="m3-button m3-button-outlined px-2 py-1 text-[11px]"
              >
                Export All
              </button>
            </div>
            {hairOffsetEntries.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {hairOffsetEntries.map((entry) => (
                  <button
                    key={entry.hairId}
                    type="button"
                    onClick={() => {
                      setHairOffsetHairId(entry.hairId);
                      setHairOffsetX(String(entry.x));
                      setHairOffsetY(String(entry.y));
                      setHairOffsetScale(
                        Number.isFinite(entry.scale) ? String(entry.scale) : "1"
                      );
                    }}
                    className="flex items-center justify-between rounded-md border border-white/10 px-2 py-1 text-left hover:bg-white/5"
                  >
                    <span className="font-semibold">hair_{entry.hairId}</span>
                    <span className="opacity-70">
                      dx {entry.x}, dy {entry.y}, ds {Number.isFinite(entry.scale) ? entry.scale : 1}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 opacity-70">No hair offsets saved yet.</p>
            )}
            {hairOffsetEntries.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => removeHairOffset(hairOffsetHairId)}
                  className="m3-button m3-button-outlined px-2 py-1 text-[11px]"
                >
                  Remove Selected
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-white/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Modal Playground</h2>
            <p className="mt-1 text-xs opacity-75">
              Open each app modal to validate layout, copy, and controls.
            </p>
          </div>
          {modalPreview ? (
            <button
              type="button"
              onClick={() => setModalPreview(null)}
              className="m3-button m3-button-outlined px-3 py-2 text-xs"
            >
              Close Preview
            </button>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setModalPreview("loading")}
            className="m3-button m3-button-outlined px-3 py-2 text-xs"
          >
            Loading Modal
          </button>
          <button
            type="button"
            onClick={() => setModalPreview("saving")}
            className="m3-button m3-button-outlined px-3 py-2 text-xs"
          >
            Saving Modal
          </button>
          <button
            type="button"
            onClick={() => setModalPreview("import-warning")}
            className="m3-button m3-button-outlined px-3 py-2 text-xs"
          >
            Import Warning Modal
          </button>
          <button
            type="button"
            onClick={() => setModalPreview("backup-prompt")}
            className="m3-button m3-button-outlined px-3 py-2 text-xs"
          >
            Backup Prompt Modal
          </button>
        </div>
      </div>

      </section>

      {modalPreview === "loading" || modalPreview === "saving" ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setModalPreview(null)}
        >
          <div
            className="m3-surface-raised w-full max-w-md p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-semibold">
              {modalPreview === "loading"
                ? t("save-file.conditions.loading", { fallback: "Loading" })
                : t("save-file.conditions.saving", { fallback: "Saving" })}
            </h3>
            <p className="mt-1 text-xs opacity-70">
              {t("app.file-label", { fallback: "File" })}:{" "}
              <code>{fileName || "example_save.sav"}</code>
            </p>
            <div className="mt-4 flex items-center gap-3">
              <M3ExpressiveLoadingIndicator size={64} aria-hidden="true" />
              <p className="min-w-0 truncate text-sm opacity-85">
                {modalPreview === "loading"
                  ? t("app.progress.reading", { fallback: "Reading save data..." })
                  : t("app.progress.writing", { fallback: "Writing save data..." })}
              </p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setModalPreview(null)}
                className="m3-button m3-button-tonal px-3 py-2 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalPreview === "import-warning" ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setModalPreview(null)}
        >
          <div
            className="m3-surface-raised w-full max-w-lg p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-semibold">
              {t("app.import-warning.title", { fallback: "Checksum Warning" })}
            </h3>
            <p className="mt-2 text-sm opacity-85">
              {t("app.import-warning.detail", {
                fallback:
                  "Import file checksum does not match the payload. Data may have been modified.",
              })}
            </p>
            <p className="mt-2 text-xs opacity-75">
              {t("app.file-label", { fallback: "File" })}: <code>import.json</code>
            </p>
            <p className="mt-1 text-xs opacity-75">
              {t("app.expected", { fallback: "Expected" })}: <code>abc123</code>
            </p>
            <p className="mt-1 text-xs opacity-75">
              {t("app.actual", { fallback: "Actual" })}: <code>def456</code>
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setModalPreview(null)}
                className="m3-button m3-button-outlined px-3 py-2 text-sm"
              >
                {t("dialog.verbs.cancel_titlecase", { fallback: "Cancel" })}
              </button>
              <button
                type="button"
                onClick={() => setModalPreview(null)}
                className="m3-button m3-button-tonal px-3 py-2 text-sm"
              >
                {t("app.import-warning.import-anyway", { fallback: "Import Anyway" })}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalPreview === "backup-prompt" ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setModalPreview(null)}
        >
          <div
            className="m3-surface-raised w-full max-w-lg p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-semibold">
              {t("app.backup.title", { fallback: "Download Backup Save File?" })}
            </h3>
            <p className="mt-2 text-sm opacity-85">
              {t("app.backup.detail", {
                fallback:
                  "You're about to overwrite the current save file. Do you want to download a backup first?",
              })}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setModalPreview(null)}
                className="m3-button m3-button-outlined px-3 py-2 text-sm"
              >
                {t("dialog.verbs.cancel_titlecase", { fallback: "Cancel" })}
              </button>
              <button
                type="button"
                onClick={() => setModalPreview(null)}
                className="m3-button m3-button-outlined px-3 py-2 text-sm"
              >
                {t("app.backup.skip", { fallback: "Skip Backup" })}
              </button>
              <button
                type="button"
                onClick={() => setModalPreview(null)}
                className="m3-button m3-button-tonal px-3 py-2 text-sm"
              >
                {t("app.backup.confirm", { fallback: "Download Backup & Save" })}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
