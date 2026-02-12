"use client";

import Link from "next/link";

const BASE_CLASS =
  "m3-button m3-button-outlined inline-flex items-center justify-center";

export default function M3OutlinedButton({
  href,
  type = "button",
  className = "",
  children,
  ...props
}) {
  const mergedClassName = `${BASE_CLASS} ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={mergedClassName} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={mergedClassName} {...props}>
      {children}
    </button>
  );
}
