import type { Priority } from "@/db/schema";

export const PRIORITY_STYLES: Record<
  Priority,
  { badge: string; dot: string; label: string; rank: number }
> = {
  Urgent: {
    badge:
      "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30",
    dot: "bg-rose-500",
    label: "Urgent",
    rank: 0,
  },
  High: {
    badge:
      "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30",
    dot: "bg-amber-500",
    label: "High",
    rank: 1,
  },
  Medium: {
    badge:
      "bg-sky-500/15 text-sky-700 border-sky-500/30 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30",
    dot: "bg-sky-500",
    label: "Medium",
    rank: 2,
  },
  Low: {
    badge:
      "bg-slate-500/15 text-slate-700 border-slate-500/30 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30",
    dot: "bg-slate-400",
    label: "Low",
    rank: 3,
  },
};

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "?";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? first;
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export function isTaskOverdue(
  dueDate: string | null,
  columnTitle?: string,
): boolean {
  if (!dueDate) return false;
  if (columnTitle?.toLowerCase().includes("complet")) return false;
  const todayIso = new Date().toISOString().slice(0, 10);
  return dueDate < todayIso;
}

export function formatShortDate(dueDate: string | null): string {
  if (!dueDate) return "Sin fecha";
  const [year, month, day] = dueDate.split("-");
  if (!year || !month || !day) return dueDate;
  const months = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  const monthIdx = Number(month) - 1;
  return `${Number(day)} ${months[monthIdx] ?? month}`;
}
