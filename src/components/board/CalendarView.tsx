"use client";

import type { ColumnDTO, TaskDTO } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { PRIORITY_STYLES } from "./ui-helpers";

interface CalendarViewProps {
  columns: ColumnDTO[];
  tasks: TaskDTO[];
  onSelectTask: (task: TaskDTO) => void;
}

const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function buildCalendarDays(year: number, month: number): Array<string | null> {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<string | null> = [];
  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }
  const mm = String(month + 1).padStart(2, "0");
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dd = String(day).padStart(2, "0");
    cells.push(`${year}-${mm}-${dd}`);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

export function CalendarView({
  columns,
  tasks,
  onSelectTask,
}: CalendarViewProps): React.JSX.Element {
  const now = new Date();
  const [cursor, setCursor] = useState<{ year: number; month: number }>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  const todayIso = now.toISOString().slice(0, 10);
  const cells = useMemo(
    () => buildCalendarDays(cursor.year, cursor.month),
    [cursor],
  );

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskDTO[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const list = map.get(task.dueDate) ?? [];
      list.push(task);
      map.set(task.dueDate, list);
    }
    return map;
  }, [tasks]);

  const unscheduledTasks = useMemo(
    () => tasks.filter((t) => !t.dueDate),
    [tasks],
  );

  const colTitleMap = useMemo(
    () => new Map(columns.map((c) => [c.id, c.title])),
    [columns],
  );

  const goPrevMonth = (): void => {
    setCursor((prev) =>
      prev.month === 0
        ? { year: prev.year - 1, month: 11 }
        : { year: prev.year, month: prev.month - 1 },
    );
  };

  const goNextMonth = (): void => {
    setCursor((prev) =>
      prev.month === 11
        ? { year: prev.year + 1, month: 0 }
        : { year: prev.year, month: prev.month + 1 },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          {MONTH_NAMES[cursor.month]} {cursor.year}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrevMonth}
            aria-label="Mes anterior"
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setCursor({ year: now.getFullYear(), month: now.getMonth() })
            }
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={goNextMonth}
            aria-label="Mes siguiente"
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
            {WEEK_DAYS.map((day) => (
              <div
                key={day}
                className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 dark:divide-slate-800">
            {cells.map((isoDate, idx) => {
              if (!isoDate) {
                return (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: static calendar grid placeholder
                    key={`empty-${idx}`}
                    className="min-h-[112px] bg-slate-50/50 dark:bg-slate-950/30"
                  />
                );
              }
              const dayTasks = tasksByDate.get(isoDate) ?? [];
              const dayNum = Number(isoDate.slice(-2));
              const isToday = isoDate === todayIso;

              return (
                <div key={isoDate} className="min-h-[112px] p-2">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        isToday
                          ? "bg-indigo-600 text-white"
                          : "text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] font-medium text-slate-400">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayTasks.map((task) => {
                      const style = PRIORITY_STYLES[task.priority];
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => onSelectTask(task)}
                          title={`${task.title} (${colTitleMap.get(task.columnId) ?? ""})`}
                          className={`flex w-full items-center gap-1.5 rounded-md border px-1.5 py-1 text-left text-[11px] font-medium transition hover:opacity-85 ${style.badge}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`}
                          />
                          <span className="truncate">{task.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {unscheduledTasks.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Tareas sin fecha asignada ({unscheduledTasks.length})
          </h3>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {unscheduledTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onSelectTask(task)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {task.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
