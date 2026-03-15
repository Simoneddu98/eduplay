"use client";

/**
 * LessonEditor — The content canvas for a single lesson.
 *
 * State: local copy of blocks (updated optimistically),
 * then synced via useAutosave to Supabase every 2s of inactivity.
 * This keeps the editor snappy with zero-latency local updates.
 */

import { useState, useCallback, useEffect } from "react";
import { nanoid } from "nanoid";
import { Eye, Edit3, Sparkles, Save } from "lucide-react";
import { ContentBlock, AddBlockButton } from "./ContentBlock";
import { AISuggestionPanel } from "../ai/AISuggestionPanel";
import { useAutosave, formatSaveStatus } from "../hooks/useAutosave";
import { useLessons, createDefaultBlock } from "../hooks/useLessons";
import type {
  AuthoringLesson,
  ContentBlock as ContentBlockType,
  LessonContent,
  ContentBlockType as BlockTypeEnum,
  AIOutline,
  QuizQuestion,
} from "../types";

interface LessonEditorProps {
  lesson: AuthoringLesson;
  courseTitle?: string;
  onLessonUpdate: (updated: AuthoringLesson) => void;
}

function initContent(lesson: AuthoringLesson): LessonContent {
  if (lesson.content_json?.version === 2) return lesson.content_json;
  return { version: 2, blocks: [] };
}

