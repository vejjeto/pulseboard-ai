"use client";

import type { ColumnDTO, TaskDTO } from "@/lib/types";
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, CheckSquare, Clock, GripVertical, Plus } from "lucide-react";
import type React from "react";
import { useMemo, useRef, useState } from "react";
import {
  PRIORITY_STYLES,
  formatShortDate,
  getInitials,
  isTaskOverdue,
} from "./ui-helpers";

export interface BoardSnapshot {
  columns: ColumnDTO[];
  tasks: TaskDTO[];
}

interface KanbanViewProps {
  columns: ColumnDTO[];
  tasks: TaskDTO[];
  allTasksCountByColumn: Record<string, number>;
  onSelectTask: (task: TaskDTO) => void;
  onAddTaskInColumn: (columnId: string) => void;
  onOptimisticStateChange: (next: BoardSnapshot) => void;
  onPersistTaskMove: (
    taskId: string,
    targetColumnId: string,
    prevTaskId: string | null,
    nextTaskId: string | null,
    snapshot: BoardSnapshot,
  ) => void;
  onPersistColumnMove: (
    columnId: string,
    prevColumnId: string | null,
    nextColumnId: string | null,
    snapshot: BoardSnapshot,
  ) => void;
}

function TaskCardContent({
  task,
  columnTitle,
  isDraggingOverlay = false,
}: {
  task: TaskDTO;
  columnTitle?: string;
  isDraggingOverlay?: boolean;
}): React.JSX.Element {
  const priorityStyle = PRIORITY_STYLES[task.priority];
  const completedSubs = task.subtasks.filter((s) => s.completed).length;
  const totalSubs = task.subtasks.length;
  const overdue = isTaskOverdue(task.dueDate, columnTitle);

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition dark:border-slate-800 dark:bg-slate-900 ${
        isDraggingOverlay
          ? "rotate-1 scale-[1.02] border-indigo-400 shadow-2xl ring-2 ring-indigo-500/30"
          : "hover:border-indigo-300 dark:hover:border-indigo-500/50"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${priorityStyle.badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${priorityStyle.dot}`} />
          {priorityStyle.label}
        </span>
        {task.estimatedHours !== null && (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            <Clock className="h-3 w-3" />
            {task.estimatedHours}h
          </span>
        )}
      </div>

      <h3 className="text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
        {task.title}
      </h3>

      {task.labels.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {task.labels.map((lbl) => (
            <span
              key={lbl.id}
              className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor: `${lbl.color}1f`,
                color: lbl.color,
              }}
            >
              {lbl.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
        <div className="flex items-center gap-2.5">
          {task.dueDate && (
            <span
              className={`inline-flex items-center gap-1 ${
                overdue ? "font-semibold text-rose-600 dark:text-rose-400" : ""
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              {formatShortDate(task.dueDate)}
            </span>
          )}
          {totalSubs > 0 && (
            <span className="inline-flex items-center gap-1">
              <CheckSquare className="h-3.5 w-3.5" />
              {completedSubs}/{totalSubs}
            </span>
          )}
        </div>
        {task.assignee && (
          <span
            title={task.assignee.name}
            aria-label={`Asignado a ${task.assignee.name}`}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: task.assignee.avatarColor }}
          >
            {getInitials(task.assignee.name)}
          </span>
        )}
      </div>
    </div>
  );
}

