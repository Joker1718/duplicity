import csCommon from "@/translations/cs/common.json";
import csOni from "@/translations/cs/oni.json";
import enCommon from "@/translations/en/common.json";
import enOni from "@/translations/en/oni.json";
import esCommon from "@/translations/es/common.json";
import esOni from "@/translations/es/oni.json";
import ruCommon from "@/translations/ru/common.json";
import ruOni from "@/translations/ru/oni.json";
import zhCommon from "@/translations/zh/common.json";
import zhOni from "@/translations/zh/oni.json";

export const SUPPORTED_LOCALES = ["en", "cs", "es", "ru", "zh"];
export const DEFAULT_LOCALE = "en";

const CATALOG = {
  en: {
    common: enCommon,
    oni: enOni,
  },
  cs: {
    common: csCommon,
    oni: csOni,
  },
  es: {
    common: esCommon,
    oni: esOni,
  },
  ru: {
    common: ruCommon,
    oni: ruOni,
  },
  zh: {
    common: zhCommon,
    oni: zhOni,
  },
};

function getByPath(value, path) {
  if (!value || typeof path !== "string" || path.length === 0) {
    return undefined;
  }
  return path
    .split(".")
    .reduce((acc, segment) => (acc && acc[segment] !== undefined ? acc[segment] : undefined), value);
}

function formatTemplate(template, params) {
  if (typeof template !== "string" || !params || typeof params !== "object") {
    return template;
  }
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}|\{([a-zA-Z0-9_]+)\}/g, (match, mustacheKey, braceKey) => {
    const key = mustacheKey || braceKey;
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      return String(params[key]);
    }
    return match;
  });
}

function resolveMessage(locale, namespace, key) {
  const localeBundle = CATALOG[locale] || CATALOG[DEFAULT_LOCALE];
  const fallbackBundle = CATALOG[DEFAULT_LOCALE];
  const value = getByPath(localeBundle?.[namespace], key);
  if (typeof value === "string") {
    return value;
  }
  const fallbackValue = getByPath(fallbackBundle?.[namespace], key);
  if (typeof fallbackValue === "string") {
    return fallbackValue;
  }
  return undefined;
}

export function translate(locale, key, options = {}) {
  const { ns = "common", params, fallback } = options;
  if (typeof key !== "string" || key.length === 0) {
    return typeof fallback === "string" ? fallback : "";
  }

  let namespace = ns;
  let lookupKey = key;
  const prefixed = key.match(/^([a-zA-Z0-9_-]+):(.*)$/);
  if (prefixed) {
    namespace = prefixed[1];
    lookupKey = prefixed[2];
  }

  const resolved = resolveMessage(locale, namespace, lookupKey);
  if (typeof resolved === "string") {
    return formatTemplate(resolved, params);
  }
  if (typeof fallback === "string") {
    return formatTemplate(fallback, params);
  }
  return formatTemplate(key, params);
}
