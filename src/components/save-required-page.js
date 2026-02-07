"use client";

import Link from "next/link";
import { useSaveSession } from "@/lib/save-session/save-session-context";

export default function SaveRequiredPage({ title, description }) {
  const { hasSave } = useSaveSession();

  if (!hasSave) {
    return (
      <section className="rounded-xl border border-black/10 p-5 dark:border-white/15">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm opacity-80">
          Load a save first using <strong>Load Save</strong> in the top bar.
        </p>
        <p className="mt-3 text-sm opacity-70">
          You can return to <Link href="/" className="underline">Overview</Link> after loading.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-black/10 p-5 dark:border-white/15">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm opacity-80">{description}</p>
      <p className="mt-3 text-sm opacity-70">Migration placeholder: feature port pending.</p>
    </section>
  );
}
