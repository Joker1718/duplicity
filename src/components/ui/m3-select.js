"use client";

import {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FaChevronDown } from "react-icons/fa6";

const M3Select = forwardRef(function M3Select(
  {
    className = "",
    containerClassName = "",
    scrollMode = "auto",
    scrollThreshold = 8,
    children,
    disabled,
    id,
    name,
    value,
    onChange,
    ...props
  },
  ref
) {
  const [open, setOpen] = useState(false);
  const [menuAnimated, setMenuAnimated] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const rootRef = useRef(null);
  const listboxId = id ? `${id}-listbox` : undefined;

  const options = useMemo(
    () =>
      Children.toArray(children)
        .filter((child) => isValidElement(child) && child.type === "option")
        .map((child) => {
          const optionValue =
            child.props?.value !== undefined ? String(child.props.value) : "";
          return {
            value: optionValue,
            label: child.props?.children,
            disabled: Boolean(child.props?.disabled),
          };
        }),
    [children]
  );

  const selectedIndex = useMemo(() => {
    const normalizedValue = value === undefined || value === null ? "" : String(value);
    return options.findIndex((option) => option.value === normalizedValue);
  }, [options, value]);

  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : options[0];
  const shouldScroll = useMemo(() => {
    if (scrollMode === "always") {
      return true;
    }
    if (scrollMode === "never") {
      return false;
    }
    return options.length > scrollThreshold;
  }, [options.length, scrollMode, scrollThreshold]);

  const emitChange = (nextValue) => {
    if (typeof onChange !== "function") {
      return;
    }
    onChange({
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    });
  };

  const closeMenu = () => {
    setOpen(false);
    setHighlightedIndex(-1);
  };

  const openMenu = () => {
    if (disabled || options.length === 0) {
      return;
    }
    setOpen(true);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const moveHighlight = (direction) => {
    if (options.length === 0) {
      return;
    }
    let nextIndex = highlightedIndex;
    if (nextIndex < 0) {
      nextIndex = selectedIndex >= 0 ? selectedIndex : 0;
    }
    for (let attempts = 0; attempts < options.length; attempts += 1) {
      nextIndex = (nextIndex + direction + options.length) % options.length;
      if (!options[nextIndex].disabled) {
        setHighlightedIndex(nextIndex);
        return;
      }
    }
  };

  useEffect(() => {
    if (!open) {
      setMenuAnimated(false);
      return undefined;
    }
    const raf = requestAnimationFrame(() => setMenuAnimated(true));
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        closeMenu();
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const onTriggerKeyDown = (event) => {
    if (disabled) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      moveHighlight(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      moveHighlight(-1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      const option = options[highlightedIndex];
      if (option && !option.disabled) {
        emitChange(option.value);
      }
      closeMenu();
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      closeMenu();
    }
  };

  return (
    <div ref={rootRef} className={`m3-select-wrap relative ${containerClassName}`}>
      <button
        ref={ref}
        type="button"
        id={id}
        name={name}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onTriggerKeyDown}
        disabled={disabled}
        {...props}
        className={`m3-select-trigger m3-field w-full pr-9 text-left focus-visible:outline-none ${className}`}
      >
        <span className="truncate">
          {selectedOption?.label ?? <span className="opacity-60">Select...</span>}
        </span>
      </button>
      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className={`m3-select-menu absolute left-0 top-full z-50 mt-1 w-full overflow-x-hidden rounded-xl border border-[var(--outline)] bg-[var(--surface-container)] p-0 shadow-lg ${
            shouldScroll ? "m3-scrollbar max-h-64 overflow-y-auto" : "overflow-y-hidden"
          }`}
        >
          {options.map((option, index) => {
            const isSelected = index === selectedIndex;
            const isHighlighted = index === highlightedIndex;
            return (
              <button
                key={`${option.value}-${index}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => {
                  if (option.disabled) {
                    return;
                  }
                  emitChange(option.value);
                  closeMenu();
                }}
                className={`m3-select-option flex w-full items-center rounded-none border-b border-white/10 px-3 py-2 text-left text-sm font-normal transition last:border-b-0 ${
                  option.disabled
                    ? "cursor-not-allowed opacity-50"
                    : isHighlighted || isSelected
                      ? "bg-[var(--accent)] text-[#000000]"
                      : "bg-[var(--surface-container)] text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[#000000]"
                }`}
                style={{
                  borderRadius: 0,
                  animationName: menuAnimated ? "m3-select-cascade" : "none",
                  animationDuration: "140ms",
                  animationTimingFunction: "cubic-bezier(0.2, 0.7, 0.2, 1)",
                  animationFillMode: "both",
                  animationDelay: `${index * 5}ms`,
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        <FaChevronDown
          aria-hidden="true"
          className={`h-3.5 w-3.5 text-[var(--accent)] transition-transform ${
            open ? "rotate-180" : ""
          } ${disabled ? "opacity-40" : "opacity-85"}`}
        />
      </span>
    </div>
  );
});

export default M3Select;