function SortableTaskCard({
  task,
  columnTitle,
  onSelectTask,
}: {
  task: TaskDTO;
  columnTitle: string;
  onSelectTask: (task: TaskDTO) => void;
}): React.JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", task },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelectTask(task)}
      // biome-ignore lint/a11y/useSemanticElements: dnd-kit sortable wrapper requires div
      role="button"
      tabIndex={0}
      aria-label={`Tarea ${task.title}, prioridad ${task.priority}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectTask(task);
        }
      }}
      className="cursor-grab touch-manipulation focus:outline-none focus:ring-2 focus:ring-indigo-500 active:cursor-grabbing rounded-xl"
    >
      <TaskCardContent task={task} columnTitle={columnTitle} />
    </div>
  );
}

function SortableColumn({
  column,
  tasks,
  totalCountInCol,
  onSelectTask,
  onAddTaskInColumn,
}: {
  column: ColumnDTO;
  tasks: TaskDTO[];
  totalCountInCol: number;
  onSelectTask: (task: TaskDTO) => void;
  onAddTaskInColumn: (columnId: string) => void;
}): React.JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: "column", column },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${column.id}`,
    data: { type: "column-container", columnId: column.id },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverWip =
    column.wipLimit !== null && totalCountInCol > column.wipLimit;
  const isAtWip =
    column.wipLimit !== null && totalCountInCol === column.wipLimit;

  return (
    <section
      ref={setNodeRef}
      style={style}
      aria-label={`Columna ${column.title}`}
      className={`flex w-[305px] shrink-0 flex-col rounded-2xl border bg-slate-100/90 p-3 dark:bg-slate-900/60 sm:w-[320px] ${
        isOver
          ? "border-indigo-400 ring-2 ring-indigo-500/20 dark:border-indigo-500"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Reordenar columna ${column.title}`}
            className="cursor-grab rounded p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 active:cursor-grabbing dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <h2 className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
            {column.title}
          </h2>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              isOverWip
                ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                : isAtWip
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {column.wipLimit !== null
              ? `${totalCountInCol}/${column.wipLimit}`
              : totalCountInCol}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onAddTaskInColumn(column.id)}
          aria-label={`Añadir tarea en ${column.title}`}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={setDropRef}
        className="flex min-h-[140px] flex-1 flex-col gap-2.5"
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
              Suelta una tarjeta aquí o pulsa + para crear una nueva
            </div>
          ) : (
            tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                columnTitle={column.title}
                onSelectTask={onSelectTask}
              />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  );
}

