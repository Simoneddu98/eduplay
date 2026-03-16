"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  GripVertical,
  Trash2,
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

// ─── Sortable Lesson Item ──────────────────────────────────────

function SortableLessonItem({
  lesson,
  isSelected,
  onSelect,
  onTogglePublish,
  onDelete,
}: {
  lesson: AuthoringLesson;
  isSelected: boolean;
  onSelect: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const Icon = CONTENT_TYPE_ICON[lesson.content_type] ?? FileText;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? "bg-purple-100 text-purple-900 border border-purple-200"
          : "text-gray-600 hover:bg-gray-50 border border-transparent"
      } ${isDragging ? "shadow-lg ring-1 ring-purple-300" : ""}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={`Lezione: ${lesson.title}`}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 p-0.5 rounded cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="Trascina per riordinare"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-purple-600" : "text-gray-400"}`} />
      <span className="flex-1 text-xs font-medium truncate">{lesson.title}</span>

      {/* Hover controls */}
      <div
        className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
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

      {/* Draft badge when not hovered */}
      {!lesson.is_published && (
        <span className="text-[9px] px-1 bg-amber-100 text-amber-700 rounded-full flex-shrink-0 group-hover:hidden">
          Bozza
        </span>
      )}
    </div>
  );
}

// ─── Sortable Module Section ───────────────────────────────────

function SortableModuleSection({
  module,
  selectedLessonId,
  onSelectLesson,
  onTogglePublish,
  onDelete,
  onDragEnd,
}: {
  module: CourseModule;
  selectedLessonId: string | null;
  onSelectLesson: (lesson: AuthoringLesson) => void;
  onTogglePublish: (lesson: AuthoringLesson) => void;
  onDelete: (lesson: AuthoringLesson) => void;
  onDragEnd: (moduleId: string, activeId: string, overId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const lessons = module.lessons ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onDragEnd(module.id, String(active.id), String(over.id));
    }
  }

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
        <div className="ml-4 mt-0.5">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={lessons.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-0.5">
                {lessons.map((lesson) => (
                  <SortableLessonItem
                    key={lesson.id}
                    lesson={lesson}
                    isSelected={lesson.id === selectedLessonId}
                    onSelect={() => onSelectLesson(lesson)}
                    onTogglePublish={() => onTogglePublish(lesson)}
                    onDelete={() => onDelete(lesson)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

// ─── Main LessonList ──────────────────────────────────────────

export function LessonList({
  course,
  selectedLessonId,
  onSelectLesson,
  onCourseUpdate,
}: LessonListProps) {
  const [addingLesson, setAddingLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonModuleId, setNewLessonModuleId] = useState<string | null>(null);

  const { createLesson, deleteLesson, toggleLessonPublished, reorderLessons } =
    useLessons(course.id);

  const allLessons = [
    ...course.lessons,
    ...(course.modules?.flatMap((m) => m.lessons ?? []) ?? []),
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ─── Flat lessons drag end ───────────────────────────────

  const handleFlatDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIdx = course.lessons.findIndex((l) => l.id === active.id);
      const newIdx = course.lessons.findIndex((l) => l.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return;

      const reordered = arrayMove(course.lessons, oldIdx, newIdx).map(
        (l, i) => ({ ...l, order_index: i })
      );

      // Optimistic update
      onCourseUpdate({ ...course, lessons: reordered });

      // Persist
      await reorderLessons(
        reordered,
        oldIdx,
        newIdx
      );
    },
    [course, onCourseUpdate, reorderLessons]
  );

  // ─── Module lessons drag end ─────────────────────────────

  const handleModuleDragEnd = useCallback(
    async (moduleId: string, activeId: string, overId: string) => {
      const mod = course.modules.find((m) => m.id === moduleId);
      if (!mod) return;

      const lessons = mod.lessons ?? [];
      const oldIdx = lessons.findIndex((l) => l.id === activeId);
      const newIdx = lessons.findIndex((l) => l.id === overId);
      if (oldIdx === -1 || newIdx === -1) return;

      const reordered = arrayMove(lessons, oldIdx, newIdx).map(
        (l, i) => ({ ...l, order_index: i })
      );

      onCourseUpdate({
        ...course,
        modules: course.modules.map((m) =>
          m.id === moduleId ? { ...m, lessons: reordered } : m
        ),
      });

      await reorderLessons(reordered, oldIdx, newIdx);
    },
    [course, onCourseUpdate, reorderLessons]
  );

  // ─── Add lesson ──────────────────────────────────────────

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
        onCourseUpdate({
          ...course,
          modules: course.modules.map((m) =>
            m.id === newLessonModuleId
              ? { ...m, lessons: [...(m.lessons ?? []), data] }
              : m
          ),
        });
      } else {
        onCourseUpdate({ ...course, lessons: [...course.lessons, data] });
      }
      onSelectLesson(data);
    }
  }, [newLessonTitle, newLessonModuleId, createLesson, allLessons, course, onCourseUpdate, onSelectLesson]);

  // ─── Delete / toggle publish ─────────────────────────────

  const handleDelete = useCallback(
    async (lesson: AuthoringLesson) => {
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
      if (selectedLessonId === lesson.id) {
        onSelectLesson(course.lessons[0] ?? (null as unknown as AuthoringLesson));
      }
    },
    [course, selectedLessonId, onCourseUpdate, onSelectLesson, deleteLesson]
  );

  const handleTogglePublish = useCallback(
    async (lesson: AuthoringLesson) => {
      await toggleLessonPublished(lesson.id, lesson.is_published);
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
    },
    [course, onCourseUpdate, toggleLessonPublished]
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
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-violet-600 rounded-full transition-all"
            style={{ width: totalLessons > 0 ? `${(publishedLessons / totalLessons) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* Lesson tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Flat lessons with drag & drop */}
        {course.lessons.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleFlatDragEnd}
          >
            <SortableContext
              items={course.lessons.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-0.5">
                {course.lessons.map((lesson) => (
                  <SortableLessonItem
                    key={lesson.id}
                    lesson={lesson}
                    isSelected={lesson.id === selectedLessonId}
                    onSelect={() => onSelectLesson(lesson)}
                    onTogglePublish={() => handleTogglePublish(lesson)}
                    onDelete={() => handleDelete(lesson)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Modules with independent drag contexts */}
        {course.modules?.map((module) => (
          <SortableModuleSection
            key={module.id}
            module={module}
            selectedLessonId={selectedLessonId}
            onSelectLesson={onSelectLesson}
            onTogglePublish={handleTogglePublish}
            onDelete={handleDelete}
            onDragEnd={handleModuleDragEnd}
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

      {/* Footer */}
      <div className="p-2 border-t border-gray-100">
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
