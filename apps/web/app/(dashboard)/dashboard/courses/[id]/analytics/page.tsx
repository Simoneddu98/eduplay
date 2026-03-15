import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Users, BookOpen, TrendingUp, Clock, Award } from "lucide-react";
import Link from "next/link";

interface Props { params: Promise<{ id: string }> }

export default async function CourseAnalyticsPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: course } = await (supabase as any)
    .from("courses")
    .select("id, title, created_by, status, lessons_count")
    .eq("id", id)
    .single();

  if (!course) notFound();

  // Enrollments
  const { count: enrollCount } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", id);

  // Completions
  const { count: completionCount } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", id)
    .not("completed_at", "is", null);

  // Average progress
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("progress_pct")
    .eq("course_id", id);

  const avgProgress = enrollments?.length
    ? Math.round(enrollments.reduce((s, e) => s + (e.progress_pct ?? 0), 0) / enrollments.length)
    : 0;

  // Quiz stats
  const { data: quizAttempts } = await supabase
    .from("quiz_attempts")
    .select("score, passed")
    .in(
      "lesson_id",
      // Get lesson IDs for this course
      (await supabase.from("lessons").select("id").eq("course_id", id)).data?.map((l) => l.id) ?? []
    );

  const passRate = quizAttempts?.length
    ? Math.round((quizAttempts.filter((q) => q.passed).length / quizAttempts.length) * 100)
    : null;

  const avgScore = quizAttempts?.length
    ? Math.round(quizAttempts.reduce((s, q) => s + (q.score ?? 0), 0) / quizAttempts.length)
    : null;

  const completionRate = enrollCount ? Math.round(((completionCount ?? 0) / enrollCount) * 100) : 0;

  const stats = [
    { label: "Iscritti totali", value: enrollCount ?? 0, icon: Users, color: "text-blue-400", bg: "bg-blue-900/20" },
    { label: "Completamenti", value: completionCount ?? 0, icon: Award, color: "text-green-400", bg: "bg-green-900/20" },
    { label: "Tasso completamento", value: `${completionRate}%`, icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-900/20" },
    { label: "Progresso medio", value: `${avgProgress}%`, icon: Clock, color: "text-amber-400", bg: "bg-amber-900/20" },
  ];

  return (
    <div className="min-h-screen bg-[#0F0F0F] p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href={`/dashboard/courses/${id}`}
          className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
          aria-label="Torna all'editor"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Analitiche</h1>
          <p className="text-sm text-slate-400">{(course as Record<string, unknown>).title as string}</p>
        </div>
        <span className={`ml-auto text-xs px-2 py-1 rounded-full border font-medium ${
          (course as Record<string, unknown>).status === "published"
            ? "bg-green-900/30 border-green-700 text-green-400"
            : "bg-amber-900/30 border-amber-700 text-amber-400"
        }`}>
          {(course as Record<string, unknown>).status === "published" ? "Pubblicato" : "Bozza"}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Quiz stats */}
      {quizAttempts && quizAttempts.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-400" />
            Statistiche Quiz
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xl font-bold text-white">{quizAttempts.length}</p>
              <p className="text-xs text-slate-400">Tentativi totali</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-400">{passRate}%</p>
              <p className="text-xs text-slate-400">Tasso superamento</p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-400">{avgScore}%</p>
              <p className="text-xs text-slate-400">Punteggio medio</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state for unpublished */}
      {(course as Record<string, unknown>).status === "draft" && (
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
          <TrendingUp className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            Le analitiche saranno disponibili dopo la pubblicazione del corso.
          </p>
          <Link
            href={`/dashboard/courses/${id}`}
            className="text-purple-400 text-sm mt-2 hover:underline inline-block"
          >
            Vai all&apos;editor →
          </Link>
        </div>
      )}

      {enrollCount === 0 && (course as Record<string, unknown>).status === "published" && (
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Nessun iscritto ancora. Condividi il link del corso!</p>
        </div>
      )}
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return { title: `Analitiche corso — Agenfor Lab` };
}
