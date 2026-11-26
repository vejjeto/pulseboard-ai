"use client";

import type { DecomposeResult } from "@/lib/ai-service";
import type { ColumnDTO } from "@/lib/types";
import { CheckCircle2, Loader2, Sparkles, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { PRIORITY_STYLES } from "./ui-helpers";

interface AiDecomposeModalProps {
  open: boolean;
  boardId: string;
  columns: ColumnDTO[];
  onClose: () => void;
  onDecompose: (input: {
    boardId: string;
    goal: string;
    columnId: string;
    persist: boolean;
  }) => Promise<DecomposeResult>;
}

const SAMPLE_GOALS = [
  "Lanzar pasarela de pagos con Stripe",
  "Implementar autenticación OAuth2 y RBAC",
  "Optimizar pipeline RAG con evaluación Zod",
];

export function AiDecomposeModal({
  open,
  boardId,
  columns,
  onClose,
  onDecompose,
}: AiDecomposeModalProps): React.JSX.Element | null {
  const [goal, setGoal] = useState(SAMPLE_GOALS[0]);
  const [columnId, setColumnId] = useState(columns[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const [preview, setPreview] = useState<DecomposeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const targetColId = columnId || columns[0]?.id || "";

  const handleGenerate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const trimmedGoal = goal?.trim() ?? "";
    if (!trimmedGoal) return;
    setLoading(true);
    setError(null);
    try {
      const data = await onDecompose({
        boardId,
        goal: trimmedGoal,
        columnId: targetColId,
        persist: false,
      });
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const handlePersist = async (): Promise<void> => {
    if (!preview) return;
    setPersisting(true);
    setError(null);
    try {
      await onDecompose({
        boardId,
        goal: preview.goal,
        columnId: targetColId,
        persist: true,
      });
      setPreview(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setPersisting(false);
    }
  };

  return (
    <dialog
      open
      aria-label="Desglosar objetivo con IA"
      className="fixed inset-0 z-50 m-0 flex h-full w-full max-w-none items-center justify-center border-0 bg-slate-950/65 p-4 backdrop-blur-xs"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Desglosar objetivo con IA
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Salida JSON validada con Zod + fallback heurístico local sin API
                keys
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal IA"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <form onSubmit={handleGenerate} className="space-y-3">
            <div>
              <label
                htmlFor="ai-decompose-goal"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Objetivo de producto o épica
              </label>
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                <input
                  id="ai-decompose-goal"
                  type="text"
                  required
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Ej: Lanzar pasarela de pagos con Stripe"
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <select
                  aria-label="Columna destino"
                  value={targetColId}
                  onChange={(e) => setColumnId(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      En: {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium text-slate-400">
                Ejemplos:
              </span>
              {SAMPLE_GOALS.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setGoal(sample)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 transition hover:border-violet-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                >
                  {sample}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando plan estructurado...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generar desglose
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/50 dark:text-rose-300">
              {error}
            </div>
          )}

          {preview && (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-bold text-violet-700 dark:text-violet-300">
                  Modo: {preview.mode}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {preview.tasks.length} tareas generadas
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {preview.summary}
              </p>
              <div className="space-y-2.5">
                {preview.tasks.map((item, idx) => (
                  <div
                    key={`${item.title}-${idx}`}
                    className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {item.title}
                      </h3>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLES[item.priority].badge}`}
                        >
                          {item.priority}
                        </span>
                        <span className="font-mono text-xs text-slate-500">
                          {item.estimatedHours}h
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      {item.description}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {item.subtasks.map((sub) => (
                        <li
                          key={sub}
                          className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          {sub}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {preview && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3.5 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              Cerrar
            </button>
            <button
              type="button"
              disabled={persisting}
              onClick={() => void handlePersist()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {persisting
                ? "Insertando..."
                : `Añadir ${preview.tasks.length} tareas al tablero`}
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
