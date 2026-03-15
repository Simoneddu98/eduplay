"use client";

import { useState, useCallback, createContext, useContext, useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";
import { clsx } from "clsx";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertCircle,
  info:    Info,
};

const COLORS: Record<ToastType, string> = {
  success: "border-green-700 bg-green-900/80 text-green-300",
  error:   "border-red-700 bg-red-900/80 text-red-300",
  warning: "border-amber-700 bg-amber-900/80 text-amber-300",
  info:    "border-blue-700 bg-blue-900/80 text-blue-300",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const toast = useCallback((message: string, type: ToastType = "info", duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message, duration }]);
    if (duration > 0) setTimeout(() => removeToast(id), duration);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              className={clsx(
                "flex items-start gap-3 p-3 rounded-xl border backdrop-blur-sm shadow-xl text-sm font-medium",
                "animate-[fadeInUp_0.2s_ease-out]",
                COLORS[t.type]
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="flex-1">{t.message}</span>
              <button onClick={() => removeToast(t.id)} className="opacity-60 hover:opacity-100" aria-label="Chiudi notifica">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve essere usato dentro ToastProvider");
  return ctx;
}

// Simple standalone Toast export for the index re-export
export const Toast = ToastProvider;
