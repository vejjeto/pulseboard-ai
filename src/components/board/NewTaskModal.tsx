"use client";

import { PRIORITY_VALUES, type Priority } from "@/db/schema";
import type { ColumnDTO, UserDTO } from "@/lib/types";
import { AlertTriangle, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

interface DuplicateCandidate {
  taskId: string;
  title: string;
  similarityPercent: number;
}

interface NewTaskModalProps {
  open: boolean;
  defaultColumnId: string;
  columns: ColumnDTO[];
  users: UserDTO[];
  onClose: () => void;
  onCreate: (input: {
    columnId: string;
    title: string;
    description: string;
    priority: Priority;
    assigneeId: string | null;
    dueDate: string | null;
    estimatedHours: number | null;
  }) => Promise<void>;
}

export function NewTaskModal({
  open,
  defaultColumnId,
  columns,
  users,
  onClose,
  onCreate,
}: NewTaskModalProps): React.JSX.Element | null {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [columnId, setColumnId] = useState(defaultColumnId);
  const [priority, setPriority] = useState<Priority>("Medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("4");
  const [submitting, setSubmitting] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);

  useEffect(() => {
    if (open) {
      setColumnId(defaultColumnId || columns[0]?.id || "");
    } else {
      setDuplicates([]);
    }
  }, [open, defaultColumnId, columns]);

  useEffect(() => {
    if (!open) return;
    const cleanTitle = title.trim();
    if (cleanTitle.length < 3) {
      setDuplicates([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetch("/api/tasks/check-duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          title: cleanTitle,
          description: description.trim(),
        }),
      })
        .then(async (res) => {
          if (!res.ok) return;
          const data = (await res.json()) as {
            duplicates?: DuplicateCandidate[];
          };
          setDuplicates(data.duplicates ?? []);
        })
        .catch(() => undefined);
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, title, description]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!title.trim() || !columnId) return;
    setSubmitting(true);
    try {
      await onCreate({
        columnId,
        title: title.trim(),
        description: description.trim(),
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
        estimatedHours: estimatedHours ? Number(estimatedHours) : null,
      });
      setTitle("");
      setDescription("");
      setDueDate("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <dialog
      open
      aria-label="Crear nueva tarea"
      className="fixed inset-0 z-50 m-0 flex h-full w-full max-w-none items-center justify-center border-0 bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Nueva Tarea
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label
              htmlFor="new-task-title"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Título *
            </label>
            <input
              id="new-task-title"
              type="text"
              required
              placeholder="Ej: Implementar caché Redis en sesiones"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {duplicates.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              <div className="mb-1.5 flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Posibles tareas duplicadas detectadas
              </div>
              <ul className="space-y-1">
                {duplicates.map((dup) => (
                  <li
                    key={dup.taskId}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{dup.title}</span>
                    <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold">
                      {dup.similarityPercent}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label
              htmlFor="new-task-desc"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Descripción
            </label>
            <textarea
              id="new-task-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="new-task-col"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Columna
              </label>
              <select
                id="new-task-col"
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="new-task-priority"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Prioridad
              </label>
              <select
                id="new-task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {PRIORITY_VALUES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="new-task-assignee"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Responsable
              </label>
              <select
                id="new-task-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">Opcional</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="new-task-due"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Entrega
              </label>
              <input
                id="new-task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="new-task-hours"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Horas
              </label>
              <input
                id="new-task-hours"
                type="number"
                min={0.5}
                step={0.5}
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting ? "Creando..." : "Crear tarea"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
