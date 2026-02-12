"use client";

import Link from "next/link";

function isActive(pathname, href) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function M3NavigationDrawer({
  appName = "Duplicity",
  statusLabel,
  statusText,
  navItems,
  itemBadges,
  pathname,
  hasSave,
  uiVersionLabel,
  t,
}) {
  return (
    <aside className="m3-surface m3-navigation-drawer hidden h-full w-64 overflow-y-auto p-4 md:flex md:flex-col">
      <h1 className="text-lg font-semibold">{appName}</h1>
      <p className="mt-2 text-xs uppercase tracking-wide opacity-70">
        {statusLabel}: {statusText}
      </p>
      <nav className="mt-5" aria-label={t("app.nav.label", { fallback: "Main navigation" })}>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const saveLocked = item.saveRequired && !hasSave;
            const disabled = saveLocked || item.implemented === false;
            const active = isActive(pathname, item.href);
            const badgeValue = itemBadges?.[item.href];
            const showBadge = Number.isFinite(badgeValue);

            if (disabled) {
              return (
                <li key={item.href}>
                  <span
                    className="m3-navigation-drawer-item m3-navigation-drawer-item-disabled block w-full px-3 py-2 text-sm"
                    title={
                      item.implemented === false
                        ? t("app.nav.planned-title", {
                            fallback: "Planned but not implemented in V4 yet.",
                          })
                        : t("app.nav.load-save-first", { fallback: "Load a save first." })
                    }
                    aria-disabled="true"
                  >
                    <span className="flex items-center gap-2">
                      <span className="truncate">{t(item.i18nKey, { fallback: item.fallback })}</span>
                      {showBadge ? (
                        <span className="m3-navigation-drawer-badge" aria-hidden="true">
                          {badgeValue}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </li>
              );
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`m3-navigation-drawer-item block w-full px-3 py-2 text-sm ${
                    active ? "m3-navigation-drawer-item-active" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="truncate">{t(item.i18nKey, { fallback: item.fallback })}</span>
                    {showBadge ? (
                      <span className="m3-navigation-drawer-badge" aria-hidden="true">
                        {badgeValue}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="mt-auto pt-5 text-center text-[10px] tracking-wide opacity-55">{uiVersionLabel}</p>
    </aside>
  );
}
