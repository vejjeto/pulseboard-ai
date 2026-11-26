"use client";

import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeProvider";
import { useLocale } from "@/lib/i18n";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Kanban,
  Layers,
  ShieldAlert,
  Sparkles,
  Table2,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type React from "react";

export default function HomePage(): React.JSX.Element {
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/20">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/30">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                FlowMind
              </span>
              <span className="ml-1.5 rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Kanban AI
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <LanguageToggle />
            <ThemeToggle />
            <Link
              href="/board"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              {t("landing.cta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" />
            {t("landing.badge")}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            {t("landing.heroTitlePrefix")}{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent dark:from-indigo-400 dark:to-cyan-300">
              {t("landing.heroTitleHighlight")}
            </span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
            {t("landing.heroDescription")}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/board"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 sm:w-auto"
            >
              {t("landing.cta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#preview"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t("landing.secondaryCta")}
            </a>
          </div>
        </section>

        <section id="preview" className="mt-16 grid gap-6 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Zap className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t("landing.card1Title")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Posicionamiento fraccional (paso{" "}
              <code className="font-mono">1024</code>) que actualiza una sola
              fila SQLite por movimiento y revierte el estado en UI si falla la
              red.
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between font-medium text-slate-700 dark:text-slate-300">
                <span>En Desarrollo · WIP 4/3</span>
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-600 dark:text-amber-400">
                  Excede WIP
                </span>
              </div>
              <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    Motor Fractional Indexing
                  </span>
                  <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                    Urgent
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  pos: 1536 · 2/3 subtareas
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t("landing.card2Title")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Escribe un objetivo como{" "}
              <em>&ldquo;Lanzar pasarela de pagos con Stripe&rdquo;</em> y obtén
              4–6 tareas con subtareas, prioridad y horas estimadas validadas
              con Zod.
            </p>
            <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-violet-600 dark:text-violet-400">
                  Demo AI local / LLM
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  5 tareas
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Webhook firmado e idempotente (6h)
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Endpoint POST /api/billing/checkout (5h)
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t("landing.card3Title")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Diagnostica columnas sobrecargadas, tareas vencidas y cuellos de
              prioridad mientras alternas entre Kanban, Tabla y Calendario sobre
              un mismo estado.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <div className="flex flex-col items-center gap-1 rounded-lg bg-white p-2 shadow-sm dark:bg-slate-900">
                <Kanban className="h-4 w-4 text-indigo-500" />
                {t("landing.viewKanbanShort")}
              </div>
              <div className="flex flex-col items-center gap-1 rounded-lg bg-white p-2 shadow-sm dark:bg-slate-900">
                <Table2 className="h-4 w-4 text-cyan-500" />
                {t("landing.viewTableShort")}
              </div>
              <div className="flex flex-col items-center gap-1 rounded-lg bg-white p-2 shadow-sm dark:bg-slate-900">
                <CalendarDays className="h-4 w-4 text-emerald-500" />
                {t("landing.viewCalendarShort")}
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
