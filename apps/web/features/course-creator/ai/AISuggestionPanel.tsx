"use client";

/**
 * AISuggestionPanel — Non-blocking AI assistance drawer.
 *
 * Design: slides in from the right, never covers the editor entirely.
 * The trainer can see their work while AI generates.
 * Generated content can be "inserted" with one click.
 */

import { useState, useCallback } from "react";
import {
  Sparkles,
  X,
  Loader2,
  ChevronRight,
  Copy,
  Check,
  RefreshCw,
  BookOpen,
  HelpCircle,
  FileText,
} from "lucide-react";
import type { AIOutline, QuizQuestion } from "../types";

interface AISuggestionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  // Context from the editor
  courseTitle?: string;
  lessonTitle?: string;
  lessonContent?: string;
  // Callbacks to insert generated content
  onInsertOutline?: (outline: AIOutline) => void;
  onInsertContent?: (html: string) => void;
  onInsertQuiz?: (questions: QuizQuestion[]) => void;
}

type AIMode = "outline" | "content" | "quiz";

interface PanelState {
  mode: AIMode;
  topic: string;
  audience: string;
  durationHours: number;
  numQuestions: number;
  result: AIOutline | { html: string } | QuizQuestion[] | null;
  loading: boolean;
  error: string | null;
  copied: boolean;
}

