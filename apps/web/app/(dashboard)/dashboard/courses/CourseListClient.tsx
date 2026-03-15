"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  Plus, Search, BookOpen, Globe, Lock, Edit3, Trash2,
  Copy, MoreVertical, Clock, Eye, TrendingUp, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { deleteCourseAction, duplicateCourseAction } from "@/lib/actions/courses";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string;
  level: string;
  cover_url: string | null;
  status: string;
  is_published: boolean;
  lessons_count: number;
  created_at: string;
  updated_at: string | null;
}

type Filter = "all" | "draft" | "published";

const CATEGORY_GRADIENT: Record<string, string> = {
  "digital-marketing": "from-blue-600 to-cyan-500",
  "ai":               "from-purple-600 to-violet-500",
  "sales":            "from-green-600 to-emerald-500",
};

const LEVEL_LABEL: Record<string, string> = {
  base: "Base", intermediate: "Intermedio", advanced: "Avanzato",
};

interface Props {
  initialCourses: Course[];
  userId: string;
}

export function CourseListClient({ initialCourses, userId }: Props) {
  const [courses, setCourses] = useState(initialCourses);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
        (c.description ?? "").toLowerCase().includes(search.toLowerCase());
      const matchFilter =
        filter === "all" ||
        (filter === "draft" && c.status === "draft") ||
        (filter === "published" && c.status === "published");
      return matchSearch && matchFilter;
    });
  }, [courses, search, filter]);

  const stats = {
    total: courses.length,
    published: courses.filter((c) => c.status === "published").length,
    draft: courses.filter((c) => c.status === "draft").length,
  };

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Eliminare "${title}"? Questa azione è irreversibile.`)) return;
    startTransition(async () => {
      const result = await deleteCourseAction(id);
      if (result.ok) {
        setCourses((prev) => prev.filter((c) => c.id !== id));
        toast("Corso eliminato", "success");
      } else {
        toast(result.error, "error");
      }
    });
  };

  const handleDuplicate = (id: string) => {
    startTransition(async () => {
      const result = await duplicateCourseAction(id);
      if (result.ok) {
        router.refresh();
        toast("Corso duplicato", "success");
      } else {
        toast(result.error, "error");
      }
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-poppins">I miei corsi</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Crea e pubblica corsi e-learning con assistenza AI
          </p>
        </div>
        <Link href="/dashboard/courses/new">
          <Button icon={<Plus className="w-4 h-4" />}>Nuovo corso</Button>
        </Link>
      </div>

      {/* Stats */}
      {courses.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Totale", value: stats.total, icon: BookOpen, color: "text-purple-400" },
            { label: "Pubblicati", value: stats.published, icon: Globe, color: "text-green-400" },
            { label: "Bozze", value: stats.draft, icon: Lock, color: "text-amber-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="p-4">
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${color}`} />
                <div>
                  <p className="text-xl font-bold text-white">{value}</p>
                  <p className="text-xs text-slate-400">{label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Search + filter */}
      {courses.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per titolo o descrizione..."
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="flex gap-2">
            {(["all", "published", "draft"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 text-xs font-medium rounded-xl border transition-colors ${
                  filter === f
                    ? "bg-purple-900/50 border-purple-700 text-purple-300"
                    : "border-slate-700 text-slate-400 hover:border-slate-600"
                }`}
              >
                {f === "all" ? "Tutti" : f === "published" ? "Pubblicati" : "Bozze"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {courses.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-purple-900/30 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <Sparkles className="w-10 h-10 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Crea il tuo primo corso</h2>
          <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">
            L&apos;AI genera struttura, contenuti e quiz in pochi secondi.
          </p>
          <Link href="/dashboard/courses/new">
            <Button size="lg" icon={<Sparkles className="w-4 h-4" />}>
              Inizia con AI
            </Button>
          </Link>
        </div>
      )}

      {/* No results */}
      {courses.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Nessun corso trovato per &quot;{search}&quot;</p>
          <button onClick={() => { setSearch(""); setFilter("all"); }} className="text-purple-400 text-sm mt-2 hover:underline">
            Reimposta filtri
          </button>
        </div>
      )}

      {/* Course grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              isPending={isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Course card ─────────────────────────────────────────────

function CourseCard({
  course,
  onDelete,
  onDuplicate,
  isPending,
}: {
  course: Course;
  onDelete: (id: string, title: string) => void;
  onDuplicate: (id: string) => void;
  isPending: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const gradient = CATEGORY_GRADIENT[course.category] ?? "from-slate-700 to-slate-600";

  return (
    <Card hover className="overflow-hidden group">
      {/* Thumbnail */}
      <div className={`h-32 bg-gradient-to-br ${gradient} relative`}>
        {course.cover_url ? (
          <img src={course.cover_url} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-white/30" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <Badge variant={course.status === "published" ? "success" : "warning"} dot>
            {course.status === "published" ? "Pubblicato" : "Bozza"}
          </Badge>
        </div>

        {/* Menu */}
        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => { e.preventDefault(); setMenuOpen(!menuOpen); }}
            className="p-1.5 bg-black/40 hover:bg-black/60 rounded-lg text-white transition-colors"
            aria-label="Opzioni corso"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-20 w-40 overflow-hidden">
                <Link
                  href={`/dashboard/courses/${course.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Modifica
                </Link>
                <Link
                  href={`/dashboard/courses/${course.id}/analytics`}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                >
                  <TrendingUp className="w-3.5 h-3.5" /> Analitiche
                </Link>
                {course.is_published && (
                  <a
                    href={`/courses/${course.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    <Eye className="w-3.5 h-3.5" /> Anteprima
                  </a>
                )}
                <button
                  onClick={() => { setMenuOpen(false); onDuplicate(course.id); }}
                  disabled={isPending}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplica
                </button>
                {course.status === "draft" && (
                  <button
                    onClick={() => { setMenuOpen(false); onDelete(course.id, course.title); }}
                    disabled={isPending}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-900/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Elimina
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-purple-300 transition-colors">
            {course.title}
          </h3>
          {course.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{course.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="default">{LEVEL_LABEL[course.level] ?? course.level}</Badge>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> {course.lessons_count} lezioni
          </span>
        </div>

        <Link href={`/dashboard/courses/${course.id}`}>
          <Button variant="secondary" size="sm" className="w-full" icon={<Edit3 className="w-3.5 h-3.5" />}>
            Apri editor
          </Button>
        </Link>
      </div>
    </Card>
  );
}
