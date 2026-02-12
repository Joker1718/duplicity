"use client";

import { useEffect, useRef, useState } from "react";
import { FaChevronDown } from "react-icons/fa6";

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(" ");
}

export default function M3CollapsibleSection({
  title,
  defaultCollapsed = false,
  expandSignal,
  containerClassName = "",
  headerClassName = "",
  titleClassName = "text-xs font-semibold tracking-wide opacity-75",
  contentWrapperClassName = "",
  contentClassName = "",
  expandedMarginClassName = "mt-2",
  children,
}) {
  const [isCollapsed, setIsCollapsed] = useState(Boolean(defaultCollapsed));
  const lastExpandSignalRef = useRef(expandSignal);

  useEffect(() => {
    if (expandSignal === undefined) {
      return;
    }
    if (lastExpandSignalRef.current === expandSignal) {
      return;
    }
    lastExpandSignalRef.current = expandSignal;
    setIsCollapsed(false);
  }, [expandSignal]);

  return (
    <section className={containerClassName}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        className={joinClassNames("flex cursor-pointer items-center gap-2", headerClassName)}
        onClick={() => setIsCollapsed((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsCollapsed((current) => !current);
          }
        }}
      >
        <h3 className={titleClassName}>{title}</h3>
        <FaChevronDown
          aria-hidden="true"
          className={`ml-auto h-3 w-3 opacity-75 transition-transform duration-200 ease-out ${
            isCollapsed ? "rotate-180" : "rotate-0"
          }`}
        />
      </div>

      <div
        className={joinClassNames(
          "grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-200 ease-out",
          isCollapsed ? "mt-0 grid-rows-[0fr] opacity-0" : `${expandedMarginClassName} grid-rows-[1fr] opacity-100`,
          contentWrapperClassName
        )}
      >
        <div className={joinClassNames("min-h-0", contentClassName)}>{children}</div>
      </div>
    </section>
  );
}
