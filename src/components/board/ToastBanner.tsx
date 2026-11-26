"use client";

import { AlertTriangle, CheckCircle2, RefreshCw, X } from "lucide-react";
import type React from "react";

export interface ToastMessage {
  id: string;
  type: "error" | "success" | "info";
  title: string;
  description?: string;
  onRetry?: () => void;
}

interface ToastBannerProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export function ToastBanner({
  toast,
  onDismiss,
}: ToastBannerProps): React.JSX.Element | null {
  if (!toast) return null;

  const isError = toast.type === "error";
  const isSuccess = toast.type === "success";

  const containerClasses = isError
    ? "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-950/90 dark:text-rose-100"
    : isSuccess
      ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/90 dark:text-emerald-100"
      : "border-indigo-300 bg-indigo-50 text-indigo-900 dark:border-indigo-500/40 dark:bg-indigo-950/90 dark:text-indigo-100";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed bottom-4 right-4 z-50 flex max-w-md items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-md ${containerClasses}`}
    >
      <div className="mt-0.5 shrink-0">
        {isError ? (
          <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-xs opacity-90">{toast.description}</p>
        )}
        {toast.onRetry && (
          <button
            type="button"
            onClick={toast.onRetry}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-rose-500"
          >
            <RefreshCw className="h-3 w-3" />
            Reintentar
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar notificación"
        className="rounded-md p-1 opacity-70 transition hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
