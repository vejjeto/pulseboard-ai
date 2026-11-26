"use client";

import { Command, FileCode2, Kanban, Layers, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";

const COMMAND_ITEMS = [
  { label: "Ir al Inicio", href: "/", hint: "Landing", icon: Layers },
  {
    label: "Abrir Tablero Kanban",
    href: "/board",
    hint: "Workspace",
    icon: Kanban,
  },
  {
    label: "Tablero Demo 1-Click",
    href: "/demo",
    hint: "Demo",
    icon: Sparkles,
  },
  {
    label: "Documentación OpenAPI",
    href: "/api/docs",
    hint: "API Docs",
    icon: FileCode2,
  },
] as const;

export function CommandPalette(): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) return null;

  const filtered = COMMAND_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const navigate = (href: string): void => {
    setOpen(false);
    setQuery("");
    if (href.startsWith("/api/")) {
      window.location.assign(href);
    } else {
      router.push(href);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 p-4 pt-24 backdrop-blur-xs">
      <button
        type="button"
        aria-label="Cerrar paleta de comandos"
        onClick={() => setOpen(false)}
        className="fixed inset-0 cursor-default"
      />
      <dialog
        open
        aria-label="Paleta de comandos"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-3.5 py-2.5 dark:border-slate-800">
          <Command className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ir a vista o endpoint... (Ctrl+K)"
            className="w-full bg-transparent text-sm text-slate-900 focus:outline-none dark:text-white"
          />
          <kbd className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400 dark:border-slate-700">
            ESC
          </kbd>
        </div>
        <div className="max-h-64 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-slate-400">
              Sin resultados para &ldquo;{query}&rdquo;
            </p>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => navigate(item.href)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-indigo-500" />
                    {item.label}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {item.hint}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </dialog>
    </div>
  );
}
