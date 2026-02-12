"use client";

import { useEffect, useState } from "react";
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
  className = "",
  style,
  ...props
}) {
  const parsedSize = Number(size);
  const clampedSize = Number.isFinite(parsedSize) ? Math.max(24, parsedSize) : 56;
  const [isReady, setIsReady] = useState(
    () => typeof window !== "undefined" && Boolean(window.customElements?.get(M3E_LOADING_TAG))
  );

  useEffect(() => {
    let mounted = true;
    ensureM3ELoadingIndicator().then((loaded) => {
      if (mounted && loaded) {
        setIsReady(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const mergedStyle = {
    ...style,
    "--m3e-loading-size": `${clampedSize}px`,
  };

  return (
    <span className={`${styles.root} ${className}`.trim()} style={mergedStyle} {...props}>
      {isReady ? (
        <m3e-loading-indicator variant={variant} />
      ) : (
        <span className={styles.fallback} />
      )}
    </span>
  );
}
