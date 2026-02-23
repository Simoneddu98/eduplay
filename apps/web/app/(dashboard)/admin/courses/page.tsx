"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  BookOpen,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  Loader2,
  ShieldCheck,
  TrendingUp,
  Info,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  "digital-marketing": "Digital Marketing",
  ai: "Intelligenza Artificiale",
  sales: "Vendite",
};

const CATEGORY_CHIPS: Record<string, string> = {
  "digital-marketing": "bg-blue-100 text-blue-700",
  ai: "bg-purple-100 text-purple-700",
  sales: "bg-green-100 text-green-700",
};

const LEVEL_CHIPS: Record<string, string> = {
  base: "bg-blue-100 text-blue-700",
  intermediate: "bg-amber-100 text-amber-700",
  advanced: "bg-red-100 text-red-700",
};

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles").select("*").eq("id", user.id).single();

    if (profile?.role !== "admin") { setIsLoading(false); return; }
    setIsAdmin(true);

    const { data } = await supabase
      .from("courses")
      .select("*")
      .order("category", { ascending: true })
      .order("level", { ascending: true });

    setCourses(data ?? []);
    setIsLoading(false);
  };

  const togglePublish = async (id: string, current: boolean) => {
    setUpdatingId(id);
    await supabase
      .from("courses")
      .update({ is_published: !current })
      .eq("id", id);
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_published: !current } : c))
    );
    setUpdatingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-80">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 animate-fade-in-up">
        <div className="glass-card p-8">
          <ShieldCheck className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-slate-500">Accesso negato.</p>
          <Link href="/dashboard" className="btn-outline mt-3 inline-block">
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const publishedCount = courses.filter((c) => c.is_published).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-card p-6 md:p-8 animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-blue-900">Gestione Corsi</h1>
              <p className="text-slate-400 mt-0.5">
                {courses.length} corsi totali, {publishedCount} pubblicati
              </p>
            </div>
          </div>
          <Link href="/admin" className="btn-outline flex items-center gap-2 text-sm">
            <ChevronLeft className="w-4 h-4" />
            Admin Panel
          </Link>
        </div>
      </div>

      {/* Instructions */}
      <div className="card p-4 flex items-start gap-3 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold mb-0.5">Come aggiungere corsi</p>
          <p className="text-slate-500">
            Inserisci i corsi direttamente da{" "}
            <a
              href={`https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL?.split(".")?.[0]?.split("//")[1]}/editor`}
              target="_blank"
              rel="noopener"
              className="text-blue-600 underline font-medium"
            >
              Supabase Table Editor
            </a>{" "}
            o tramite l&apos;API. Il form di creazione corsi e in sviluppo.
          </p>
        </div>
      </div>

      {/* Courses Table */}
      <div className="card overflow-hidden animate-fade-in-up" style={{ animationDelay: "160ms" }}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-blue-100 bg-blue-50/50">
              <th className="text-left p-4 text-xs font-bold text-blue-900 uppercase tracking-wider">Corso</th>
              <th className="text-left p-4 text-xs font-bold text-blue-900 uppercase tracking-wider hidden sm:table-cell">Categoria</th>
              <th className="text-left p-4 text-xs font-bold text-blue-900 uppercase tracking-wider hidden md:table-cell">Livello</th>
              <th className="text-right p-4 text-xs font-bold text-blue-900 uppercase tracking-wider hidden sm:table-cell">Lezioni</th>
              <th className="text-right p-4 text-xs font-bold text-blue-900 uppercase tracking-wider hidden md:table-cell">XP</th>
              <th className="text-right p-4 text-xs font-bold text-blue-900 uppercase tracking-wider hidden lg:table-cell">Prezzo</th>
              <th className="text-center p-4 text-xs font-bold text-blue-900 uppercase tracking-wider">Stato</th>
              <th className="text-center p-4 text-xs font-bold text-blue-900 uppercase tracking-wider w-20">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course: any) => {
              const lessonCount = course.lessons?.[0]?.count ?? course.lessons_count ?? 0;
              return (
                <tr
                  key={course.id}
                  className="border-b border-blue-50 hover:bg-blue-50/50 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-blue-900 truncate">{course.title}</p>
                        <p className="text-xs text-slate-400 truncate sm:hidden">
                          {CATEGORY_LABELS[course.category] ?? course.category}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 hidden sm:table-cell">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_CHIPS[course.category] ?? "bg-slate-100 text-slate-600"}`}>
                      {CATEGORY_LABELS[course.category] ?? course.category}
                    </span>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${LEVEL_CHIPS[course.level] ?? "bg-slate-100 text-slate-600"}`}>
                      {course.level}
                    </span>
                  </td>
                  <td className="p-4 text-right hidden sm:table-cell">
                    <span className="text-sm text-slate-500 font-medium">{lessonCount}</span>
                  </td>
                  <td className="p-4 text-right hidden md:table-cell">
                    {course.xp_reward && (
                      <span className="badge-xp">
                        <TrendingUp className="w-3 h-3" />
                        +{course.xp_reward}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right hidden lg:table-cell">
                    <span className="text-sm text-slate-500 font-medium">
                      {course.price_cents > 0
                        ? `${(course.price_cents / 100).toFixed(2)} EUR`
                        : "Gratis"}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => togglePublish(course.id, course.is_published)}
                      disabled={updatingId === course.id}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                        course.is_published
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      } disabled:opacity-50`}
                    >
                      {updatingId === course.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : course.is_published ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                      {course.is_published ? "Live" : "Bozza"}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <Link
                      href={`/courses/${course.id}`}
                      className="p-2 rounded-lg hover:bg-blue-100 transition-colors text-slate-400 hover:text-blue-800 inline-flex cursor-pointer"
                      title="Vedi corso"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {courses.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 text-blue-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Nessun corso ancora creato.</p>
          </div>
        )}
      </div>
    </div>
  );
}
