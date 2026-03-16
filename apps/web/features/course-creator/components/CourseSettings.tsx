"use client";

/**
 * CourseSettings — Slide-out panel for course metadata + publish controls.
 *
 * Design: slides in from the right, 400px wide, doesn't cover full screen.
 * Uses controlled state that autosaves via a debounced save function.
 */

import { useState, useCallback } from "react";
import {
  X,
  Upload,
  Globe,
  Lock,
  Award,
  Clock,
  Target,
  Plus,
  Trash2,
  Loader2,
  BookOpen,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import type { AuthoringCourse } from "../types";
import { CategoryInput } from "@/components/ui/CategoryInput";

interface CourseSettingsProps {
  course: AuthoringCourse;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<AuthoringCourse>) => Promise<{ error: string | null }>;
  onPublish: () => Promise<{ error: string | null }>;
  onUnpublish: () => Promise<{ error: string | null }>;
}

// Categories are free-form — managed via CategoryInput

const LEVEL_OPTIONS = [
  { value: "base", label: "Base" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzato" },
];

export function CourseSettings({
  course,
  isOpen,
  onClose,
  onUpdate,
  onPublish,
  onUnpublish,
}: CourseSettingsProps) {
  const [form, setForm] = useState({
    title: course.title,
    description: course.description ?? "",
    category: course.category,
    level: course.level,
    passing_score: course.passing_score,
    certificate_on_completion: course.certificate_on_completion,
  });
  const [objectives, setObjectives] = useState<string[]>(
    course.learning_objectives.length > 0 ? course.learning_objectives : [""]
  );
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    const result = await onUpdate({
      ...form,
      learning_objectives: objectives.filter(Boolean),
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [form, objectives, onUpdate]);

  const handlePublish = useCallback(async () => {
    const lessonCount = course.lessons.length +
      (course.modules?.flatMap((m) => m.lessons ?? []).length ?? 0);

    if (lessonCount === 0) {
      setError("Aggiungi almeno una lezione prima di pubblicare.");
      return;
    }

    setPublishing(true);
    setError(null);
    const result = await onPublish();
    setPublishing(false);
    if (result.error) setError(result.error);
  }, [course, onPublish]);

  const handleUnpublish = useCallback(async () => {
    setPublishing(true);
    const result = await onUnpublish();
    setPublishing(false);
    if (result.error) setError(result.error);
  }, [onUnpublish]);

  const addObjective = () => setObjectives((prev) => [...prev, ""]);
  const updateObjective = (idx: number, value: string) =>
    setObjectives((prev) => prev.map((o, i) => (i === idx ? value : o)));
  const removeObjective = (idx: number) =>
    setObjectives((prev) => prev.filter((_, i) => i !== idx));

  if (!isOpen) return null;

  const isPublished = course.status === "published";

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <aside
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col"
        role="complementary"
        aria-label="Impostazioni corso"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-600" />
            Impostazioni corso
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Chiudi impostazioni"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Publish status banner */}
        <div className={`px-4 py-3 flex items-center gap-2 ${
          isPublished ? "bg-green-50 border-b border-green-100" : "bg-amber-50 border-b border-amber-100"
        }`}>
          {isPublished ? (
            <>
              <Globe className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-800">Pubblicato — visibile ai corsisti</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-800">Bozza — solo tu puoi vederlo</span>
            </>
          )}
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Basic info */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
              Informazioni base
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="course-title">
                  Titolo *
                </label>
                <input
                  id="course-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                  aria-required="true"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="course-desc">
                  Descrizione
                </label>
                <textarea
                  id="course-desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <CategoryInput
                  label="Categoria"
                  value={form.category}
                  onChange={(v) => setForm((f) => ({ ...f, category: v }))}
                  placeholder="Es. Marketing..."
                />
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="course-level">
                    Livello
                  </label>
                  <select
                    id="course-level"
                    value={form.level}
                    onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    {LEVEL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Learning objectives */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              Obiettivi di apprendimento
            </h3>
            <div className="space-y-2">
              {objectives.map((obj, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={obj}
                    onChange={(e) => updateObjective(idx, e.target.value)}
                    placeholder={`Obiettivo ${idx + 1}...`}
                    aria-label={`Obiettivo di apprendimento ${idx + 1}`}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <button
                    onClick={() => removeObjective(idx)}
                    disabled={objectives.length === 1}
                    className="p-1.5 hover:text-red-500 text-gray-400 disabled:opacity-30"
                    aria-label={`Rimuovi obiettivo ${idx + 1}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={addObjective}
                className="text-xs text-purple-600 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Aggiungi obiettivo
              </button>
            </div>
          </section>

          {/* Assessment settings */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              Valutazione
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Soglia di superamento: {form.passing_score}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={form.passing_score}
                  onChange={(e) => setForm((f) => ({ ...f, passing_score: Number(e.target.value) }))}
                  className="w-full accent-purple-600"
                  aria-label="Soglia di superamento"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>0%</span><span>100%</span>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.certificate_on_completion}
                  onChange={(e) => setForm((f) => ({ ...f, certificate_on_completion: e.target.checked }))}
                  className="w-4 h-4 accent-purple-600"
                  aria-label="Certificato al completamento"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">Certificato al completamento</p>
                  <p className="text-xs text-gray-500">I corsisti ricevono un certificato PDF</p>
                </div>
              </label>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 space-y-3">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4 text-green-600" /> : null}
            {saved ? "Salvato!" : "Salva modifiche"}
          </button>

          {isPublished ? (
            <button
              onClick={handleUnpublish}
              disabled={publishing}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-amber-200 text-amber-700 text-sm font-medium rounded-xl hover:bg-amber-50 disabled:opacity-50 transition-all"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Riporta in bozza
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              Pubblica corso
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
