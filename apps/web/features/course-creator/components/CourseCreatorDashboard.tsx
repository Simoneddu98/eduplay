"use client";

/**
 * CourseCreatorDashboard — Trainer's course management hub.
 *
 * Shows:
 * - Stats overview (total, draft, published, learners)
 * - Course grid with status, edit/preview/delete actions
 * - "Create first course" empty state with wizard
 */

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  BookOpen,
  Users,
  Globe,
  Lock,
  Edit3,
  Eye,
  Trash2,
  Sparkles,
  TrendingUp,
  Clock,
  MoreVertical,
} from "lucide-react";
import { useTrainerCourses } from "../hooks/useCourse";
import { CourseWizard } from "./CourseWizard";
import type { AuthoringCourse } from "../types";

interface CourseCreatorDashboardProps {
  userId: string;
}

export function CourseCreatorDashboard({ userId }: CourseCreatorDashboardProps) {
  const { courses, loading, error, refetch, deleteCourse } = useTrainerCourses();
  const [showWizard, setShowWizard] = useState(false);

  const stats = {
    total: courses.length,
    draft: courses.filter((c) => c.status === "draft").length,
    published: courses.filter((c) => c.status === "published").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-3">{error}</p>
        <button onClick={refetch} className="text-sm text-purple-600 hover:underline">
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-poppins">
            I tuoi corsi
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Crea, gestisci e pubblica i tuoi corsi e-learning
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-sm"
          aria-label="Crea nuovo corso"
        >
          <Plus className="w-4 h-4" />
          Nuovo corso
        </button>
      </div>

      {/* Stats row */}
      {courses.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Totale corsi", value: stats.total, icon: BookOpen, color: "purple" },
            { label: "Pubblicati", value: stats.published, icon: Globe, color: "green" },
            { label: "Bozze", value: stats.draft, icon: Lock, color: "amber" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass-card p-4 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  color === "purple" ? "bg-purple-100" :
                  color === "green" ? "bg-green-100" : "bg-amber-100"
                }`}>
                  <Icon className={`w-5 h-5 ${
                    color === "purple" ? "text-purple-600" :
                    color === "green" ? "text-green-600" : "text-amber-600"
                  }`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {courses.length === 0 ? (
        <EmptyState onCreateCourse={() => setShowWizard(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onDelete={async () => {
                if (!confirm(`Eliminare "${course.title}"? Questa azione è irreversibile.`)) return;
                await deleteCourse(course.id);
              }}
            />
          ))}
        </div>
      )}

      {/* Wizard */}
      {showWizard && (
        <CourseWizard
          userId={userId}
          onClose={() => {
            setShowWizard(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

// ─── Course card ─────────────────────────────────────────────

function CourseCard({
  course,
  onDelete,
}: {
  course: AuthoringCourse;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isPublished = course.status === "published";

  const CATEGORY_COLOR: Record<string, string> = {
    "digital-marketing": "from-blue-600 to-blue-400",
    "ai": "from-purple-600 to-violet-400",
    "sales": "from-green-600 to-emerald-400",
  };

  const gradient = CATEGORY_COLOR[course.category] ?? "from-gray-600 to-gray-400";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all group">
      {/* Thumbnail / gradient header */}
      <div className={`h-28 bg-gradient-to-br ${gradient} relative`}>
        {course.cover_url ? (
          <img
            src={course.cover_url}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-white/40" />
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isPublished
              ? "bg-green-500/90 text-white"
              : "bg-black/40 text-white"
          }`}>
            {isPublished ? "Pubblicato" : "Bozza"}
          </span>
        </div>
        {/* Menu */}
        <div className="absolute top-2 right-2">
          <div className="relative">
            <button
              onClick={(e) => { e.preventDefault(); setMenuOpen(!menuOpen); }}
              className="p-1.5 bg-black/30 hover:bg-black/50 text-white rounded-lg transition-colors"
              aria-label="Menu corso"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden w-36">
                  {isPublished && (
                    <a
                      href={`/courses/${course.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      <Eye className="w-3.5 h-3.5" /> Anteprima
                    </a>
                  )}
                  <button
                    onClick={() => { setMenuOpen(false); onDelete(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Elimina
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-purple-700 transition-colors">
          {course.title}
        </h3>
        {course.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3">
            {course.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            {course.lessons_count} lezioni
          </span>
          {course.estimated_duration_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {Math.round(course.estimated_duration_minutes / 60)}h
            </span>
          )}
        </div>

        <Link
          href={`/crea-corso/${course.id}`}
          className="flex items-center justify-center gap-2 w-full py-2 bg-purple-50 text-purple-700 text-xs font-semibold rounded-xl hover:bg-purple-100 transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Modifica corso
        </Link>
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────

function EmptyState({ onCreateCourse }: { onCreateCourse: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-violet-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <Sparkles className="w-12 h-12 text-purple-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        Crea il tuo primo corso
      </h2>
      <p className="text-gray-500 text-sm max-w-md mx-auto mb-8">
        Trasforma la tua esperienza in un corso e-learning professionale.
        L&apos;AI ti aiuta a creare la struttura in pochi secondi.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onCreateCourse}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          Crea con assistente AI
        </button>
        <button
          onClick={onCreateCourse}
          className="flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all"
        >
          <Plus className="w-4 h-4" />
          Inizia da zero
        </button>
      </div>

      {/* Feature highlights */}
      <div className="mt-12 grid grid-cols-3 gap-6 max-w-lg mx-auto">
        {[
          { icon: "⚡", title: "Struttura in 10s", desc: "L'AI genera moduli e lezioni" },
          { icon: "📝", title: "Editor intuitivo", desc: "Blocchi di contenuto drag & drop" },
          { icon: "🚀", title: "Pubblica subito", desc: "I tuoi corsisti accedono immediatamente" },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="text-center">
            <div className="text-2xl mb-2">{icon}</div>
            <p className="text-xs font-semibold text-gray-700">{title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
