"use client";

import { useLocale } from "@/lib/i18n";
import { Globe } from "lucide-react";
import type React from "react";

export function LanguageToggle(): React.JSX.Element {
  const { locale, toggleLocale } = useLocale();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label="Cambiar idioma (ES/EN)"
      title={locale === "es" ? "Switch to English" : "Cambiar a Español"}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      <Globe className="h-3.5 w-3.5" />
      <span>{locale.toUpperCase()}</span>
    </button>
  );
}