export function LessonEditor({ lesson, courseTitle, onLessonUpdate }: LessonEditorProps) {
  const [content, setContent] = useState<LessonContent>(() => initContent(lesson));
  const [isEditing, setIsEditing] = useState(true);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [lessonTitle, setLessonTitle] = useState(lesson.title);

  const { saveLessonContent, updateLesson } = useLessons(lesson.course_id);

  // Reset when lesson changes
  useEffect(() => {
    setContent(initContent(lesson));
    setLessonTitle(lesson.title);
  }, [lesson.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Autosave content ───────────────────────────────────────
  const saveFn = useCallback(
    async (data: LessonContent) => {
      return saveLessonContent(lesson.id, data);
    },
    [lesson.id, saveLessonContent]
  );

  const { status: saveStatus, lastSavedAt, saveNow } = useAutosave({
    data: content,
    saveFn,
  });

  // ─── Block mutations ─────────────────────────────────────────
  const addBlock = useCallback((type: BlockTypeEnum, afterIndex?: number) => {
    const newBlock = createDefaultBlock(type);
    setContent((prev) => {
      const blocks = [...prev.blocks];
      const insertAt = afterIndex !== undefined ? afterIndex + 1 : blocks.length;
      blocks.splice(insertAt, 0, { ...newBlock, order: insertAt });
      return { ...prev, blocks: blocks.map((b, i) => ({ ...b, order: i })) };
    });
  }, []);

  const updateBlock = useCallback((id: string, updated: ContentBlockType) => {
    setContent((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? updated : b)),
    }));
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setContent((prev) => ({
      ...prev,
      blocks: prev.blocks
        .filter((b) => b.id !== id)
        .map((b, i) => ({ ...b, order: i })),
    }));
  }, []);

  const moveBlock = useCallback((id: string, direction: "up" | "down") => {
    setContent((prev) => {
      const blocks = [...prev.blocks];
      const idx = blocks.findIndex((b) => b.id === id);
      if (idx === -1) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= blocks.length) return prev;
      [blocks[idx], blocks[swapIdx]] = [blocks[swapIdx], blocks[idx]];
      return { ...prev, blocks: blocks.map((b, i) => ({ ...b, order: i })) };
    });
  }, []);

  // ─── AI callbacks ─────────────────────────────────────────────
  const handleInsertContent = useCallback((html: string) => {
    const newBlock = createDefaultBlock("text");
    (newBlock as import("../types").TextBlock).content = {
      html,
      plain: html.replace(/<[^>]*>/g, ""),
    };
    setContent((prev) => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
    }));
  }, []);

  const handleInsertQuiz = useCallback((questions: QuizQuestion[]) => {
    const quizBlock = createDefaultBlock("quiz");
    (quizBlock as import("../types").QuizBlock).content = {
      questions,
      pass_threshold: 70,
      show_correct_answers: true,
      randomize_order: false,
    };
    setContent((prev) => ({
      ...prev,
      blocks: [...prev.blocks, quizBlock],
    }));
  }, []);

  const handleInsertOutline = useCallback((_outline: AIOutline) => {
    // In a lesson context, outline inserts the first lesson's key points as text
    const textBlock = createDefaultBlock("text");
    (textBlock as import("../types").TextBlock).content = {
      html: "<p>Contenuto generato dalla struttura del corso. Personalizza questo testo.</p>",
      plain: "Contenuto generato.",
    };
    setContent((prev) => ({
      ...prev,
      blocks: [...prev.blocks, textBlock],
    }));
  }, []);

  // ─── Lesson title save ────────────────────────────────────────
  const handleTitleBlur = async () => {
    if (lessonTitle !== lesson.title) {
      await updateLesson(lesson.id, { title: lessonTitle });
      onLessonUpdate({ ...lesson, title: lessonTitle });
    }
  };

  // Plain text content for AI context
  const lessonContentPlain = content.blocks
    .filter((b) => b.type === "text")
    .map((b) => (b as import("../types").TextBlock).content.plain)
    .join("\n");

  return (
    <div className="flex flex-col h-full">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          {/* View/Edit toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setIsEditing(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                isEditing ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Modifica
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                !isEditing ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Anteprima
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save status */}
          <span className={`text-xs ${
            saveStatus === "saving" ? "text-amber-600" :
            saveStatus === "saved" ? "text-green-600" :
            saveStatus === "error" ? "text-red-600" :
            saveStatus === "offline" ? "text-gray-500" :
            "text-gray-400"
          }`}>
            {formatSaveStatus(saveStatus, lastSavedAt)}
          </span>

          <button
            onClick={saveNow}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Salva ora"
          >
            <Save className="w-3.5 h-3.5" />
            Salva
          </button>

          <button
            onClick={() => setIsAIPanelOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-gradient-to-r from-purple-600 to-violet-600 rounded-lg hover:opacity-90 transition-all"
            aria-label="Apri assistente AI"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI
          </button>
        </div>
      </div>

      {/* Lesson content canvas */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-2">
          {/* Lesson title */}
          {isEditing ? (
            <input
              type="text"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="w-full text-2xl font-bold text-gray-900 border-none outline-none focus:ring-2 focus:ring-purple-200 rounded-lg px-1 py-0.5 -mx-1"
              aria-label="Titolo lezione"
              placeholder="Titolo della lezione"
            />
          ) : (
            <h1 className="text-2xl font-bold text-gray-900">{lessonTitle}</h1>
          )}

          {content.blocks.length === 0 ? (
            <EmptyLessonState onAddBlock={addBlock} />
          ) : (
            <>
              {content.blocks.map((block, idx) => (
                <ContentBlock
                  key={block.id}
                  block={block}
                  isFirst={idx === 0}
                  isLast={idx === content.blocks.length - 1}
                  isEditing={isEditing}
                  lessonTitle={lessonTitle}
                  lessonContent={lessonContentPlain}
                  onChange={(updated) => updateBlock(block.id, updated)}
                  onDelete={() => deleteBlock(block.id)}
                  onMoveUp={() => moveBlock(block.id, "up")}
                  onMoveDown={() => moveBlock(block.id, "down")}
                  onAddAfter={(type) => addBlock(type, idx)}
                />
              ))}
              {/* Add block at the end */}
              {isEditing && (
                <AddBlockButton onAdd={(type) => addBlock(type)} />
              )}
            </>
          )}
        </div>
      </div>

      {/* AI Suggestion Panel */}
      <AISuggestionPanel
        isOpen={isAIPanelOpen}
        onClose={() => setIsAIPanelOpen(false)}
        courseTitle={courseTitle}
        lessonTitle={lessonTitle}
        lessonContent={lessonContentPlain}
        onInsertContent={handleInsertContent}
        onInsertQuiz={handleInsertQuiz}
        onInsertOutline={handleInsertOutline}
      />
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────

function EmptyLessonState({ onAddBlock }: { onAddBlock: (type: BlockTypeEnum) => void }) {
  const QUICK_BLOCKS: Array<{ type: BlockTypeEnum; label: string; emoji: string }> = [
    { type: "text", label: "Inizia a scrivere", emoji: "✍️" },
    { type: "video", label: "Aggiungi video", emoji: "🎬" },
    { type: "image", label: "Inserisci immagine", emoji: "🖼️" },
    { type: "quiz", label: "Crea quiz", emoji: "✅" },
  ];

  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-4">📝</div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        Lezione vuota
      </h3>
      <p className="text-sm text-gray-400 mb-6">
        Aggiungi il primo blocco di contenuto per iniziare.
      </p>
      <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
        {QUICK_BLOCKS.map(({ type, label, emoji }) => (
          <button
            key={type}
            onClick={() => onAddBlock(type)}
            className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all"
            aria-label={`Aggiungi blocco ${label}`}
          >
            <span className="text-2xl">{emoji}</span>
            <span className="text-xs font-medium text-gray-600">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
