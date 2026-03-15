"use client";

/**
 * QuizBlock — Quiz question builder with AI generation.
 *
 * This is the most complex block. Trainers can:
 * 1. Add questions manually (click + type)
 * 2. Generate questions from lesson content via AI
 * 3. Reorder questions
 * 4. Set pass threshold
 */

import { useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  Check,
  X,
  Sparkles,
  Loader2,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { nanoid } from "nanoid";
import type { QuizBlock as QuizBlockType, QuizQuestion, QuizOption } from "../types";

interface QuizBlockProps {
  block: QuizBlockType;
  isEditing: boolean;
  onChange: (block: QuizBlockType) => void;
  lessonTitle?: string;
  lessonContent?: string;
}

const QUESTION_TYPES = [
  { value: "single", label: "Risposta singola" },
  { value: "multiple", label: "Risposte multiple" },
  { value: "true_false", label: "Vero / Falso" },
] as const;

export function QuizBlock({
  block,
  isEditing,
  onChange,
  lessonTitle,
  lessonContent,
}: QuizBlockProps) {
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const updateContent = useCallback(
    (updates: Partial<QuizBlockType["content"]>) => {
      onChange({ ...block, content: { ...block.content, ...updates } });
    },
    [block, onChange]
  );

  const addQuestion = () => {
    const newQ: QuizQuestion = {
      id: nanoid(8),
      text: "",
      type: "single",
      options: [
        { id: "a", text: "" },
        { id: "b", text: "" },
        { id: "c", text: "" },
        { id: "d", text: "" },
      ],
      correct_ids: [],
      explanation: "",
    };
    const questions = [...block.content.questions, newQ];
    updateContent({ questions });
    setExpandedQuestion(newQ.id);
  };

  const updateQuestion = (id: string, updates: Partial<QuizQuestion>) => {
    const questions = block.content.questions.map((q) =>
      q.id === id ? { ...q, ...updates } : q
    );
    updateContent({ questions });
  };

  const deleteQuestion = (id: string) => {
    const questions = block.content.questions.filter((q) => q.id !== id);
    updateContent({ questions });
    if (expandedQuestion === id) setExpandedQuestion(null);
  };

  const addOption = (questionId: string) => {
    const id = String.fromCharCode(97 + (block.content.questions.find((q) => q.id === questionId)?.options.length ?? 0));
    updateQuestion(questionId, {
      options: [
        ...(block.content.questions.find((q) => q.id === questionId)?.options ?? []),
        { id, text: "" },
      ],
    });
  };

  const toggleCorrect = (question: QuizQuestion, optionId: string) => {
    if (question.type === "single" || question.type === "true_false") {
      updateQuestion(question.id, { correct_ids: [optionId] });
    } else {
      const already = question.correct_ids.includes(optionId);
      updateQuestion(question.id, {
        correct_ids: already
          ? question.correct_ids.filter((id) => id !== optionId)
          : [...question.correct_ids, optionId],
      });
    }
  };

  const setQuestionType = (question: QuizQuestion, type: QuizQuestion["type"]) => {
    const options =
      type === "true_false"
        ? [{ id: "t", text: "Vero" }, { id: "f", text: "Falso" }]
        : question.options.length >= 2
        ? question.options
        : [
            { id: "a", text: "" },
            { id: "b", text: "" },
            { id: "c", text: "" },
            { id: "d", text: "" },
          ];
    updateQuestion(question.id, { type, options, correct_ids: [] });
  };

  const generateWithAI = async () => {
    setGeneratingAI(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/quiz-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_title: lessonTitle ?? "Lezione",
          content_text: lessonContent,
          num_questions: 5,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const questions = [
        ...block.content.questions,
        ...(json.questions as QuizQuestion[]),
      ];
      updateContent({ questions });
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Errore generazione");
    } finally {
      setGeneratingAI(false);
    }
  };

  // ─── Read-only view ─────────────────────────────────────────
  if (!isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
          <Check className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-800 font-medium">
            Quiz — {block.content.questions.length} domande · Soglia: {block.content.pass_threshold}%
          </span>
        </div>
        {block.content.questions.slice(0, 2).map((q, i) => (
          <div key={q.id} className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-800">{i + 1}. {q.text || "Domanda senza testo"}</p>
          </div>
        ))}
        {block.content.questions.length > 2 && (
          <p className="text-xs text-gray-400 text-center">
            +{block.content.questions.length - 2} altre domande...
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quiz settings */}
      <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Soglia superamento: {block.content.pass_threshold}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={block.content.pass_threshold}
            onChange={(e) => updateContent({ pass_threshold: Number(e.target.value) })}
            className="w-full accent-purple-600"
            aria-label="Soglia superamento quiz"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={block.content.show_correct_answers}
            onChange={(e) => updateContent({ show_correct_answers: e.target.checked })}
            className="w-4 h-4 accent-purple-600"
          />
          Mostra risposte corrette
        </label>
      </div>

      {/* AI generation */}
      <button
        onClick={generateWithAI}
        disabled={generatingAI}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 border-2 border-dashed border-purple-200 text-purple-700 text-sm font-medium rounded-xl hover:border-purple-400 hover:bg-purple-50 disabled:opacity-50 transition-all"
      >
        {generatingAI ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Generazione domande AI...</>
        ) : (
          <><Sparkles className="w-4 h-4" /> Genera domande con AI</>
        )}
      </button>

      {aiError && (
        <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{aiError}</p>
      )}

      {/* Question list */}
      {block.content.questions.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">Nessuna domanda ancora.</p>
          <p className="text-xs mt-1">Aggiungine una manualmente o usa l&apos;AI.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {block.content.questions.map((question, qIdx) => (
            <QuestionEditor
              key={question.id}
              question={question}
              index={qIdx}
              isExpanded={expandedQuestion === question.id}
              onToggle={() =>
                setExpandedQuestion(expandedQuestion === question.id ? null : question.id)
              }
              onUpdate={(updates) => updateQuestion(question.id, updates)}
              onDelete={() => deleteQuestion(question.id)}
              onAddOption={() => addOption(question.id)}
              onToggleCorrect={(optId) => toggleCorrect(question, optId)}
              onSetType={(type) => setQuestionType(question, type)}
            />
          ))}
        </div>
      )}

      <button
        onClick={addQuestion}
        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl border border-dashed border-gray-200 hover:border-purple-300 transition-all"
      >
        <Plus className="w-4 h-4" /> Aggiungi domanda manualmente
      </button>
    </div>
  );
}

