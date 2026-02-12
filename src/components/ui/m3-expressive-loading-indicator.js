"use client";

import { useEffect } from "react";
import styles from "@/components/ui/m3-expressive-loading-indicator.module.css";

const M3E_LOADING_TAG = "m3e-loading-indicator";
let loadIndicatorModulePromise = null;

function ensureM3ELoadingIndicator() {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }
  if (window.customElements?.get(M3E_LOADING_TAG)) {
    return Promise.resolve(true);
  }
  if (!loadIndicatorModulePromise) {
    loadIndicatorModulePromise = import(
      "@m3e/loading-indicator"
    )
      .then(() => Boolean(window.customElements?.get(M3E_LOADING_TAG)))
      .catch(() => false);
  }
  return loadIndicatorModulePromise;
}

export default function M3ExpressiveLoadingIndicator({
  size = 56,
  variant = "uncontained",
  color = "var(--accent)",
  className = "",
  style,
  ...props
}) {
  const parsedSize = Number(size);
  const clampedSize = Number.isFinite(parsedSize) ? Math.max(24, parsedSize) : 56;

  useEffect(() => {
    ensureM3ELoadingIndicator();
  }, []);

  const mergedStyle = {
    ...style,
    "--m3e-loading-size": `${clampedSize}px`,
    "--m3e-loading-color": color,
  };
  const indicatorStyle = {
    "--m3e-loading-indicator-active-indicator-color": color,
    "--m3e-loading-indicator-contained-active-indicator-color": color,
  };

  return (
    <span className={`${styles.root} ${className}`.trim()} style={mergedStyle} {...props}>
      <m3e-loading-indicator variant={variant} style={indicatorStyle} />
    </span>
  );
}
