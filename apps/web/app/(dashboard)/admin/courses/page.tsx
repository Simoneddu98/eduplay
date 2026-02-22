"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Plus,
  BookOpen,
  Edit,
  Eye,
  EyeOff,
  ChevronRight,
  Loader2,
  Trash2,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  "digital-marketing": "Digital Marketing",
  ai: "Intelligenza Artificiale",
  sales: "Vendite",
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
      .from("profiles").select("role").eq("id", user.id).single();

    if (profile?.role !== "admin") { setIsLoading(false); return; }
    setIsAdmin(true);

    const { data } = await supabase
      .from("courses")
      .select("*, lessons(count)")
      .order("category", { ascending: true })
      .order("level", { ascending: true });

    setCourses(data ?? []);
    setIsLoading(false);
  };

  const togglePublish = async (id: string, current: boolean) => {
    setUpdatingId(id);
    await supabase
      .from("courses")
      .update({ is_published: !current, updated_at: new Date().toISOString() })
      .eq("id", id);
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_published: !current } : c))
    );
    setUpdatingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-80">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <p className="text-gray-500">Accesso negato.</p>
        <Link href="/dashboard" className="btn-outline mt-3 inline-block">
          ← Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestione Corsi</h1>
          <p className="text-gray-400 mt-1">{courses.length} corsi totali</p>
        </div>
        <Link href="/admin" className="btn-outline flex items-center gap-2 text-sm">
          ← Admin
        </Link>
      </div>

      {/* Instructions for adding courses */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-700">
        <p className="font-semibold mb-1">💡 Come aggiungere corsi</p>
        <p>
          Inserisci i corsi direttamente da{" "}
          <a
            href={`https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL?.split(".")?.[0]?.split("//")[1]}/editor`}
            target="_blank"
            rel="noopener"
            className="underline"
          >
            Supabase Table Editor
          </a>{" "}
          o tramite l'API. Il form di creazione corsi è in sviluppo.
        </p>
      </div>

      <div className="space-y-3">
        {courses.map((course: any) => {
          const lessonCount = course.lessons?.[0]?.count ?? 0;
          return (
            <div
              key={course.id}
              className="card flex items-center gap-4"
            >
              {/* Cover placeholder */}
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6 text-primary/40" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-gray-900 truncate">{course.title}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      course.is_published
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {course.is_published ? "Pubblicato" : "Bozza"}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {CATEGORY_LABELS[course.category] ?? course.category} ·{" "}
                  {course.level} · {lessonCount} lezioni
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => togglePublish(course.id, course.is_published)}
                  disabled={updatingId === course.id}
                  title={course.is_published ? "Nascondi" : "Pubblica"}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  {updatingId === course.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : course.is_published ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>

                <Link
                  href={`/courses/${course.id}`}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-primary"
                  title="Vedi corso"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })}

        {courses.length === 0 && (
          <div className="text-center py-16 card">
            <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Nessun corso ancora creato.</p>
          </div>
        )}
      </div>
    </div>
  );
}
