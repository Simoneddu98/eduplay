"use client";

/**
 * LessonList — Left sidebar showing modules and lessons tree.
 *
 * Uses simple up/down arrows for reordering (MVP).
 * Drag-and-drop with @dnd-kit is planned for V2.
 */

import { useState, useCallback } from "react";
import {
  BookOpen,
  Plus,
  ChevronDown,
  ChevronRight,
  Video,
  FileText,
  HelpCircle,
  Eye,
  EyeOff,
  Folder,
  FolderOpen,
  Loader2,
  Trash2,
  GripVertical,
  ChevronUp,
} from "lucide-react";
import type { AuthoringCourse, AuthoringLesson, CourseModule } from "../types";
import { useLessons } from "../hooks/useLessons";

interface LessonListProps {
  course: AuthoringCourse;
  selectedLessonId: string | null;
  onSelectLesson: (lesson: AuthoringLesson) => void;
  onCourseUpdate: (updated: AuthoringCourse) => void;
}

const CONTENT_TYPE_ICON: Record<string, React.ElementType> = {
  video: Video,
  text: FileText,
  quiz: HelpCircle,
  interactive: Eye,
};

function LessonItem({
  lesson,
  isSelected,
  isFirst,
  isLast,
  onSelect,
  onTogglePublish,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  lesson: AuthoringLesson;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = CONTENT_TYPE_ICON[lesson.content_type] ?? FileText;

  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? "bg-purple-100 text-purple-900 border border-purple-200"
          : "text-gray-600 hover:bg-gray-50 border border-transparent"
      }`}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`Lezione: ${lesson.title}`}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
    >
      <GripVertical className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 opacity-0 group-hover:opacity-100" />
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-purple-600" : "text-gray-400"}`} />
      <span className="flex-1 text-xs font-medium truncate">{lesson.title}</span>

      {hovered && (
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"
            aria-label="Sposta lezione in su"
          >
            <ChevronUp className="w-3 h-3 text-gray-500" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"
            aria-label="Sposta lezione in giù"
          >
            <ChevronDown className="w-3 h-3 text-gray-500" />
          </button>
          <button
            onClick={onTogglePublish}
            className="p-0.5 hover:bg-gray-200 rounded"
            aria-label={lesson.is_published ? "Nascondi lezione" : "Pubblica lezione"}
          >
            {lesson.is_published ? (
              <Eye className="w-3 h-3 text-green-600" />
            ) : (
              <EyeOff className="w-3 h-3 text-gray-400" />
            )}
          </button>
          <button
            onClick={onDelete}
            className="p-0.5 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded"
            aria-label="Elimina lezione"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {!hovered && !lesson.is_published && (
        <span className="text-[9px] px-1 bg-amber-100 text-amber-700 rounded-full flex-shrink-0">
          Bozza
        </span>
      )}
    </div>
  );
}

