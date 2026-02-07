"use client";

import { useEffect, useMemo, useState } from "react";
import SaveRequiredPage from "@/components/save-required-page";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import {
  getPathValue,
  getPrimitiveType,
  getRawSegmentName,
  isObjectLike,
} from "@/lib/oni/raw-path-utils";

function pathId(path) {
  if (!Array.isArray(path) || path.length === 0) {
    return "root";
  }
  return path.join(".");
}

function samePath(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return false;
  }
  return a.every((item, index) => item === b[index]);
}

function listObjectChildren(value) {
  if (!isObjectLike(value)) {
    return [];
  }
  return Object.keys(value)
    .filter((key) => isObjectLike(value[key]))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function PrimitiveValueEditor({ fieldPath, fieldName, value, onCommit }) {
  const type = getPrimitiveType(value);
  const [draft, setDraft] = useState(String(value ?? ""));
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(String(value ?? ""));
    setError("");
  }, [value]);

  if (!type) {
    return null;
  }

  const commitNumber = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setError("Enter a valid number.");
      return;
    }
    setError("");
    onCommit(fieldPath, parsed);
  };

  if (type === "boolean") {
    return (
      <label className="flex items-center justify-between gap-3 rounded-md border border-white/15 px-3 py-2">
        <span className="text-sm opacity-80">{fieldName}</span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onCommit(fieldPath, event.target.checked)}
          className="h-4 w-4 accent-[var(--accent)]"
        />
      </label>
    );
  }

  return (
    <div className="rounded-md border border-white/15 px-3 py-2">
      <label className="text-sm opacity-80">{fieldName}</label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type={type === "number" ? "number" : "text"}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="min-w-[240px] rounded-md border border-white/25 bg-black px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={type === "number" ? commitNumber : () => onCommit(fieldPath, draft)}
          className="rounded-md border border-white/25 px-3 py-2 text-sm font-semibold hover:bg-white/10"
        >
          Apply
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
    </div>
  );
}

function RawTreeNode({ saveGame, path, selectedPath, onSelect, defaultExpanded = false }) {
  const value = getPathValue(saveGame, path);
  const children = useMemo(() => listObjectChildren(value), [value]);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const selected = samePath(path, selectedPath);
  const label = path.length === 0 ? "root" : getRawSegmentName(saveGame, path);

  return (
    <div className="pl-2">
      <div className="flex items-center gap-1">
        {children.length > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="w-5 text-left text-xs opacity-70 hover:opacity-100"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? "v" : ">"}
          </button>
        ) : (
          <span className="w-5 text-xs opacity-40">.</span>
        )}
        <button
          type="button"
          onClick={() => onSelect(path)}
          className={`rounded px-2 py-1 text-left text-xs ${
            selected ? "bg-[var(--accent)] text-black" : "hover:bg-white/10"
          }`}
          title={pathId(path)}
        >
          {label}
        </button>
      </div>

      {expanded && children.length > 0 ? (
        <div className="ml-4 border-l border-white/10 pl-2">
          {children.map((key) => (
            <RawTreeNode
              key={`${pathId(path)}.${key}`}
              saveGame={saveGame}
              path={[...path, key]}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function RawEditorPage() {
  const { hasSave, saveGame, updateRawValue } = useSaveSession();
  const [selectedPath, setSelectedPath] = useState(["header"]);

  const target = useMemo(
    () => getPathValue(saveGame, selectedPath),
    [saveGame, selectedPath]
  );

  const primitiveFields = useMemo(() => {
    if (!isObjectLike(target)) {
      return [];
    }
    return Object.keys(target)
      .map((key) => ({ key, type: getPrimitiveType(target[key]), value: target[key] }))
      .filter((item) => item.type !== null)
      .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
  }, [target]);

  if (!hasSave) {
    return (
      <SaveRequiredPage
        title="Raw Editor"
        description="Load a save first to edit raw object data."
      />
    );
  }

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-white/20 p-4">
        <h1 className="text-2xl font-semibold">Raw Editor</h1>
        <p className="mt-1 text-sm opacity-75">
          Object tree navigation with primitive field editing.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[360px,1fr]">
        <aside className="max-h-[70vh] overflow-auto rounded-xl border border-white/20 p-3">
          <RawTreeNode
            saveGame={saveGame}
            path={[]}
            selectedPath={selectedPath}
            onSelect={setSelectedPath}
            defaultExpanded
          />
        </aside>

        <div className="space-y-3">
          <nav className="rounded-xl border border-white/20 p-3 text-xs">
            <button
              type="button"
              onClick={() => setSelectedPath([])}
              className="rounded px-2 py-1 hover:bg-white/10"
            >
              root
            </button>
            {selectedPath.map((segment, index) => {
              const segmentPath = selectedPath.slice(0, index + 1);
              const label = getRawSegmentName(saveGame, segmentPath) || segment;
              return (
                <span key={`${segment}-${index}`}>
                  <span className="px-1 opacity-50">/</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPath(segmentPath)}
                    className="rounded px-2 py-1 hover:bg-white/10"
                  >
                    {label}
                  </button>
                </span>
              );
            })}
          </nav>

          <section className="rounded-xl border border-white/20 p-4">
            <h2 className="text-lg font-semibold">Primitive Fields</h2>
            {!isObjectLike(target) ? (
              <p className="mt-2 text-sm opacity-80">
                Selected value is not an object. Navigate to an object node to edit fields.
              </p>
            ) : primitiveFields.length === 0 ? (
              <p className="mt-2 text-sm opacity-80">
                No primitive fields on this node.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {primitiveFields.map((field) => (
                  <PrimitiveValueEditor
                    key={field.key}
                    fieldPath={[...selectedPath, field.key]}
                    fieldName={field.key}
                    value={field.value}
                    onCommit={updateRawValue}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