export function KanbanView({
  columns,
  tasks,
  allTasksCountByColumn,
  onSelectTask,
  onAddTaskInColumn,
  onOptimisticStateChange,
  onPersistTaskMove,
  onPersistColumnMove,
}: KanbanViewProps): React.JSX.Element {
  const [activeItem, setActiveItem] = useState<
    | { type: "task"; task: TaskDTO }
    | { type: "column"; column: ColumnDTO }
    | null
  >(null);
  const snapshotRef = useRef<BoardSnapshot | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const tasksByColumn = useMemo(() => {
    const map = new Map<string, TaskDTO[]>();
    for (const col of columns) map.set(col.id, []);
    for (const task of tasks) {
      const list = map.get(task.columnId);
      if (list) list.push(task);
    }
    return map;
  }, [columns, tasks]);

  const handleDragStart = (event: DragStartEvent): void => {
    snapshotRef.current = {
      columns: [...columns],
      tasks: [...tasks],
    };
    const data = event.active.data.current as
      | { type: "task"; task: TaskDTO }
      | { type: "column"; column: ColumnDTO }
      | undefined;
    if (data?.type === "task") {
      setActiveItem({ type: "task", task: data.task });
    } else if (data?.type === "column") {
      setActiveItem({ type: "column", column: data.column });
    }
  };

  const resolveOverColumnId = (over: DragOverEvent["over"]): string | null => {
    if (!over) return null;
    const data = over.data.current as
      | { type: "task"; task: TaskDTO }
      | { type: "column"; column: ColumnDTO }
      | { type: "column-container"; columnId: string }
      | undefined;
    if (data?.type === "task") return data.task.columnId;
    if (data?.type === "column") return data.column.id;
    if (data?.type === "column-container") return data.columnId;
    return null;
  };

  const handleDragOver = (event: DragOverEvent): void => {
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current as { type?: string } | undefined;
    if (activeData?.type !== "task") return;

    const activeTaskId = String(active.id);
    const activeTask = tasks.find((t) => t.id === activeTaskId);
    const targetColumnId = resolveOverColumnId(over);
    if (
      !activeTask ||
      !targetColumnId ||
      activeTask.columnId === targetColumnId
    ) {
      return;
    }

    const overData = over.data.current as
      | { type: "task"; task: TaskDTO }
      | undefined;
    const targetTasks = tasks.filter(
      (t) => t.columnId === targetColumnId && t.id !== activeTaskId,
    );
    const otherTasks = tasks.filter(
      (t) => t.columnId !== targetColumnId && t.id !== activeTaskId,
    );

    const insertIdx =
      overData?.type === "task"
        ? Math.max(
            0,
            targetTasks.findIndex((t) => t.id === String(over.id)),
          )
        : targetTasks.length;

    const updatedTask: TaskDTO = { ...activeTask, columnId: targetColumnId };
    const nextTargetTasks = [...targetTasks];
    nextTargetTasks.splice(insertIdx, 0, updatedTask);

    onOptimisticStateChange({
      columns,
      tasks: [...otherTasks, ...nextTargetTasks],
    });
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    const snapshot = snapshotRef.current;
    setActiveItem(null);
    snapshotRef.current = null;

    if (!over || !snapshot) {
      if (snapshot) onOptimisticStateChange(snapshot);
      return;
    }

    const activeData = active.data.current as { type?: string } | undefined;
    if (activeData?.type === "column") {
      const oldIdx = columns.findIndex((c) => c.id === String(active.id));
      const overColId = resolveOverColumnId(over);
      const newIdx = overColId
        ? columns.findIndex((c) => c.id === overColId)
        : -1;
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;

      const reordered = arrayMove(columns, oldIdx, newIdx);
      const movedCol = reordered[newIdx];
      if (!movedCol) return;
      onOptimisticStateChange({ columns: reordered, tasks });
      const prevCol = newIdx > 0 ? reordered[newIdx - 1] : null;
      const nextCol =
        newIdx < reordered.length - 1 ? reordered[newIdx + 1] : null;
      onPersistColumnMove(
        movedCol.id,
        prevCol?.id ?? null,
        nextCol?.id ?? null,
        snapshot,
      );
      return;
    }

    if (activeData?.type === "task") {
      const activeTaskId = String(active.id);
      const currentTask = tasks.find((t) => t.id === activeTaskId);
      if (!currentTask) return;

      const targetColumnId = resolveOverColumnId(over) ?? currentTask.columnId;
      const colTasks = tasks.filter((t) => t.columnId === targetColumnId);
      const oldIdx = colTasks.findIndex((t) => t.id === activeTaskId);
      const overIdx = colTasks.findIndex((t) => t.id === String(over.id));

      const reorderedCol =
        oldIdx !== -1 && overIdx !== -1 && oldIdx !== overIdx
          ? arrayMove(colTasks, oldIdx, overIdx)
          : colTasks;

      if (reorderedCol !== colTasks) {
        const otherTasks = tasks.filter((t) => t.columnId !== targetColumnId);
        onOptimisticStateChange({
          columns,
          tasks: [...otherTasks, ...reorderedCol],
        });
      }

      const finalIdx = reorderedCol.findIndex((t) => t.id === activeTaskId);
      const prevTask = finalIdx > 0 ? reorderedCol[finalIdx - 1] : null;
      const nextTask =
        finalIdx < reorderedCol.length - 1 ? reorderedCol[finalIdx + 1] : null;

      onPersistTaskMove(
        activeTaskId,
        targetColumnId,
        prevTask?.id ?? null,
        nextTask?.id ?? null,
        snapshot,
      );
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-scroll flex gap-4 overflow-x-auto pb-4">
        <SortableContext
          items={columns.map((c) => c.id)}
          strategy={horizontalListSortingStrategy}
        >
          {columns.map((col) => (
            <SortableColumn
              key={col.id}
              column={col}
              tasks={tasksByColumn.get(col.id) ?? []}
              totalCountInCol={allTasksCountByColumn[col.id] ?? 0}
              onSelectTask={onSelectTask}
              onAddTaskInColumn={onAddTaskInColumn}
            />
          ))}
        </SortableContext>
      </div>

      <DragOverlay>
        {activeItem?.type === "task" ? (
          <div className="w-[300px]">
            <TaskCardContent task={activeItem.task} isDraggingOverlay />
          </div>
        ) : activeItem?.type === "column" ? (
          <div className="w-[300px] rounded-2xl border border-indigo-400 bg-white/95 p-4 shadow-2xl dark:bg-slate-900/95">
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {activeItem.column.title}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
