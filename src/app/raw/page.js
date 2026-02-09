"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaChevronDown, FaChevronRight } from "react-icons/fa6";
import M3GhostButton from "@/components/ui/m3-ghost-button";
import SaveRequiredPage from "@/components/save-required-page";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import {
  getPathValue,
  getPrimitiveType,
  getRawSegmentName,
  isObjectLike,
} from "@/lib/oni/raw-path-utils";

const TREE_CHILD_SCAN_LIMIT = 5000;
const TREE_CHILD_INITIAL_RENDER = 50;
const TREE_CHILD_RENDER_BATCH = 50;
const PRIMITIVE_FIELD_SCAN_LIMIT = 5000;
const PRIMITIVE_FIELD_INITIAL_RENDER = 50;
const PRIMITIVE_FIELD_RENDER_BATCH = 50;
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
    children.push(key);
  });

  if (!Array.isArray(value)) {
    children.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  return {
    children,
    scanTruncated,
    totalObjectChildren,
  };
}

function listPrimitiveFields(value) {
  if (!isObjectLike(value)) {
    return {
      fields: [],
      scanTruncated: false,
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
    fields.push({
      key,
      type,
      value: value[key],
    });
  });

  if (!Array.isArray(value)) {
    fields.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
  }

  return {
    fields,
    scanTruncated,
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

function RawTreeNode({
  saveGame,
  path,
  selectedPath,
  onSelect,
  scrollRootRef,
  defaultExpanded = false,
}) {
  const value = getPathValue(saveGame, path);
  const childInfo = useMemo(() => listObjectChildren(value), [value]);
  const children = childInfo.children;
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [renderedChildrenCount, setRenderedChildrenCount] = useState(TREE_CHILD_INITIAL_RENDER);
  const loadMoreRef = useRef(null);
  const selected = samePath(path, selectedPath);
  const label = path.length === 0 ? "root" : getRawSegmentName(saveGame, path);
  const renderedChildren = useMemo(
    () => children.slice(0, renderedChildrenCount),
    [children, renderedChildrenCount]
  );
  const hasMoreChildren = renderedChildrenCount < children.length;

  useEffect(() => {
    setRenderedChildrenCount((prev) => {
      if (children.length === 0) {
        return TREE_CHILD_INITIAL_RENDER;
      }
      return Math.min(Math.max(prev, TREE_CHILD_INITIAL_RENDER), children.length);
    });
  }, [children.length]);

  const loadMoreChildren = useCallback(() => {
    setRenderedChildrenCount((prev) =>
      Math.min(prev + TREE_CHILD_RENDER_BATCH, children.length)
    );
  }, [children.length]);

  useEffect(() => {
    if (!expanded || !hasMoreChildren || !loadMoreRef.current) {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMoreChildren();
        }
      },
      {
        root: scrollRootRef?.current || null,
        rootMargin: "120px 0px",
        threshold: 0,
      }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [expanded, hasMoreChildren, loadMoreChildren, scrollRootRef]);

  return (
    <div className="pl-2">
      <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-1">
        {children.length > 0 ? (
          <M3GhostButton
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs opacity-75 hover:opacity-100"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <FaChevronDown aria-hidden="true" className="h-2.5 w-2.5" />
            ) : (
              <FaChevronRight aria-hidden="true" className="h-2.5 w-2.5" />
            )}
          </M3GhostButton>
        ) : (
          <span
            className="inline-flex h-5 w-5 items-center justify-center text-[9px] opacity-35"
            aria-hidden="true"
          >
            •
          </span>
        )}
        <M3GhostButton
          onClick={() => onSelect(path)}
          className={`justify-self-start px-2 py-1 text-left text-xs ${
            selected ? "m3-button-ghost-selected" : ""
          }`}
          title={pathId(path)}
        >
          {label}
        </M3GhostButton>
      </div>

      {expanded && children.length > 0 ? (
        <div className="ml-[0.625rem] border-l border-white/10 pl-[0.625rem]">
          {renderedChildren.map((key) => (
            <RawTreeNode
              key={`${pathId(path)}.${key}`}
              saveGame={saveGame}
              path={[...path, key]}
              selectedPath={selectedPath}
              onSelect={onSelect}
              scrollRootRef={scrollRootRef}
            />
          ))}
          {hasMoreChildren ? (
            <div ref={loadMoreRef} className="h-1 w-full" aria-hidden="true" />
          ) : null}
          {hasMoreChildren || childInfo.scanTruncated ? (
            <p className="mt-1 pl-2 text-xs opacity-60">
              Loaded {renderedChildren.length} object children
              {childInfo.totalObjectChildren > 0 ? ` of ${childInfo.totalObjectChildren}` : ""}.
              {childInfo.scanTruncated ? ` Scan capped at ${TREE_CHILD_SCAN_LIMIT} keys.` : ""}
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
  const treeScrollRef = useRef(null);
  const primitiveScrollRef = useRef(null);
  const primitiveLoadMoreRef = useRef(null);

  const target = useMemo(
    () => getPathValue(saveGame, selectedPath),
    [saveGame, selectedPath]
  );

  const primitiveFieldInfo = useMemo(() => listPrimitiveFields(target), [target]);
  const primitiveFields = primitiveFieldInfo.fields;
  const [renderedPrimitiveCount, setRenderedPrimitiveCount] = useState(PRIMITIVE_FIELD_INITIAL_RENDER);
  const renderedPrimitiveFields = useMemo(
    () => primitiveFields.slice(0, renderedPrimitiveCount),
    [primitiveFields, renderedPrimitiveCount]
  );
  const hasMorePrimitiveFields = renderedPrimitiveCount < primitiveFields.length;

  useEffect(() => {
    setRenderedPrimitiveCount(
      Math.min(PRIMITIVE_FIELD_INITIAL_RENDER, primitiveFields.length || PRIMITIVE_FIELD_INITIAL_RENDER)
    );
  }, [primitiveFields.length, selectedPath]);

  const loadMorePrimitiveFields = useCallback(() => {
    setRenderedPrimitiveCount((prev) =>
      Math.min(prev + PRIMITIVE_FIELD_RENDER_BATCH, primitiveFields.length)
    );
  }, [primitiveFields.length]);

  useEffect(() => {
    if (!hasMorePrimitiveFields || !primitiveLoadMoreRef.current) {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMorePrimitiveFields();
        }
      },
      {
        root: primitiveScrollRef.current,
        rootMargin: "120px 0px",
        threshold: 0,
      }
    );
    observer.observe(primitiveLoadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMorePrimitiveFields, loadMorePrimitiveFields]);

  if (!hasSave) {
    return (
      <SaveRequiredPage
        title="Raw Editor"
        description="Load a save first to edit raw object data."
      />
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-4">
      <nav className="shrink-0 rounded-xl border border-white/20 p-3 text-xs">
        <M3GhostButton
          onClick={() => setSelectedPath([])}
          className="px-2 py-1"
        >
          root
        </M3GhostButton>
        {selectedPath.map((segment, index) => {
          const segmentPath = selectedPath.slice(0, index + 1);
          const label = getRawSegmentName(saveGame, segmentPath) || segment;
          return (
            <span key={`${segment}-${index}`}>
              <span className="px-1 opacity-50">/</span>
              <M3GhostButton
                onClick={() => setSelectedPath(segmentPath)}
                className="px-2 py-1"
              >
                {label}
              </M3GhostButton>
            </span>
          );
        })}
      </nav>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside
          ref={treeScrollRef}
          className="h-full min-h-0 overflow-auto rounded-xl border border-white/20 p-3"
        >
          <RawTreeNode
            saveGame={saveGame}
            path={[]}
            selectedPath={selectedPath}
            onSelect={setSelectedPath}
            scrollRootRef={treeScrollRef}
            defaultExpanded
          />
        </aside>

        <section className="flex h-full min-h-0 flex-col rounded-xl border border-white/20 p-4">
          <h2 className="text-lg font-semibold">Primitive Fields</h2>
          <div ref={primitiveScrollRef} className="mt-3 min-h-0 flex-1 overflow-auto">
            {!isObjectLike(target) ? (
              <p className="text-sm opacity-80">
                Selected value is not an object. Navigate to an object node to edit fields.
              </p>
            ) : primitiveFields.length === 0 ? (
              <p className="text-sm opacity-80">
                No primitive fields on this node.
              </p>
            ) : (
              <div className="space-y-2">
                {renderedPrimitiveFields.map((field) => (
                  <PrimitiveValueEditor
                    key={field.key}
                    fieldPath={[...selectedPath, field.key]}
                    fieldName={field.key}
                    value={field.value}
                    onCommit={updateRawValue}
                  />
                ))}
                {hasMorePrimitiveFields ? (
                  <div ref={primitiveLoadMoreRef} className="h-1 w-full" aria-hidden="true" />
                ) : null}
                {hasMorePrimitiveFields || primitiveFieldInfo.scanTruncated ? (
                  <p className="mt-2 text-xs opacity-65">
                    Loaded {renderedPrimitiveFields.length} primitive fields
                    {primitiveFieldInfo.totalPrimitiveFields > 0
                      ? ` of ${primitiveFieldInfo.totalPrimitiveFields}`
                      : ""}.
                    {primitiveFieldInfo.scanTruncated
                      ? ` Scan capped at ${PRIMITIVE_FIELD_SCAN_LIMIT} keys.`
                      : ""}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
