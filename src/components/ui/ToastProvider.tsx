"use client";

import type React from "react";
import { createContext, useCallback, useContext, useState } from "react";

interface ToastEntry {
  id: string;
  message: string;
  tone: "success" | "error" | "info";
}

interface ToastContextValue {
  pushToast: (message: string, tone?: ToastEntry["tone"]) => void;
}

const ToastContext = createContext<ToastContextValue>({
  pushToast: () => undefined,
});

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

export function ToastProvider({
  children,
}: { children: React.ReactNode }): React.JSX.Element {
  const [items, setItems] = useState<ToastEntry[]>([]);

  const pushToast = useCallback(
    (message: string, tone: ToastEntry["tone"] = "info"): void => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setItems((prev) => [...prev, { id, message, tone }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }, 3500);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      {items.length > 0 && (
        <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border px-3.5 py-2 text-xs font-medium shadow-lg ${
                item.tone === "error"
                  ? "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-950 dark:text-rose-200"
                  : item.tone === "success"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950 dark:text-emerald-200"
                    : "border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              }`}
            >
              {item.message}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
