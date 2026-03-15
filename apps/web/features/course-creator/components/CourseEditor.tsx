"use client";

/**
 * CourseEditor — The main 3-panel editor.
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────┐
 * │  Top bar: title | save status | settings | publish   │
 * ├──────────────┬───────────────────────────────────────┤
 * │  Lesson List │  Lesson Editor                        │
 * │  (240px)     │  (flex 1)                             │
 * └──────────────┴───────────────────────────────────────┘
 *
 * The CourseSettings panel slides over the right side when opened.
 */

import { useState, useCallback } from "react";
import {
  ArrowLeft,
  Settings,
  Globe,
  Lock,
  Eye,
  Sparkles,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { useCourse } from "../hooks/useCourse";
import { LessonList } from "./LessonList";
import { LessonEditor } from "./LessonEditor";
import { CourseSettings } from "./CourseSettings";
import type { AuthoringLesson } from "../types";

interface CourseEditorProps {
  courseId: string;
}

export function CourseEditor({ courseId }: CourseEditorProps) {
  const {
    course,
    loading,
    error,
    updateCourse,
    publishCourse,
    unpublishCourse,
    setCourse,
  } = useCourse(courseId);

  const [selectedLesson, setSelectedLesson] = useState<AuthoringLesson | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleCourseUpdate = useCallback(
    (updated: import("../types").AuthoringCourse) => {
      setCourse(updated);
    },
    [setCourse]
  );

  const handleSelectLesson = useCallback(
    (lesson: AuthoringLesson) => {
      setSelectedLesson(lesson);
    },
    []
  );

  // Auto-select first lesson when course loads
  if (course && !selectedLesson) {
    const firstLesson =
      course.lessons[0] ??
      course.modules?.[0]?.lessons?.[0] ??
      null;
    if (firstLesson) setSelectedLesson(firstLesson);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Caricamento corso...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 mb-3">{error ?? "Corso non trovato"}</p>
          <Link href="/crea-corso" className="text-sm text-purple-600 hover:underline">
            ← Torna ai corsi
          </Link>
        </div>
      </div>
    );
  }

  const isPublished = course.status === "published";

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 bg-white z-10 flex-shrink-0">
        <Link
          href="/crea-corso"
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Torna alla lista corsi"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <BookOpen className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <h1 className="text-sm font-semibold text-gray-900 truncate">{course.title}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
            isPublished
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          }`}>
            {isPublished ? "Pubblicato" : "Bozza"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Preview link */}
          {isPublished && (
            <a
              href={`/courses/${courseId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Anteprima
            </a>
          )}

          {/* Settings */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Impostazioni corso"
          >
            <Settings className="w-3.5 h-3.5" />
            Impostazioni
          </button>

          {/* Publish button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              isPublished
                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                : "bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:opacity-90 shadow-sm"
            }`}
          >
            {isPublished ? (
              <><Lock className="w-3.5 h-3.5" /> Gestisci</>
            ) : (
              <><Globe className="w-3.5 h-3.5" /> Pubblica</>
            )}
          </button>
        </div>
      </header>

      {/* Editor body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Lesson list */}
        <div className="w-60 flex-shrink-0 overflow-y-auto">
          <LessonList
            course={course}
            selectedLessonId={selectedLesson?.id ?? null}
            onSelectLesson={handleSelectLesson}
            onCourseUpdate={handleCourseUpdate}
          />
        </div>

        {/* Right: Lesson editor or empty state */}
        <div className="flex-1 overflow-hidden">
          {selectedLesson ? (
            <LessonEditor
              key={selectedLesson.id} // Re-mount on lesson change
              lesson={selectedLesson}
              courseTitle={course.title}
              onLessonUpdate={(updated) => {
                setSelectedLesson(updated);
                handleCourseUpdate({
                  ...course,
                  lessons: course.lessons.map((l) => l.id === updated.id ? updated : l),
                  modules: course.modules.map((m) => ({
                    ...m,
                    lessons: (m.lessons ?? []).map((l) => l.id === updated.id ? updated : l),
                  })),
                });
              }}
            />
          ) : (
            <NoLessonSelected courseId={courseId} onUpdate={handleCourseUpdate} course={course} />
          )}
        </div>
      </div>

      {/* Settings panel */}
      <CourseSettings
        course={course}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdate={updateCourse}
        onPublish={publishCourse}
        onUnpublish={unpublishCourse}
      />
    </div>
  );
}

// ─── Empty state when no lesson selected ────────────────────

function NoLessonSelected({
  courseId,
  course,
  onUpdate,
}: {
  courseId: string;
  course: import("../types").AuthoringCourse;
  onUpdate: (c: import("../types").AuthoringCourse) => void;
}) {
  return (
    <div className="flex items-center justify-center h-full bg-gray-50">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          Seleziona una lezione
        </h2>
        <p className="text-sm text-gray-500">
          Scegli una lezione dalla barra laterale oppure aggiungine una nuova
          per iniziare a creare i contenuti.
        </p>
      </div>
    </div>
  );
}