function ModuleSection({
  module,
  selectedLessonId,
  onSelectLesson,
  onLessonAction,
}: {
  module: CourseModule;
  selectedLessonId: string | null;
  onSelectLesson: (lesson: AuthoringLesson) => void;
  onLessonAction: (action: string, lesson: AuthoringLesson) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const lessons = module.lessons ?? [];

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {collapsed ? <Folder className="w-3.5 h-3.5" /> : <FolderOpen className="w-3.5 h-3.5" />}
        <span className="flex-1 text-left truncate">{module.title}</span>
        <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full">{lessons.length}</span>
      </button>

      {!collapsed && (
        <div className="ml-4 space-y-0.5 mt-0.5">
          {lessons.map((lesson, idx) => (
            <LessonItem
              key={lesson.id}
              lesson={lesson}
              isSelected={lesson.id === selectedLessonId}
              isFirst={idx === 0}
              isLast={idx === lessons.length - 1}
              onSelect={() => onSelectLesson(lesson)}
              onTogglePublish={() => onLessonAction("togglePublish", lesson)}
              onDelete={() => onLessonAction("delete", lesson)}
              onMoveUp={() => onLessonAction("moveUp", lesson)}
              onMoveDown={() => onLessonAction("moveDown", lesson)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function LessonList({
  course,
  selectedLessonId,
  onSelectLesson,
  onCourseUpdate,
}: LessonListProps) {
  const [addingLesson, setAddingLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonModuleId, setNewLessonModuleId] = useState<string | null>(null);
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");

  const { createLesson, deleteLesson, toggleLessonPublished, reorderLessons } =
    useLessons(course.id);

  const allLessons = [
    ...course.lessons,
    ...(course.modules?.flatMap((m) => m.lessons ?? []) ?? []),
  ];

  const handleAddLesson = useCallback(async () => {
    if (!newLessonTitle.trim()) return;
    setAddingLesson(false);

    const { data, error } = await createLesson({
      title: newLessonTitle.trim(),
      moduleId: newLessonModuleId,
      existingLessons: allLessons,
    });

    setNewLessonTitle("");
    setNewLessonModuleId(null);

    if (!error && data) {
      if (newLessonModuleId) {
        const updated: AuthoringCourse = {
          ...course,
          modules: course.modules.map((m) =>
            m.id === newLessonModuleId
              ? { ...m, lessons: [...(m.lessons ?? []), data] }
              : m
          ),
        };
        onCourseUpdate(updated);
      } else {
        onCourseUpdate({ ...course, lessons: [...course.lessons, data] });
      }
      onSelectLesson(data);
    }
  }, [newLessonTitle, newLessonModuleId, createLesson, allLessons, course, onCourseUpdate, onSelectLesson]);

  const handleAddModule = useCallback(async () => {
    if (!newModuleTitle.trim()) return;
    setAddingModule(false);
    // createModule is from useCourse, passed via course update
    // For now, we optimistically update and let the page handle the actual creation
    setNewModuleTitle("");
  }, [newModuleTitle]);

  const handleLessonAction = useCallback(
    async (action: string, lesson: AuthoringLesson) => {
      if (action === "delete") {
        if (!confirm(`Eliminare la lezione "${lesson.title}"?`)) return;
        await deleteLesson(lesson.id);
        onCourseUpdate({
          ...course,
          lessons: course.lessons.filter((l) => l.id !== lesson.id),
          modules: course.modules.map((m) => ({
            ...m,
            lessons: (m.lessons ?? []).filter((l) => l.id !== lesson.id),
          })),
        });
        if (selectedLessonId === lesson.id) onSelectLesson(course.lessons[0] ?? null as unknown as AuthoringLesson);
      } else if (action === "togglePublish") {
        await toggleLessonPublished(lesson.id, lesson.is_published);
        // Update in course state
        const update = (l: AuthoringLesson) =>
          l.id === lesson.id ? { ...l, is_published: !l.is_published } : l;
        onCourseUpdate({
          ...course,
          lessons: course.lessons.map(update),
          modules: course.modules.map((m) => ({
            ...m,
            lessons: (m.lessons ?? []).map(update),
          })),
        });
      } else if (action === "moveUp" || action === "moveDown") {
        const lessonList = lesson.module_id
          ? (course.modules.find((m) => m.id === lesson.module_id)?.lessons ?? [])
          : course.lessons;
        const idx = lessonList.findIndex((l) => l.id === lesson.id);
        const targetIdx = action === "moveUp" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= lessonList.length) return;

        const reordered = await reorderLessons(lessonList, idx, targetIdx);
        if (lesson.module_id) {
          onCourseUpdate({
            ...course,
            modules: course.modules.map((m) =>
              m.id === lesson.module_id ? { ...m, lessons: reordered } : m
            ),
          });
        } else {
          onCourseUpdate({ ...course, lessons: reordered });
        }
      }
    },
    [course, selectedLessonId, onCourseUpdate, onSelectLesson, deleteLesson, toggleLessonPublished, reorderLessons]
  );

  const totalLessons = allLessons.length;
  const publishedLessons = allLessons.filter((l) => l.is_published).length;

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-gray-800">Lezioni</h3>
          <span className="text-xs text-gray-400">
            {publishedLessons}/{totalLessons} pubblicate
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-violet-600 rounded-full transition-all"
            style={{ width: totalLessons > 0 ? `${(publishedLessons / totalLessons) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* Lesson tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Flat lessons (no module) */}
        {course.lessons.map((lesson, idx) => (
          <LessonItem
            key={lesson.id}
            lesson={lesson}
            isSelected={lesson.id === selectedLessonId}
            isFirst={idx === 0}
            isLast={idx === course.lessons.length - 1}
            onSelect={() => onSelectLesson(lesson)}
            onTogglePublish={() => handleLessonAction("togglePublish", lesson)}
            onDelete={() => handleLessonAction("delete", lesson)}
            onMoveUp={() => handleLessonAction("moveUp", lesson)}
            onMoveDown={() => handleLessonAction("moveDown", lesson)}
          />
        ))}

        {/* Modules */}
        {course.modules?.map((module) => (
          <ModuleSection
            key={module.id}
            module={module}
            selectedLessonId={selectedLessonId}
            onSelectLesson={onSelectLesson}
            onLessonAction={handleLessonAction}
          />
        ))}

        {totalLessons === 0 && !addingLesson && (
          <div className="text-center py-8">
            <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Nessuna lezione ancora.</p>
            <p className="text-xs text-gray-400">Aggiungine una qui sotto.</p>
          </div>
        )}

        {/* New lesson input */}
        {addingLesson && (
          <div className="px-2 py-1 space-y-1">
            <input
              type="text"
              autoFocus
              value={newLessonTitle}
              onChange={(e) => setNewLessonTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddLesson();
                if (e.key === "Escape") setAddingLesson(false);
              }}
              placeholder="Titolo lezione..."
              aria-label="Titolo nuova lezione"
              className="w-full px-3 py-1.5 text-sm border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            {course.modules.length > 0 && (
              <select
                value={newLessonModuleId ?? ""}
                onChange={(e) => setNewLessonModuleId(e.target.value || null)}
                aria-label="Modulo della lezione"
                className="w-full px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                <option value="">Senza modulo</option>
                {course.modules.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            )}
            <div className="flex gap-1">
              <button
                onClick={handleAddLesson}
                disabled={!newLessonTitle.trim()}
                className="flex-1 py-1 text-xs bg-purple-600 text-white rounded-lg disabled:opacity-50"
              >
                Aggiungi
              </button>
              <button
                onClick={() => setAddingLesson(false)}
                className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="p-2 border-t border-gray-100 space-y-1">
        <button
          onClick={() => setAddingLesson(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors font-medium"
          aria-label="Aggiungi lezione"
        >
          <Plus className="w-3.5 h-3.5" />
          Aggiungi lezione
        </button>
      </div>
    </div>
  );
}