export function AISuggestionPanel({
  isOpen,
  onClose,
  courseTitle,
  lessonTitle,
  lessonContent,
  onInsertOutline,
  onInsertContent,
  onInsertQuiz,
}: AISuggestionPanelProps) {
  const [state, setState] = useState<PanelState>({
    mode: "outline",
    topic: courseTitle ?? "",
    audience: "",
    durationHours: 2,
    numQuestions: 5,
    result: null,
    loading: false,
    error: null,
    copied: false,
  });

  const update = (partial: Partial<PanelState>) =>
    setState((prev) => ({ ...prev, ...partial }));

  // ─── Generate course outline ────────────────────────────────
  const generateOutline = useCallback(async () => {
    if (!state.topic) return;
    update({ loading: true, error: null, result: null });

    try {
      const res = await fetch("/api/ai/course-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: state.topic,
          audience: state.audience,
          duration_hours: state.durationHours,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      update({ result: json.outline });
    } catch (err) {
      update({ error: err instanceof Error ? err.message : "Errore generazione" });
    } finally {
      update({ loading: false });
    }
  }, [state.topic, state.audience, state.durationHours]);

  // ─── Generate lesson content ────────────────────────────────
  const generateContent = useCallback(async () => {
    update({ loading: true, error: null, result: null });

    try {
      const res = await fetch("/api/ai/lesson-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_title: lessonTitle ?? state.topic,
          course_context: courseTitle,
          audience: state.audience,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      update({ result: { html: json.result.content_html } });
    } catch (err) {
      update({ error: err instanceof Error ? err.message : "Errore generazione" });
    } finally {
      update({ loading: false });
    }
  }, [lessonTitle, courseTitle, state.topic, state.audience]);

  // ─── Generate quiz questions ────────────────────────────────
  const generateQuiz = useCallback(async () => {
    update({ loading: true, error: null, result: null });

    try {
      const res = await fetch("/api/ai/quiz-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_title: lessonTitle ?? state.topic,
          content_text: lessonContent,
          num_questions: state.numQuestions,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      update({ result: json.questions });
    } catch (err) {
      update({ error: err instanceof Error ? err.message : "Errore generazione" });
    } finally {
      update({ loading: false });
    }
  }, [lessonTitle, lessonContent, state.topic, state.numQuestions]);

  const handleGenerate = () => {
    if (state.mode === "outline") generateOutline();
    else if (state.mode === "content") generateContent();
    else generateQuiz();
  };

  const handleInsert = () => {
    if (!state.result) return;
    if (state.mode === "outline" && onInsertOutline) {
      onInsertOutline(state.result as AIOutline);
    } else if (state.mode === "content" && onInsertContent) {
      onInsertContent((state.result as { html: string }).html);
    } else if (state.mode === "quiz" && onInsertQuiz) {
      onInsertQuiz(state.result as QuizQuestion[]);
    }
    onClose();
  };

  if (!isOpen) return null;

  const modeConfig = {
    outline: { icon: BookOpen, label: "Struttura corso", color: "purple" },
    content: { icon: FileText, label: "Contenuto lezione", color: "blue" },
    quiz: { icon: HelpCircle, label: "Domande quiz", color: "green" },
  };

  return (
    <>
      {/* Backdrop — semi-transparent, doesn't block editor */}
      <div
        className="fixed inset-0 bg-black/20 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col"
        role="complementary"
        aria-label="Assistente AI"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-violet-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Assistente AI</p>
              <p className="text-xs text-gray-500">Genera contenuto in secondi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/60 rounded-lg transition-colors"
            aria-label="Chiudi pannello AI"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Mode selector */}
        <div className="flex border-b border-gray-100">
          {(["outline", "content", "quiz"] as AIMode[]).map((mode) => {
            const { icon: Icon, label } = modeConfig[mode];
            return (
              <button
                key={mode}
                onClick={() => update({ mode, result: null, error: null })}
                className={`flex-1 flex flex-col items-center gap-1 p-3 text-xs font-medium transition-colors border-b-2 ${
                  state.mode === mode
                    ? "border-purple-500 text-purple-700 bg-purple-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Form area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {state.mode === "outline" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Argomento del corso *
                </label>
                <input
                  type="text"
                  value={state.topic}
                  onChange={(e) => update({ topic: e.target.value })}
                  placeholder="Es. Email Marketing per e-commerce"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Pubblico target
                </label>
                <input
                  type="text"
                  value={state.audience}
                  onChange={(e) => update({ audience: e.target.value })}
                  placeholder="Es. Responsabili marketing PMI"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Durata stimata: {state.durationHours}h
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={state.durationHours}
                  onChange={(e) => update({ durationHours: Number(e.target.value) })}
                  className="w-full accent-purple-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1h</span><span>10h</span>
                </div>
              </div>
            </>
          )}

          {state.mode === "content" && (
            <div>
              <p className="text-sm text-gray-600 bg-purple-50 p-3 rounded-lg">
                Genera contenuto per: <strong>{lessonTitle ?? "questa lezione"}</strong>
              </p>
              <div className="mt-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Pubblico target
                </label>
                <input
                  type="text"
                  value={state.audience}
                  onChange={(e) => update({ audience: e.target.value })}
                  placeholder="Es. Professionisti con 2-3 anni di esperienza"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>
          )}

          {state.mode === "quiz" && (
            <>
              <p className="text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
                Crea domande quiz per: <strong>{lessonTitle ?? "questa lezione"}</strong>
                {lessonContent && (
                  <span className="block text-xs text-gray-500 mt-1">
                    Basato sul contenuto esistente della lezione
                  </span>
                )}
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Numero domande: {state.numQuestions}
                </label>
                <input
                  type="range"
                  min={3}
                  max={15}
                  value={state.numQuestions}
                  onChange={(e) => update({ numQuestions: Number(e.target.value) })}
                  className="w-full accent-green-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>3</span><span>15</span>
                </div>
              </div>
            </>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={state.loading || (state.mode === "outline" && !state.topic)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {state.loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generazione in corso...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Genera con AI</>
            )}
          </button>

          {/* Error */}
          {state.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {state.error}
              <button
                onClick={() => update({ error: null })}
                className="ml-2 underline text-xs"
              >
                Riprova
              </button>
            </div>
          )}

          {/* Result preview */}
          {state.result && !state.loading && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  Contenuto generato
                </span>
                <button
                  onClick={() => update({ result: null })}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Rigenera"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>

              <div className="p-3 max-h-64 overflow-y-auto text-xs text-gray-700 space-y-2">
                {state.mode === "outline" && (
                  <OutlinePreview outline={state.result as AIOutline} />
                )}
                {state.mode === "content" && (
                  <div
                    className="prose prose-xs max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: (state.result as { html: string }).html,
                    }}
                  />
                )}
                {state.mode === "quiz" && (
                  <QuizPreview questions={state.result as QuizQuestion[]} />
                )}
              </div>

              <div className="p-3 border-t border-gray-100 flex gap-2">
                <button
                  onClick={handleInsert}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  Inserisci nel corso
                </button>
                <button
                  onClick={handleGenerate}
                  className="px-3 py-2 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors"
                  title="Rigenera"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 bg-gray-50">
          <p className="text-[10px] text-gray-400 text-center">
            Contenuto generato da Claude AI · Rivedi sempre prima di pubblicare
          </p>
        </div>
      </aside>
    </>
  );
}

// ─── Sub-components for result previews ─────────────────────

function OutlinePreview({ outline }: { outline: AIOutline }) {
  return (
    <div className="space-y-2">
      <p className="font-semibold text-gray-800">{outline.course_title}</p>
      <p className="text-gray-500">{outline.course_description}</p>
      {outline.modules?.map((mod, i) => (
        <div key={i} className="pl-2 border-l-2 border-purple-200">
          <p className="font-medium text-gray-700">Modulo {i + 1}: {mod.title}</p>
          {mod.lessons?.map((les, j) => (
            <p key={j} className="text-gray-500 pl-2">
              · {les.title} ({les.duration_minutes}min)
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

function QuizPreview({ questions }: { questions: QuizQuestion[] }) {
  return (
    <div className="space-y-3">
      {questions.slice(0, 3).map((q, i) => (
        <div key={i} className="space-y-1">
          <p className="font-medium text-gray-800">
            {i + 1}. {q.text}
          </p>
          {q.options?.slice(0, 2).map((opt) => (
            <p key={opt.id} className={`pl-3 ${q.correct_ids?.includes(opt.id) ? "text-green-700 font-medium" : "text-gray-500"}`}>
              {q.correct_ids?.includes(opt.id) ? "✓" : "·"} {opt.text}
            </p>
          ))}
          {q.options?.length > 2 && (
            <p className="pl-3 text-gray-400">+ {q.options.length - 2} risposte...</p>
          )}
        </div>
      ))}
      {questions.length > 3 && (
        <p className="text-gray-400">+ {questions.length - 3} altre domande...</p>
      )}
    </div>
  );
}
