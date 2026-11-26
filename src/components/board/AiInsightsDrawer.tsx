"use client";

import type { BoardInsightsResult } from "@/lib/ai-service";
import {
  Activity,
  AlertTriangle,
  Clock,
  Flame,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

interface AiInsightsDrawerProps {
  open: boolean;
  boardId: string;
  onClose: () => void;
  onLoadInsights: (boardId: string) => Promise<BoardInsightsResult>;
}

export function AiInsightsDrawer({
  open,
  boardId,
  onClose,
  onLoadInsights,
}: AiInsightsDrawerProps): React.JSX.Element | null {
  const [insights, setInsights] = useState<BoardInsightsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInsights = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await onLoadInsights(boardId);
      setInsights(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }, [boardId, onLoadInsights]);

  useEffect(() => {
    if (open) {
      void loadInsights();
    }
  }, [open, loadInsights]);

  if (!open) return null;

  return (
    <dialog
      open
      aria-label="Board Insights IA"
      className="fixed inset-0 z-40 m-0 flex h-full w-full max-w-none justify-end border-0 bg-slate-950/50 p-0 backdrop-blur-xs"
    >
      <div className="flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Board Insights IA
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Salud del flujo, límites WIP y cuellos de botella en vivo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void loadInsights()}
              aria-label="Recalcular insights"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar insights"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && !insights ? (
            <div className="flex flex-col items-center justify-center py-16 text-sm text-slate-500">
              <Loader2 className="mb-3 h-7 w-7 animate-spin text-indigo-500" />
              Analizando métricas del tablero...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/50 dark:text-rose-200">
              {error}
            </div>
          ) : insights ? (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-xs font-bold text-cyan-700 dark:text-cyan-300">
                    Modo: {insights.mode}
                  </span>
                  <span className="font-mono text-lg font-extrabold text-slate-900 dark:text-white">
                    Health {insights.healthScore}/100
                  </span>
                </div>
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all ${
                      insights.healthScore >= 75
                        ? "bg-emerald-500"
                        : insights.healthScore >= 50
                          ? "bg-amber-500"
                          : "bg-rose-500"
                    }`}
                    style={{ width: `${insights.healthScore}%` }}
                  />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {insights.summary}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500">Total</div>
                  <div className="mt-0.5 text-lg font-bold">
                    {insights.metrics.totalTasks}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500">Completadas</div>
                  <div className="mt-0.5 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {insights.metrics.completedTasks}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500">Horas rest.</div>
                  <div className="mt-0.5 font-mono text-lg font-bold">
                    {insights.metrics.totalEstimatedHoursRemaining}h
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500">Urgent/High</div>
                  <div className="mt-0.5 text-lg font-bold text-rose-600 dark:text-rose-400">
                    {insights.metrics.urgentOrHighOpen}
                  </div>
                </div>
              </div>

              {insights.overloadedColumns.length > 0 && (
                <section className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    Columnas sobrecargadas
                  </h3>
                  {insights.overloadedColumns.map((col) => (
                    <div
                      key={col.columnId}
                      className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50/70 px-3.5 py-2.5 text-sm dark:border-amber-500/30 dark:bg-amber-950/30"
                    >
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {col.title}
                      </span>
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        {col.reason}
                      </span>
                    </div>
                  ))}
                </section>
              )}

              {insights.priorityBottlenecks.length > 0 && (
                <section className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    <Flame className="h-4 w-4" />
                    Cuellos de botella por prioridad
                  </h3>
                  {insights.priorityBottlenecks.map((bn) => (
                    <div
                      key={`${bn.columnTitle}-${bn.priority}`}
                      className="rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-2.5 text-xs dark:border-rose-500/30 dark:bg-rose-950/30"
                    >
                      <strong>{bn.count}</strong> tareas{" "}
                      <strong>{bn.priority}</strong> concentradas en{" "}
                      <strong>{bn.columnTitle}</strong>
                    </div>
                  ))}
                </section>
              )}

              {(insights.overdueTasks.length > 0 ||
                insights.dueSoonTasks.length > 0) && (
                <section className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    <Clock className="h-4 w-4" />
                    Riesgos de fecha ({insights.overdueTasks.length} vencidas ·{" "}
                    {insights.dueSoonTasks.length} próximas)
                  </h3>
                  <div className="space-y-1.5">
                    {insights.overdueTasks.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-2 text-xs dark:border-rose-500/30 dark:bg-rose-950/20"
                      >
                        <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                          {t.title}
                        </span>
                        <span className="ml-2 shrink-0 font-semibold text-rose-600 dark:text-rose-400">
                          -{t.daysOverdue}d ({t.dueDate})
                        </span>
                      </div>
                    ))}
                    {insights.dueSoonTasks.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950"
                      >
                        <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                          {t.title}
                        </span>
                        <span className="ml-2 shrink-0 font-medium text-amber-600 dark:text-amber-400">
                          en {t.daysRemaining}d ({t.dueDate})
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Recomendaciones accionables
                </h3>
                <ul className="space-y-2">
                  {insights.recommendations.map((rec) => (
                    <li
                      key={rec}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                    >
                      {rec}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
