"use client";

import type React from "react";
import { useEffect, useState } from "react";

interface HealthState {
  status: "ok" | "error" | "loading";
  dbLatencyMs?: number;
}

export function HealthBadge(): React.JSX.Element {
  const [health, setHealth] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    const check = async (): Promise<void> => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (!res.ok) throw new Error("unhealthy");
        const data = (await res.json()) as { dbLatencyMs?: number };
        if (active) {
          setHealth({
            status: "ok",
            ...(typeof data.dbLatencyMs === "number"
              ? { dbLatencyMs: data.dbLatencyMs }
              : {}),
          });
        }
      } catch {
        if (active) setHealth({ status: "error" });
      }
    };
    void check();
    return () => {
      active = false;
    };
  }, []);

  const dotClass =
    health.status === "ok"
      ? "bg-emerald-500"
      : health.status === "error"
        ? "bg-rose-500"
        : "bg-amber-400 animate-pulse";

  return (
    <span
      title="Estado del servicio y latencia DB"
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
    >
      <span className={`h-2 w-2 rounded-full ${dotClass}`} />
      <span>
        {health.status === "ok"
          ? `API OK${health.dbLatencyMs !== undefined ? ` · ${health.dbLatencyMs}ms` : ""}`
          : health.status === "error"
            ? "API Offline"
            : "Checking..."}
      </span>
    </span>
  );
}
