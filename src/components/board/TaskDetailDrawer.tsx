"use client";

import { PRIORITY_VALUES, type Priority } from "@/db/schema";
import type { ColumnDTO, LabelDTO, TaskDTO, UserDTO } from "@/lib/types";
import { Check, Plus, Trash2, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

interface TaskDetailDrawerProps {
  task: TaskDTO | null;
  columns: ColumnDTO[];
  users: UserDTO[];
  labels: LabelDTO[];
  onClose: () => void;
  onSaveTask: (
    taskId: string,
    patch: {
      title: string;
      description: string;
      priority: Priority;
      columnId: string;
      assigneeId: string | null;
      dueDate: string | null;
      estimatedHours: number | null;
      labelIds: string[];
    },
  ) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onToggleSubtask: (
    taskId: string,
    subtaskId: string,
    completed: boolean,
  ) => Promise<void>;
  onAddSubtask: (taskId: string, title: string) => Promise<void>;
  onDeleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
}

export function TaskDetailDrawer({
  task,
  columns,
  users,
  labels,
  onClose,
  onSaveTask,
  onDeleteTask,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
}: TaskDetailDrawerProps): React.JSX.Element | null {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [columnId, setColumnId] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [estimatedHours, setEstimatedHours] = useState<string>("");
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description);
    setPriority(task.priority);
    setColumnId(task.columnId);
    setAssigneeId(task.assigneeId ?? "");
    setDueDate(task.dueDate ?? "");
    setEstimatedHours(
      task.estimatedHours !== null ? String(task.estimatedHours) : "",
    );
    setSelectedLabelIds(task.labels.map((l) => l.id));
    setNewSubtaskTitle("");
  }, [task]);

  if (!task) return null;

  const toggleLabel = (labelId: string): void => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId],
    );
  };

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSaveTask(task.id, {
        title: title.trim(),
        description: description.trim(),
        priority,
        columnId,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
        estimatedHours: estimatedHours ? Number(estimatedHours) : null,
        labelIds: selectedLabelIds,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const text = newSubtaskTitle.trim();
    setNewSubtaskTitle("");
    await onAddSubtask(task.id, text);
  };

  return (
    <dialog
      open
      aria-label={`Detalle de tarea ${task.title}`}
      className="fixed inset-0 z-40 m-0 flex h-full w-full max-w-none justify-end border-0 bg-slate-950/50 p-0 backdrop-blur-xs"
    >
      <div className="flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <span className="font-mono text-[11px] text-slate-400">
              {task.id} · pos {task.position.toFixed(1)}
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Detalle de Tarea
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void onDeleteTask(task.id)}
              aria-label="Eliminar tarea"
              className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar panel"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <form
            id="task-detail-form"
            onSubmit={handleSave}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="detail-task-title"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Título
              </label>
              <input
                id="detail-task-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="detail-task-desc"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Descripción
              </label>
              <textarea
                id="detail-task-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="detail-task-col"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Columna
                </label>
                <select
                  id="detail-task-col"
                  value={columnId}
                  onChange={(e) => setColumnId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
                  htmlFor="detail-task-priority"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Prioridad
                </label>
                <select
                  id="detail-task-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
                  htmlFor="detail-task-assignee"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Responsable
                </label>
                <select
                  id="detail-task-assignee"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">Sin asignar</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="detail-task-due"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Entrega
                </label>
                <input
                  id="detail-task-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="detail-task-hours"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Horas est.
                </label>
                <input
                  id="detail-task-hours"
                  type="number"
                  min={0.5}
                  max={200}
                  step={0.5}
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Etiquetas
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {labels.map((lbl) => {
                  const active = selectedLabelIds.includes(lbl.id);
                  return (
                    <button
                      key={lbl.id}
                      type="button"
                      onClick={() => toggleLabel(lbl.id)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                        active
                          ? "border-indigo-500 ring-1 ring-indigo-500"
                          : "border-slate-200 opacity-65 hover:opacity-100 dark:border-slate-700"
                      }`}
                      style={{
                        backgroundColor: `${lbl.color}20`,
                        color: lbl.color,
                      }}
                    >
                      {lbl.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </form>

          <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Checklist de Subtareas (
              {task.subtasks.filter((s) => s.completed).length}/
              {task.subtasks.length})
            </h3>
            <ul className="mt-3 space-y-2">
              {task.subtasks.map((sub) => (
                <li
                  key={sub.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950"
                >
                  <button
                    type="button"
                    onClick={() =>
                      void onToggleSubtask(task.id, sub.id, !sub.completed)
                    }
                    className="flex flex-1 items-center gap-2.5 text-left text-sm"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        sub.completed
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-400 dark:border-slate-600"
                      }`}
                    >
                      {sub.completed && <Check className="h-3 w-3" />}
                    </span>
                    <span
                      className={
                        sub.completed
                          ? "text-slate-400 line-through"
                          : "text-slate-800 dark:text-slate-200"
                      }
                    >
                      {sub.title}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDeleteSubtask(task.id, sub.id)}
                    aria-label={`Eliminar subtarea ${sub.title}`}
                    className="rounded p-1 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>

            <form onSubmit={handleAddSubtask} className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Añadir subtarea..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Añadir
              </button>
            </form>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3.5 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="task-detail-form"
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
