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

const TREE_CHILD_SCAN_LIMIT = 5000;
const TREE_CHILD_RENDER_LIMIT = 300;
const PRIMITIVE_FIELD_SCAN_LIMIT = 5000;
const PRIMITIVE_FIELD_RENDER_LIMIT = 400;
const MAX_STRING_EDITOR_LENGTH = 5000;

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

function iterateOwnKeys(value, scanLimit, onKey) {
  if (!isObjectLike(value)) {
    return { scanTruncated: false, scanned: 0 };
  }

  let scanned = 0;
  if (Array.isArray(value)) {
    const max = Math.min(value.length, scanLimit);
    for (let index = 0; index < max; index += 1) {
      if (!(index in value)) {
        continue;
      }
      scanned += 1;
      onKey(String(index));
    }
    return {
      scanTruncated: value.length > scanLimit,
      scanned,
    };
  }

  for (const key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      continue;
    }
    scanned += 1;
    if (scanned > scanLimit) {
      return { scanTruncated: true, scanned: scanned - 1 };
    }
    onKey(key);
  }

  return { scanTruncated: false, scanned };
}

function listObjectChildren(value) {
  if (!isObjectLike(value)) {
    return {
      children: [],
      scanTruncated: false,
      renderTruncated: false,
      totalObjectChildren: 0,
    };
  }

  const children = [];
  let totalObjectChildren = 0;

  const { scanTruncated } = iterateOwnKeys(value, TREE_CHILD_SCAN_LIMIT, (key) => {
    if (!isObjectLike(value[key])) {
      return;
    }
    totalObjectChildren += 1;
    if (children.length < TREE_CHILD_RENDER_LIMIT) {
      children.push(key);
    }
  });

  const renderTruncated = totalObjectChildren > children.length;
  if (!Array.isArray(value)) {
    children.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  return {
    children,
    scanTruncated,
    renderTruncated,
    totalObjectChildren,
  };
}

function listPrimitiveFields(value) {
  if (!isObjectLike(value)) {
    return {
      fields: [],
      scanTruncated: false,
      renderTruncated: false,
      totalPrimitiveFields: 0,
    };
  }

  const fields = [];
  let totalPrimitiveFields = 0;

  const { scanTruncated } = iterateOwnKeys(value, PRIMITIVE_FIELD_SCAN_LIMIT, (key) => {
    const type = getPrimitiveType(value[key]);
    if (!type) {
      return;
    }
    totalPrimitiveFields += 1;
    if (fields.length < PRIMITIVE_FIELD_RENDER_LIMIT) {
      fields.push({
        key,
        type,
        value: value[key],
      });
    }
  });

  const renderTruncated = totalPrimitiveFields > fields.length;
  if (!Array.isArray(value)) {
    fields.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
  }

  return {
    fields,
    scanTruncated,
    renderTruncated,
    totalPrimitiveFields,
  };
}

function getDraftValue(value, type) {
  if (type !== "string") {
    return String(value ?? "");
  }
  if (typeof value !== "string") {
    return "";
  }
  if (value.length <= MAX_STRING_EDITOR_LENGTH) {
    return value;
  }
  return value.slice(0, MAX_STRING_EDITOR_LENGTH);
}

function PrimitiveValueEditor({ fieldPath, fieldName, value, onCommit }) {
  const type = getPrimitiveType(value);
  const [draft, setDraft] = useState(() => getDraftValue(value, type));
  const [error, setError] = useState("");
  const isLongString = type === "string" && typeof value === "string" && value.length > MAX_STRING_EDITOR_LENGTH;

  useEffect(() => {
    setDraft(getDraftValue(value, type));
    setError("");
  }, [type, value]);

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
          disabled={isLongString}
          onClick={type === "number" ? commitNumber : () => onCommit(fieldPath, draft)}
          className="rounded-md border border-white/25 px-3 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
        >
          Apply
        </button>
      </div>
      {isLongString ? (
        <p className="mt-2 text-xs text-amber-300">
          String too large to edit safely in UI. Showing first {MAX_STRING_EDITOR_LENGTH} characters.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
    </div>
  );
}

function RawTreeNode({ saveGame, path, selectedPath, onSelect, defaultExpanded = false }) {
  const value = getPathValue(saveGame, path);
  const childInfo = useMemo(() => listObjectChildren(value), [value]);
  const children = childInfo.children;
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
          {childInfo.renderTruncated || childInfo.scanTruncated ? (
            <p className="mt-1 pl-2 text-xs opacity-60">
              Showing first {children.length} object children
              {childInfo.totalObjectChildren > 0 ? ` of ${childInfo.totalObjectChildren}` : ""}.
            </p>
          ) : null}
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

  const primitiveFieldInfo = useMemo(() => listPrimitiveFields(target), [target]);
  const primitiveFields = primitiveFieldInfo.fields;

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
                {primitiveFieldInfo.renderTruncated || primitiveFieldInfo.scanTruncated ? (
                  <p className="mt-2 text-xs opacity-65">
                    Showing first {primitiveFields.length} primitive fields
                    {primitiveFieldInfo.totalPrimitiveFields > 0
                      ? ` of ${primitiveFieldInfo.totalPrimitiveFields}`
                      : ""}{" "}
                    to keep the editor responsive.
                  </p>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
