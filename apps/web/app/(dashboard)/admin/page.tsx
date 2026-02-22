import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  BookOpen,
  Zap,
  TrendingUp,
  Award,
  PlayCircle,
  ShieldAlert,
} from "lucide-react";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-gray-800">Accesso negato</h1>
        <p className="text-gray-400 mt-1">Questa sezione è riservata agli amministratori.</p>
        <Link href="/dashboard" className="btn-outline mt-4 inline-block">
          ← Dashboard
        </Link>
      </div>
    );
  }

  // Fetch stats in parallel
  const [
    { count: userCount },
    { count: courseCount },
    { count: enrollmentCount },
    { count: lessonCount },
    { data: topStudents },
    { data: recentEnrollments },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("courses").select("*", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("enrollments").select("*", { count: "exact", head: true }),
    supabase.from("lessons").select("*", { count: "exact", head: true }).eq("is_published", true),
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, xp_total, level")
      .eq("role", "student")
      .order("xp_total", { ascending: false })
      .limit(5),
    supabase
      .from("enrollments")
      .select("enrolled_at, progress_pct, profiles(full_name), courses(title)")
      .order("enrolled_at", { ascending: false })
      .limit(5),
  ]);

  const stats = [
    { label: "Studenti", value: userCount ?? 0, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Corsi attivi", value: courseCount ?? 0, icon: BookOpen, color: "text-green-500", bg: "bg-green-50" },
    { label: "Iscrizioni", value: enrollmentCount ?? 0, icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Lezioni", value: lessonCount ?? 0, icon: PlayCircle, color: "text-orange-500", bg: "bg-orange-50" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-400 mt-1">Gestisci la piattaforma EduPlay</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/courses" className="btn-outline flex items-center gap-2 text-sm">
            <BookOpen className="w-4 h-4" />
            Gestisci Corsi
          </Link>
          <Link href="/admin/users" className="btn-primary flex items-center gap-2 text-sm">
            <Users className="w-4 h-4" />
            Gestisci Utenti
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card text-center">
            <div
              className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-2`}
            >
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString("it-IT")}</p>
            <p className="text-sm text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top students */}
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-500" />
            Top Studenti per XP
          </h2>
          <ol className="space-y-3">
            {(topStudents ?? []).map((s: any, i: number) => (
              <li key={s.id} className="flex items-center gap-3">
                <span className="w-6 text-sm font-bold text-gray-400">#{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-bold text-primary">
                  {(s.full_name ?? "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{s.full_name ?? "—"}</p>
                  <p className="text-xs text-gray-400">Lv.{s.level}</p>
                </div>
                <div className="flex items-center gap-1 text-yellow-600 text-xs font-semibold">
                  <Zap className="w-3 h-3" />
                  {(s.xp_total ?? 0).toLocaleString("it-IT")}
                </div>
              </li>
            ))}
            {(topStudents ?? []).length === 0 && (
              <p className="text-gray-400 text-sm">Nessuno studente registrato.</p>
            )}
          </ol>
        </div>

        {/* Recent enrollments */}
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            Iscrizioni Recenti
          </h2>
          <ul className="space-y-3">
            {(recentEnrollments ?? []).map((e: any, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">
                    {(e.profiles as any)?.full_name ?? "—"}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {(e.courses as any)?.title ?? "—"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-primary font-semibold">{e.progress_pct}%</span>
                  <p className="text-xs text-gray-400">
                    {new Date(e.enrolled_at).toLocaleDateString("it-IT")}
                  </p>
                </div>
              </li>
            ))}
            {(recentEnrollments ?? []).length === 0 && (
              <p className="text-gray-400 text-sm">Nessuna iscrizione recente.</p>
            )}
          </ul>
        </div>
      </div>

      {/* Quick admin actions */}
      <div className="card">
        <h2 className="font-bold text-gray-900 mb-4">Azioni Rapide</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Link
            href="/admin/courses"
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-primary/30 hover:bg-primary/5 transition-all text-sm text-gray-700"
          >
            <BookOpen className="w-4 h-4 text-primary" />
            Nuovo corso
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-primary/30 hover:bg-primary/5 transition-all text-sm text-gray-700"
          >
            <Users className="w-4 h-4 text-blue-500" />
            Gestisci utenti
          </Link>
          <Link
            href="/leaderboard"
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-primary/30 hover:bg-primary/5 transition-all text-sm text-gray-700"
          >
            <Award className="w-4 h-4 text-yellow-500" />
            Classifica
          </Link>
        </div>
      </div>
    </div>
  );
}