// ─── Question editor sub-component ──────────────────────────

interface QuestionEditorProps {
  question: QuizQuestion;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<QuizQuestion>) => void;
  onDelete: () => void;
  onAddOption: () => void;
  onToggleCorrect: (optId: string) => void;
  onSetType: (type: QuizQuestion["type"]) => void;
}

function QuestionEditor({
  question,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  onAddOption,
  onToggleCorrect,
  onSetType,
}: QuestionEditorProps) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Question header */}
      <div
        className="flex items-center gap-2 p-3 bg-white cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
        <span className="text-xs font-semibold text-gray-400 w-5">{index + 1}.</span>
        <p className="flex-1 text-sm text-gray-700 truncate">
          {question.text || <span className="text-gray-400 italic">Domanda senza testo</span>}
        </p>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          question.correct_ids.length > 0
            ? "bg-green-100 text-green-700"
            : "bg-amber-100 text-amber-700"
        }`}>
          {question.correct_ids.length > 0 ? "✓ Completa" : "Incompleta"}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 hover:text-red-500 text-gray-400 transition-colors"
          aria-label="Elimina domanda"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </div>

      {/* Expanded editor */}
      {isExpanded && (
        <div className="p-3 space-y-3 border-t border-gray-100 bg-gray-50">
          <textarea
            value={question.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder="Scrivi la domanda..."
            aria-label="Testo domanda"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none bg-white"
          />

          {/* Type selector */}
          <div className="flex gap-2">
            {QUESTION_TYPES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => onSetType(value as QuizQuestion["type"])}
                className={`flex-1 py-1 text-xs rounded-lg border transition-colors ${
                  question.type === value
                    ? "border-purple-400 bg-purple-50 text-purple-700"
                    : "border-gray-200 text-gray-500 hover:bg-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Options */}
          <div className="space-y-2">
            {question.options.map((opt) => (
              <div key={opt.id} className="flex items-center gap-2">
                <button
                  onClick={() => onToggleCorrect(opt.id)}
                  className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all ${
                    question.correct_ids.includes(opt.id)
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-gray-300 hover:border-green-400"
                  }`}
                  aria-label={`Segna come risposta corretta: ${opt.text}`}
                  title="Clicca per segnare come corretta"
                >
                  {question.correct_ids.includes(opt.id) && <Check className="w-3.5 h-3.5" />}
                </button>
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) =>
                    onUpdate({
                      options: question.options.map((o) =>
                        o.id === opt.id ? { ...o, text: e.target.value } : o
                      ),
                    })
                  }
                  placeholder={`Risposta ${opt.id.toUpperCase()}`}
                  aria-label={`Risposta ${opt.id}`}
                  disabled={question.type === "true_false"}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white disabled:bg-gray-100"
                />
              </div>
            ))}
          </div>

          {question.type !== "true_false" && question.options.length < 6 && (
            <button
              onClick={onAddOption}
              className="text-xs text-purple-600 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Aggiungi risposta
            </button>
          )}

          <textarea
            value={question.explanation ?? ""}
            onChange={(e) => onUpdate({ explanation: e.target.value })}
            placeholder="Spiegazione (mostrata dopo la risposta)..."
            aria-label="Spiegazione risposta"
            rows={2}
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none bg-white text-gray-600"
          />
        </div>
      )}
    </div>
  );
}
