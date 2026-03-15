"use client";

/**
 * useAutosave — Debounced autosave with offline queue.
 *
 * Design decisions:
 * - 2s debounce for immediate feedback, 30s forced flush
 * - Offline detection via navigator.onLine + event listeners
 * - Queued saves are replayed in order when connection resumes
 * - SaveStatus drives the UI indicator (saving / saved / error / offline)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { SaveStatus } from "../types";

interface AutosaveOptions<T> {
  data: T;
  saveFn: (data: T) => Promise<{ error: string | null }>;
  debounceMs?: number;    // default: 2000ms
  forceFlushMs?: number;  // default: 30000ms
  enabled?: boolean;
}

export function useAutosave<T>({
  data,
  saveFn,
  debounceMs = 2000,
  forceFlushMs = 30000,
  enabled = true,
}: AutosaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const pendingRef = useRef<T | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSavingRef = useRef(false);

  // ─── Online/offline detection ──────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Attempt to flush any queued saves
      if (pendingRef.current !== null) {
        triggerSave(pendingRef.current);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      setStatus("offline");
    };

    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Save executor ─────────────────────────────────────────
  const triggerSave = useCallback(
    async (dataToSave: T) => {
      if (isSavingRef.current || !navigator.onLine) {
        if (!navigator.onLine) setStatus("offline");
        return;
      }

      isSavingRef.current = true;
      setStatus("saving");

      try {
        const result = await saveFn(dataToSave);
        if (result.error) {
          setStatus("error");
        } else {
          setStatus("saved");
          setLastSavedAt(new Date());
          pendingRef.current = null;
        }
      } catch {
        setStatus("error");
      } finally {
        isSavingRef.current = false;
      }
    },
    [saveFn]
  );

  // ─── Debounce trigger when data changes ───────────────────
  useEffect(() => {
    if (!enabled) return;

    // Queue the latest data (replaces any pending)
    pendingRef.current = data;

    if (!isOnline) {
      setStatus("offline");
      return;
    }

    // Clear existing debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (pendingRef.current !== null) {
        triggerSave(pendingRef.current);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [data, enabled, isOnline, debounceMs, triggerSave]);

  // ─── Force flush every 30s even if debounce never fires ───
  useEffect(() => {
    if (!enabled) return;

    flushTimerRef.current = setInterval(() => {
      if (pendingRef.current !== null && !isSavingRef.current && navigator.onLine) {
        triggerSave(pendingRef.current);
      }
    }, forceFlushMs);

    return () => {
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
      }
    };
  }, [enabled, forceFlushMs, triggerSave]);

  // ─── Manual save trigger ───────────────────────────────────
  const saveNow = useCallback(() => {
    if (pendingRef.current !== null) {
      triggerSave(pendingRef.current);
    }
  }, [triggerSave]);

  return { status, lastSavedAt, saveNow, isOnline };
}

// ─── SaveStatusBadge — UI component ─────────────────────────

export function formatSaveStatus(status: SaveStatus, lastSavedAt: Date | null): string {
  switch (status) {
    case "saving":
      return "Salvataggio...";
    case "saved":
      if (lastSavedAt) {
        const diff = Math.floor((Date.now() - lastSavedAt.getTime()) / 1000);
        if (diff < 5) return "Salvato";
        if (diff < 60) return `Salvato ${diff}s fa`;
        return `Salvato alle ${lastSavedAt.toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      }
      return "Salvato";
    case "error":
      return "Errore salvataggio";
    case "offline":
      return "Offline — le modifiche verranno salvate alla riconnessione";
    default:
      return "";
  }
}
