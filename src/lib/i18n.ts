"use client";

import { useCallback, useEffect, useState } from "react";

export type Locale = "es" | "en";

export const LOCALE_STORAGE_KEY = "pulseboard-lang";
export const LOCALE_CHANGE_EVENT = "pulseboard-lang-change";

const es = {
  // Landing
  "landing.cta": "Probar Tablero Demo",
  "landing.secondaryCta": "Ver arquitectura y capacidades",
  "landing.badge":
    "Fractional Indexing O(1) · UI Optimista 0ms · 3 Vistas Sincronizadas",
  "landing.heroTitlePrefix": "Convierte objetivos ambiguos en",
  "landing.heroTitleHighlight": "flujos Kanban accionables",
  "landing.heroDescription":
    "Arrastra tarjetas sin latencia con rollback automático ante errores de red, alterna entre Kanban, Tabla y Calendario al instante, y descompón objetivos con IA estructurada sin configurar API keys.",
  "landing.card1Title": "Drag & Drop 0ms + Rollback",
  "landing.card2Title": "AI Decompose con Zod",
  "landing.card3Title": "Board Insights & 3 Vistas",
  "landing.viewKanbanShort": "Kanban",
  "landing.viewTableShort": "Tabla",
  "landing.viewCalendarShort": "Calendario",

  // BoardWorkspace
  "board.tasksCount": "tareas",
  "board.columnsCount": "columnas",
  "board.aiDecompose": "Desglosar con IA",
  "board.aiInsights": "Board Insights IA",
  "board.newTask": "Nueva Tarea",
  "board.viewKanban": "Vista Kanban",
  "board.viewTable": "Vista Tabla",
  "board.viewCalendar": "Vista Calendario",
  "board.searchAria": "Buscar tareas",
  "board.searchSemanticPlaceholder": "Búsqueda semántica...",
  "board.searchPlaceholder": "Buscar tareas...",
  "board.semanticToggleTitle": "Alternar búsqueda semántica vectorial",
  "board.priorityFilterAria": "Filtrar por prioridad",
  "board.allPriorities": "Todas las prioridades",
  "board.simulateError": "Simular error de red",
  "board.resetDemo": "Reiniciar Datos Demo",
  "board.semanticMatches": "Coincidencias semánticas",
} as const;

export type TranslationKey = keyof typeof es;

const en: Record<TranslationKey, string> = {
  // Landing
  "landing.cta": "Try Demo Board",
  "landing.secondaryCta": "Explore architecture & capabilities",
  "landing.badge":
    "Fractional Indexing O(1) · 0ms Optimistic UI · 3 Synced Views",
  "landing.heroTitlePrefix": "Turn ambiguous goals into",
  "landing.heroTitleHighlight": "actionable Kanban workflows",
  "landing.heroDescription":
    "Drag cards with zero latency and automatic network rollback, switch between Kanban, Table, and Calendar instantly, and break down goals with structured AI without configuring API keys.",
  "landing.card1Title": "0ms Drag & Drop + Rollback",
  "landing.card2Title": "AI Decompose with Zod",
  "landing.card3Title": "Board Insights & 3 Views",
  "landing.viewKanbanShort": "Kanban",
  "landing.viewTableShort": "Table",
  "landing.viewCalendarShort": "Calendar",

  // BoardWorkspace
  "board.tasksCount": "tasks",
  "board.columnsCount": "columns",
  "board.aiDecompose": "AI Decompose",
  "board.aiInsights": "Board Insights AI",
  "board.newTask": "New Task",
  "board.viewKanban": "Kanban View",
  "board.viewTable": "Table View",
  "board.viewCalendar": "Calendar View",
  "board.searchAria": "Search tasks",
  "board.searchSemanticPlaceholder": "Semantic search...",
  "board.searchPlaceholder": "Search tasks...",
  "board.semanticToggleTitle": "Toggle vector semantic search",
  "board.priorityFilterAria": "Filter by priority",
  "board.allPriorities": "All priorities",
  "board.simulateError": "Simulate network error",
  "board.resetDemo": "Reset Demo Data",
  "board.semanticMatches": "Semantic matches",
};

export const translations: Record<Locale, Record<TranslationKey, string>> = {
  es,
  en,
};

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "es";
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return stored === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

export function useLocale(): {
  locale: Locale;
  setLocale: (next: Locale) => void;
  toggleLocale: () => void;
  t: (key: TranslationKey) => string;
} {
  const [locale, setLocaleState] = useState<Locale>("es");

  useEffect(() => {
    const sync = (): void => {
      const next = readStoredLocale();
      setLocaleState(next);
      document.documentElement.lang = next;
    };

    sync();
    window.addEventListener(LOCALE_CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener(LOCALE_CHANGE_EVENT, sync);
    };
  }, []);

  const setLocale = useCallback((next: Locale): void => {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Ignore storage restrictions
    }
    document.documentElement.lang = next;
    setLocaleState(next);
    window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
  }, []);

  const toggleLocale = useCallback((): void => {
    setLocale(locale === "es" ? "en" : "es");
  }, [locale, setLocale]);

  const t = useCallback(
    (key: TranslationKey): string => translations[locale][key],
    [locale],
  );

  return { locale, setLocale, toggleLocale, t };
}
