"use client";

import { PRIORITY_VALUES, type Priority } from "@/db/schema";
import type { ColumnDTO, TaskDTO } from "@/lib/types";
import {
  type SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Calendar, CheckSquare, Clock } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import {
  PRIORITY_STYLES,
  formatShortDate,
  getInitials,
  isTaskOverdue,
} from "./ui-helpers";

interface TableViewProps {
  columns: ColumnDTO[];
  tasks: TaskDTO[];
  onSelectTask: (task: TaskDTO) => void;
  onInlineUpdateTask: (
    taskId: string,
    patch: { priority?: Priority; columnId?: string },
  ) => void;
}

const columnHelper = createColumnHelper<TaskDTO>();

export function TableView({
  columns,
  tasks,
  onSelectTask,
  onInlineUpdateTask,
}: TableViewProps): React.JSX.Element {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "priority", desc: false },
  ]);

  const columnMap = useMemo(
    () => new Map(columns.map((c) => [c.id, c])),
    [columns],
  );

  const tableColumns = useMemo(
    () => [
      columnHelper.accessor("title", {
        id: "title",
        header: "Tarea",
        cell: (info) => {
          const task = info.row.original;
          return (
            <div>
              <button
                type="button"
                onClick={() => onSelectTask(task)}
                className="text-left font-semibold text-slate-900 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
              >
                {task.title}
              </button>
              {task.labels.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {task.labels.map((lbl) => (
                    <span
                      key={lbl.id}
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
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
            </div>
          );
        },
      }),
      columnHelper.accessor(
        (row) => columnMap.get(row.columnId)?.position ?? 0,
        {
          id: "column",
          header: "Estado",
          cell: (info) => {
            const task = info.row.original;
            return (
              <select
                aria-label={`Estado de ${task.title}`}
                value={task.columnId}
                onChange={(e) =>
                  onInlineUpdateTask(task.id, { columnId: e.target.value })
                }
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            );
          },
        },
      ),
      columnHelper.accessor((row) => PRIORITY_STYLES[row.priority].rank, {
        id: "priority",
        header: "Prioridad",
        cell: (info) => {
          const task = info.row.original;
          return (
            <select
              aria-label={`Prioridad de ${task.title}`}
              value={task.priority}
              onChange={(e) =>
                onInlineUpdateTask(task.id, {
                  priority: e.target.value as Priority,
                })
              }
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[task.priority].badge}`}
            >
              {PRIORITY_VALUES.map((p) => (
                <option
                  key={p}
                  value={p}
                  className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
                >
                  {p}
                </option>
              ))}
            </select>
          );
        },
      }),
      columnHelper.accessor((row) => row.dueDate ?? "9999-99-99", {
        id: "dueDate",
        header: "Entrega",
        cell: (info) => {
          const task = info.row.original;
          const col = columnMap.get(task.columnId);
          const overdue = isTaskOverdue(task.dueDate, col?.title);
          return (
            <span
              className={`inline-flex items-center gap-1 whitespace-nowrap text-xs ${
                overdue
                  ? "font-semibold text-rose-600 dark:text-rose-400"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              {formatShortDate(task.dueDate)}
            </span>
          );
        },
      }),
      columnHelper.accessor((row) => row.estimatedHours ?? 0, {
        id: "estimatedHours",
        header: "Est.",
        cell: (info) => {
          const task = info.row.original;
          return task.estimatedHours !== null ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap font-mono text-xs text-slate-600 dark:text-slate-300">
              <Clock className="h-3.5 w-3.5" />
              {task.estimatedHours}h
            </span>
          ) : (
            <span className="font-mono text-xs text-slate-400">—</span>
          );
        },
      }),
      columnHelper.display({
        id: "progress",
        header: "Progreso",
        cell: (info) => {
          const task = info.row.original;
          const doneSubs = task.subtasks.filter((s) => s.completed).length;
          return task.subtasks.length > 0 ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
              <CheckSquare className="h-3.5 w-3.5 text-indigo-500" />
              {doneSubs}/{task.subtasks.length}
            </span>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          );
        },
      }),
      columnHelper.display({
        id: "assignee",
        header: "Responsable",
        cell: (info) => {
          const task = info.row.original;
          return task.assignee ? (
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: task.assignee.avatarColor }}
              >
                {getInitials(task.assignee.name)}
              </span>
              <span className="text-xs text-slate-700 dark:text-slate-300">
                {task.assignee.name}
              </span>
            </div>
          ) : (
            <span className="whitespace-nowrap text-xs text-slate-400">
              Sin asignar
            </span>
          );
        },
      }),
    ],
    [columns, columnMap, onSelectTask, onInlineUpdateTask],
  );

  const table = useReactTable({
    data: tasks,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
        No hay tareas que coincidan con los filtros actuales.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400"
              >
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  return (
                    <th key={header.id} className="px-4 py-3">
                      {canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="max-w-xs px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
