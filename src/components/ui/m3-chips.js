function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(" ");
}

function normalizeTitle(value) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function M3Chip({ as: Component = "span", label, title, className = "", ...props }) {
  return (
    <Component
      title={normalizeTitle(title)}
      className={joinClassNames(
        "m3-chip inline-flex cursor-default items-center gap-1.5 !rounded-md px-2.5 py-1 text-xs transition-colors hover:bg-[var(--state-hover)]",
        className
      )}
      {...props}
    >
      {label}
    </Component>
  );
}

export default function M3Chips({
  items = [],
  getItemKey,
  getItemLabel,
  getItemTitle,
  className = "",
  chipClassName = "",
  emptyLabel = null,
  emptyClassName = "",
}) {
  const list = Array.isArray(items) ? items : [];

  if (list.length === 0) {
    if (emptyLabel === null || emptyLabel === undefined) {
      return null;
    }
    return <span className={emptyClassName}>{emptyLabel}</span>;
  }

  return (
    <span className={className}>
      {list.map((item, index) => (
        <M3Chip
          key={typeof getItemKey === "function" ? getItemKey(item, index) : index}
          label={
            typeof getItemLabel === "function"
              ? getItemLabel(item, index)
              : String(item)
          }
          title={typeof getItemTitle === "function" ? getItemTitle(item, index) : undefined}
          className={chipClassName}
        />
      ))}
    </span>
  );
}
