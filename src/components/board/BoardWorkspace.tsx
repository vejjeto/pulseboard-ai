"use client";

import { ThemeToggle } from "@/components/ThemeProvider";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { PRIORITY_VALUES, type Priority } from "@/db/schema";
import type { BoardInsightsResult, DecomposeResult } from "@/lib/ai-service";
import type { BoardPayload, ColumnDTO, SubtaskDTO, TaskDTO } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Kanban,
  Layers,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Table2,
} from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AiDecomposeModal } from "./AiDecomposeModal";
import { AiInsightsDrawer } from "./AiInsightsDrawer";
import { CalendarView } from "./CalendarView";
import { type BoardSnapshot, KanbanView } from "./KanbanView";
import { NewTaskModal } from "./NewTaskModal";
import { TableView } from "./TableView";
import { TaskDetailDrawer } from "./TaskDetailDrawer";
import { ToastBanner, type ToastMessage } from "./ToastBanner";

type ViewMode = "kanban" | "table" | "calendar";

const BOARD_QUERY_KEY = ["board"] as const;

async function fetchBoardPayload(): Promise<BoardPayload> {
  const res = await fetch("/api/board", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("No se pudo cargar el tablero desde SQLite");
  }
  return (await res.json()) as BoardPayload;
}

export function BoardWorkspace(): React.JSX.Element {
  const queryClient = useQueryClient();

  const {
    data: payload = null,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery<BoardPayload>({
    queryKey: BOARD_QUERY_KEY,
    queryFn: fetchBoardPayload,
  });

  const loadError = queryError instanceof Error ? queryError.message : null;

  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [semanticMode, setSemanticMode] = useState(true);
  const [semanticScores, setSemanticScores] = useState<Record<string, number>>(
    {},
  );
  const [semanticEngine, setSemanticEngine] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [simulateError, setSimulateError] = useState(false);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newTaskColId, setNewTaskColId] = useState<string | null>(null);
  const [decomposeOpen, setDecomposeOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((next: Omit<ToastMessage, "id">): void => {
    setToast({ ...next, id: String(Date.now()) });
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!semanticMode || q.length < 2) {
      setSemanticScores({});
      setSemanticEngine(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetch(`/api/tasks/semantic-search?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) return;
          const data = (await res.json()) as {
            mode?: string;
            matches?: Array<{ taskId: string; similarityPercent: number }>;
          };
          const nextScores: Record<string, number> = {};
          for (const match of data.matches ?? []) {
            nextScores[match.taskId] = match.similarityPercent;
          }
          setSemanticScores(nextScores);
          setSemanticEngine(data.mode ?? "Demo Local Vector");
        })
        .catch(() => undefined);
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, semanticMode]);

  const filteredTasks = useMemo(() => {
    if (!payload) return [];
    const q = searchQuery.trim().toLowerCase();
    const hasSemantic =
      semanticMode && q.length >= 2 && Object.keys(semanticScores).length > 0;
    return payload.tasks.filter((task) => {
      if (priorityFilter !== "ALL" && task.priority !== priorityFilter)
        return false;
      if (!q) return true;
      const textMatch =
        task.title.toLowerCase().includes(q) ||
        task.description.toLowerCase().includes(q) ||
        task.labels.some((l) => l.name.toLowerCase().includes(q));
      if (hasSemantic) {
        return textMatch || semanticScores[task.id] !== undefined;
      }
      return textMatch;
    });
  }, [payload, searchQuery, priorityFilter, semanticMode, semanticScores]);

  const allTasksCountByColumn = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!payload) return counts;
    for (const col of payload.columns) counts[col.id] = 0;
    for (const task of payload.tasks) {
      counts[task.columnId] = (counts[task.columnId] ?? 0) + 1;
    }
    return counts;
  }, [payload]);

  const selectedTask = useMemo(
    () => payload?.tasks.find((t) => t.id === selectedTaskId) ?? null,
    [payload, selectedTaskId],
  );

  const handleOptimisticStateChange = useCallback(
    (next: BoardSnapshot): void => {
      queryClient.setQueryData<BoardPayload>(BOARD_QUERY_KEY, (prev) =>
        prev ? { ...prev, columns: next.columns, tasks: next.tasks } : prev,
      );
    },
    [queryClient],
  );

  const moveTaskMutation = useMutation({
    mutationFn: async (vars: {
      taskId: string;
      targetColumnId: string;
      prevTaskId: string | null;
      nextTaskId: string | null;
      snapshot: BoardSnapshot;
    }) => {
      const res = await fetch(`/api/tasks/${vars.taskId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetColumnId: vars.targetColumnId,
          prevTaskId: vars.prevTaskId,
          nextTaskId: vars.nextTaskId,
          simulateError,
        }),
      });
      if (!res.ok) {
        const errJson = (await res.json()) as { error?: string };
        throw new Error(errJson.error ?? "Error al mover la tarjeta");
      }
      return (await res.json()) as { task: TaskDTO; rebalanced: boolean };
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: BOARD_QUERY_KEY });
      return { snapshot: vars.snapshot };
    },
    onSuccess: (result, vars) => {
      if (result.rebalanced) {
        void queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY });
        return;
      }
      queryClient.setQueryData<BoardPayload>(BOARD_QUERY_KEY, (prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) =>
                t.id === vars.taskId ? result.task : t,
              ),
            }
          : prev,
      );
    },
    onError: (err, _vars, context) => {
      if (context?.snapshot) {
        const snap = context.snapshot;
        queryClient.setQueryData<BoardPayload>(BOARD_QUERY_KEY, (prev) =>
          prev ? { ...prev, columns: snap.columns, tasks: snap.tasks } : prev,
        );
      }
      showToast({
        type: "error",
        title: "Rollback aplicado: movimiento no guardado",
        description:
          err instanceof Error
            ? err.message
            : "No se pudo sincronizar el cambio con el servidor.",
        onRetry: () => {
          setSimulateError(false);
          void refetch();
        },
      });
    },
  });

  const moveColumnMutation = useMutation({
    mutationFn: async (vars: {
      columnId: string;
      prevColumnId: string | null;
      nextColumnId: string | null;
      snapshot: BoardSnapshot;
    }) => {
      const res = await fetch(`/api/columns/${vars.columnId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prevColumnId: vars.prevColumnId,
          nextColumnId: vars.nextColumnId,
          simulateError,
        }),
      });
      if (!res.ok) {
        const errJson = (await res.json()) as { error?: string };
        throw new Error(errJson.error ?? "Error al reordenar la columna");
      }
      return (await res.json()) as { column: ColumnDTO; rebalanced: boolean };
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: BOARD_QUERY_KEY });
      return { snapshot: vars.snapshot };
    },
    onSuccess: (result) => {
      if (result.rebalanced) {
        void queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY });
      }
    },
    onError: (err, _vars, context) => {
      if (context?.snapshot) {
        const snap = context.snapshot;
        queryClient.setQueryData<BoardPayload>(BOARD_QUERY_KEY, (prev) =>
          prev ? { ...prev, columns: snap.columns, tasks: snap.tasks } : prev,
        );
      }
      showToast({
        type: "error",
        title: "Rollback aplicado en columnas",
        description:
          err instanceof Error ? err.message : "Fallo de red al mover columna.",
      });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (input: {
      boardId: string;
      columnId: string;
      title: string;
      description: string;
      priority: Priority;
      assigneeId: string | null;
      dueDate: string | null;
      estimatedHours: number | null;
    }) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        throw new Error("No se pudo crear la tarea");
      }
      const { task } = (await res.json()) as { task: TaskDTO };
      return task;
    },
    onSuccess: (task) => {
      queryClient.setQueryData<BoardPayload>(BOARD_QUERY_KEY, (prev) =>
        prev ? { ...prev, tasks: [...prev.tasks, task] } : prev,
      );
      showToast({ type: "success", title: "Tarea creada" });
    },
    onError: () => {
      showToast({ type: "error", title: "No se pudo crear la tarea" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (vars: {
      taskId: string;
      patch: Partial<{
        title: string;
        description: string;
        priority: Priority;
        columnId: string;
        assigneeId: string | null;
        dueDate: string | null;
        estimatedHours: number | null;
        labelIds: string[];
      }>;
    }) => {
      const res = await fetch(`/api/tasks/${vars.taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars.patch),
      });
      if (!res.ok) {
        throw new Error("Error al actualizar la tarea");
      }
      const { task } = (await res.json()) as { task: TaskDTO };
      return task;
    },
    onSuccess: (task, vars) => {
      queryClient.setQueryData<BoardPayload>(BOARD_QUERY_KEY, (prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) => (t.id === vars.taskId ? task : t)),
            }
          : prev,
      );
      showToast({ type: "success", title: "Cambios guardados" });
    },
    onError: () => {
      showToast({ type: "error", title: "Error al actualizar la tarea" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("No se pudo eliminar la tarea");
      }
      return taskId;
    },
    onSuccess: (taskId) => {
      setSelectedTaskId(null);
      queryClient.setQueryData<BoardPayload>(BOARD_QUERY_KEY, (prev) =>
        prev
          ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) }
          : prev,
      );
      showToast({ type: "success", title: "Tarea eliminada" });
    },
    onError: () => {
      showToast({ type: "error", title: "No se pudo eliminar la tarea" });
    },
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: async (vars: {
      taskId: string;
      subtaskId: string;
      completed: boolean;
    }) => {
      const res = await fetch(`/api/subtasks/${vars.subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: vars.completed }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar la subtarea");
      const { subtask } = (await res.json()) as { subtask: SubtaskDTO };
      return subtask;
    },
    onSuccess: (subtask, vars) => {
      queryClient.setQueryData<BoardPayload>(BOARD_QUERY_KEY, (prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) =>
                t.id === vars.taskId
                  ? {
                      ...t,
                      subtasks: t.subtasks.map((s) =>
                        s.id === vars.subtaskId ? subtask : s,
                      ),
                    }
                  : t,
              ),
            }
          : prev,
      );
    },
  });

  const addSubtaskMutation = useMutation({
    mutationFn: async (vars: { taskId: string; title: string }) => {
      const res = await fetch(`/api/tasks/${vars.taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: vars.title }),
      });
      if (!res.ok) throw new Error("No se pudo añadir la subtarea");
      const { subtask } = (await res.json()) as { subtask: SubtaskDTO };
      return subtask;
    },
    onSuccess: (subtask, vars) => {
      queryClient.setQueryData<BoardPayload>(BOARD_QUERY_KEY, (prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) =>
                t.id === vars.taskId
                  ? { ...t, subtasks: [...t.subtasks, subtask] }
                  : t,
              ),
            }
          : prev,
      );
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: async (vars: { taskId: string; subtaskId: string }) => {
      const res = await fetch(`/api/subtasks/${vars.subtaskId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("No se pudo eliminar la subtarea");
      return vars;
    },
    onSuccess: (vars) => {
      queryClient.setQueryData<BoardPayload>(BOARD_QUERY_KEY, (prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) =>
                t.id === vars.taskId
                  ? {
                      ...t,
                      subtasks: t.subtasks.filter(
                        (s) => s.id !== vars.subtaskId,
                      ),
                    }
                  : t,
              ),
            }
          : prev,
      );
    },
  });

  const aiDecomposeMutation = useMutation({
    mutationFn: async (input: {
      boardId: string;
      goal: string;
      columnId: string;
      persist: boolean;
    }) => {
      const res = await fetch("/api/ai/decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(errBody.error ?? "No se pudo desglosar el objetivo");
      }
      return (await res.json()) as DecomposeResult;
    },
    onSuccess: async (_data, vars) => {
      if (vars.persist) {
        await queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY });
        showToast({
          type: "success",
          title: "Tareas generadas añadidas al tablero",
        });
      }
    },
  });

  const aiInsightsMutation = useMutation({
    mutationFn: async (boardId: string) => {
      const res = await fetch("/api/ai/board-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId }),
      });
      if (!res.ok) {
        throw new Error("No se pudieron calcular los insights del tablero");
      }
      return (await res.json()) as BoardInsightsResult;
    },
  });

  const resetDemoMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (!res.ok) throw new Error("Error al reiniciar datos demo");
      return (await res.json()) as BoardPayload;
    },
    onSuccess: (fresh) => {
      queryClient.setQueryData<BoardPayload>(BOARD_QUERY_KEY, fresh);
      setSelectedTaskId(null);
      setSimulateError(false);
      showToast({
        type: "success",
        title: "Tablero demo restaurado",
        description:
          "Se han restablecido las 4 columnas y 12 tareas iniciales.",
      });
    },
    onError: () => {
      showToast({
        type: "error",
        title: "No se pudo reiniciar el tablero demo",
      });
    },
  });

  const { mutate: mutateTaskMove } = moveTaskMutation;
  const { mutate: mutateColumnMove } = moveColumnMutation;
  const { mutateAsync: decomposeGoalAsync } = aiDecomposeMutation;
  const { mutateAsync: loadBoardInsightsAsync } = aiInsightsMutation;

  const handlePersistTaskMove = useCallback(
    (
      taskId: string,
      targetColumnId: string,
      prevTaskId: string | null,
      nextTaskId: string | null,
      snapshot: BoardSnapshot,
    ): void => {
      mutateTaskMove({
        taskId,
        targetColumnId,
        prevTaskId,
        nextTaskId,
        snapshot,
      });
    },
    [mutateTaskMove],
  );

  const handlePersistColumnMove = useCallback(
    (
      columnId: string,
      prevColumnId: string | null,
      nextColumnId: string | null,
      snapshot: BoardSnapshot,
    ): void => {
      mutateColumnMove({
        columnId,
        prevColumnId,
        nextColumnId,
        snapshot,
      });
    },
    [mutateColumnMove],
  );

  const handleCreateTask = async (input: {
    columnId: string;
    title: string;
    description: string;
    priority: Priority;
    assigneeId: string | null;
    dueDate: string | null;
    estimatedHours: number | null;
  }): Promise<void> => {
    if (!payload) return;
    await createTaskMutation
      .mutateAsync({ ...input, boardId: payload.board.id })
      .catch(() => undefined);
  };

  const handleSaveTask = async (
    taskId: string,
    patch: Partial<{
      title: string;
      description: string;
      priority: Priority;
      columnId: string;
      assigneeId: string | null;
      dueDate: string | null;
      estimatedHours: number | null;
      labelIds: string[];
    }>,
  ): Promise<void> => {
    await updateTaskMutation
      .mutateAsync({ taskId, patch })
      .catch(() => undefined);
  };

  const handleDeleteTask = async (taskId: string): Promise<void> => {
    await deleteTaskMutation.mutateAsync(taskId).catch(() => undefined);
  };

  const handleToggleSubtask = async (
    taskId: string,
    subtaskId: string,
    completed: boolean,
  ): Promise<void> => {
    await toggleSubtaskMutation
      .mutateAsync({ taskId, subtaskId, completed })
      .catch(() => undefined);
  };

  const handleAddSubtask = async (
    taskId: string,
    title: string,
  ): Promise<void> => {
    await addSubtaskMutation
      .mutateAsync({ taskId, title })
      .catch(() => undefined);
  };

  const handleDeleteSubtask = async (
    taskId: string,
    subtaskId: string,
  ): Promise<void> => {
    await deleteSubtaskMutation
      .mutateAsync({ taskId, subtaskId })
      .catch(() => undefined);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6">
        <div className="mb-6 h-14 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="h-[460px] animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-900"
            />
          ))}
        </div>
      </div>
    );
  }

  if (loadError || !payload) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-24 text-center">
        <AlertTriangle className="mb-3 h-10 w-10 text-rose-500" />
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">
          Error al cargar FlowMind
        </h1>
        <p className="mt-1 text-sm text-slate-500">{loadError}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Layers className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                FlowMind
              </span>
            </Link>
            <div className="hidden h-5 w-px bg-slate-200 sm:block dark:bg-slate-800" />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-slate-900 sm:text-base dark:text-white">
                {payload.board.title}
              </h1>
              <p className="hidden truncate text-xs text-slate-500 md:block dark:text-slate-400">
                {payload.tasks.length} tareas · {payload.columns.length}{" "}
                columnas
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <HealthBadge />
            <button
              type="button"
              onClick={() => setDecomposeOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-500"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Desglosar con IA
            </button>
            <button
              type="button"
              onClick={() => setInsightsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-100 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-cyan-500/20"
            >
              <Activity className="h-3.5 w-3.5" />
              Board Insights IA
            </button>
            <button
              type="button"
              onClick={() => setNewTaskColId(payload.columns[0]?.id ?? null)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva Tarea
            </button>
            <ThemeToggle />
          </div>
        </div>

        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 sm:px-6 dark:border-slate-800/80">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "kanban"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Table2 className="h-3.5 w-3.5" />
              Tabla
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "calendar"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Calendario
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex items-center gap-1.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="search"
                  aria-label="Buscar tareas"
                  placeholder={
                    semanticMode ? "Búsqueda semántica..." : "Buscar tareas..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-40 rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs focus:border-indigo-500 focus:outline-none sm:w-52 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <button
                type="button"
                onClick={() => setSemanticMode((prev) => !prev)}
                title="Alternar búsqueda semántica vectorial"
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                  semanticMode
                    ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-300"
                    : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                }`}
              >
                <Sparkles className="h-3 w-3" />
                {semanticEngine ?? "Vector"}
              </button>
            </div>

            <select
              aria-label="Filtrar por prioridad"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            >
              <option value="ALL">Todas las prioridades</option>
              {PRIORITY_VALUES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <input
                type="checkbox"
                checked={simulateError}
                onChange={(e) => setSimulateError(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-rose-600"
              />
              <span>Simular error de red</span>
            </label>

            <button
              type="button"
              disabled={resetDemoMutation.isPending}
              onClick={() => resetDemoMutation.mutate()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RotateCcw
                className={`h-3.5 w-3.5 ${resetDemoMutation.isPending ? "animate-spin" : ""}`}
              />
              Reiniciar Datos Demo
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
        {semanticMode &&
          searchQuery.trim().length >= 2 &&
          Object.keys(semanticScores).length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/70 px-3 py-2 text-xs dark:border-violet-500/30 dark:bg-violet-500/10">
              <span className="font-semibold text-violet-700 dark:text-violet-300">
                Coincidencias semánticas (
                {semanticEngine ?? "Demo Local Vector"}):
              </span>
              {filteredTasks
                .filter((t) => semanticScores[t.id] !== undefined)
                .sort(
                  (a, b) =>
                    (semanticScores[b.id] ?? 0) - (semanticScores[a.id] ?? 0),
                )
                .slice(0, 5)
                .map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTaskId(t.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-2 py-1 font-medium text-slate-700 transition hover:border-violet-400 dark:border-violet-500/30 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <span className="max-w-[180px] truncate">{t.title}</span>
                    <span className="rounded bg-violet-600 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                      {semanticScores[t.id]}%
                    </span>
                  </button>
                ))}
            </div>
          )}

        {viewMode === "kanban" && (
          <KanbanView
            columns={payload.columns}
            tasks={filteredTasks}
            allTasksCountByColumn={allTasksCountByColumn}
            onSelectTask={(t) => setSelectedTaskId(t.id)}
            onAddTaskInColumn={(colId) => setNewTaskColId(colId)}
            onOptimisticStateChange={handleOptimisticStateChange}
            onPersistTaskMove={handlePersistTaskMove}
            onPersistColumnMove={handlePersistColumnMove}
          />
        )}

        {viewMode === "table" && (
          <TableView
            columns={payload.columns}
            tasks={filteredTasks}
            onSelectTask={(t) => setSelectedTaskId(t.id)}
            onInlineUpdateTask={(id, patch) => void handleSaveTask(id, patch)}
          />
        )}

        {viewMode === "calendar" && (
          <CalendarView
            columns={payload.columns}
            tasks={filteredTasks}
            onSelectTask={(t) => setSelectedTaskId(t.id)}
          />
        )}
      </main>

      <TaskDetailDrawer
        task={selectedTask}
        columns={payload.columns}
        users={payload.users}
        labels={payload.labels}
        onClose={() => setSelectedTaskId(null)}
        onSaveTask={handleSaveTask}
        onDeleteTask={handleDeleteTask}
        onToggleSubtask={handleToggleSubtask}
        onAddSubtask={handleAddSubtask}
        onDeleteSubtask={handleDeleteSubtask}
      />

      <NewTaskModal
        open={newTaskColId !== null}
        defaultColumnId={newTaskColId ?? payload.columns[0]?.id ?? ""}
        columns={payload.columns}
        users={payload.users}
        onClose={() => setNewTaskColId(null)}
        onCreate={handleCreateTask}
      />

      <AiDecomposeModal
        open={decomposeOpen}
        boardId={payload.board.id}
        columns={payload.columns}
        onClose={() => setDecomposeOpen(false)}
        onDecompose={decomposeGoalAsync}
      />

      <AiInsightsDrawer
        open={insightsOpen}
        boardId={payload.board.id}
        onClose={() => setInsightsOpen(false)}
        onLoadInsights={loadBoardInsightsAsync}
      />

      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
