import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  BookOpen,
  Zap,
  TrendingUp,
  Award,
  ShieldAlert,
  ShieldCheck,
  Flame,
  Eye,
  EyeOff,
} from "lucide-react";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return (
      <div className="max-w-xl mx-auto text-center py-20 animate-fade-in-up">
        <div className="glass-card p-8">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-blue-900">Accesso negato</h1>
          <p className="text-slate-400 mt-1">Questa sezione e riservata agli amministratori.</p>
          <Link href="/dashboard" className="btn-outline mt-4 inline-block">
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const [
    { count: userCount },
    { count: courseCount },
    { count: enrollmentCount },
    { data: profiles },
    { data: topStudents },
    { data: recentCourses },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("courses").select("*", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("enrollments").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*").eq("role", "student"),
    supabase
      .from("profiles")
      .select("*")
      .order("xp_total", { ascending: false })
      .limit(8),
    supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const avgXp = profiles && profiles.length > 0
    ? Math.round(profiles.reduce((sum: number, p: any) => sum + (p.xp_total ?? 0), 0) / profiles.length)
    : 0;

  const CATEGORY_CHIPS: Record<string, string> = {
    "digital-marketing": "bg-blue-100 text-blue-700",
    ai: "bg-purple-100 text-purple-700",
    sales: "bg-green-100 text-green-700",
  };

  const CATEGORY_LABELS: Record<string, string> = {
    "digital-marketing": "Digital Marketing",
    ai: "AI",
    sales: "Vendite",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-card p-6 md:p-8 animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-blue-900">Admin Panel</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Admin</span>
              </div>
              <p className="text-slate-400 mt-0.5">Gestisci la piattaforma EduPlay</p>
            </div>
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
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <div className="glass-card p-5 text-center">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-2">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-blue-900">{(userCount ?? 0).toLocaleString("it-IT")}</p>
          <p className="text-xs text-slate-400 font-medium">Utenti Totali</p>
        </div>
        <div className="glass-card p-5 text-center">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-2">
            <BookOpen className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-extrabold text-blue-900">{(courseCount ?? 0).toLocaleString("it-IT")}</p>
          <p className="text-xs text-slate-400 font-medium">Corsi Pubblicati</p>
        </div>
        <div className="glass-card p-5 text-center">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mx-auto mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-blue-900">{(enrollmentCount ?? 0).toLocaleString("it-IT")}</p>
          <p className="text-xs text-slate-400 font-medium">Iscrizioni Totali</p>
        </div>
        <div className="glass-card p-5 text-center">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-2">
            <Zap className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-blue-900">{avgXp.toLocaleString("it-IT")}</p>
          <p className="text-xs text-slate-400 font-medium">XP Medio</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users Table */}
        <div className="card p-6 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-blue-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Utenti Recenti
            </h2>
            <Link href="/admin/users" className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer">
              Vedi tutti
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-blue-100">
                  <th className="text-left pb-3 text-xs font-bold text-blue-900 uppercase tracking-wider">Utente</th>
                  <th className="text-left pb-3 text-xs font-bold text-blue-900 uppercase tracking-wider">Livello</th>
                  <th className="text-right pb-3 text-xs font-bold text-blue-900 uppercase tracking-wider">XP</th>
                  <th className="text-right pb-3 text-xs font-bold text-blue-900 uppercase tracking-wider">Streak</th>
                </tr>
              </thead>
              <tbody>
                {(topStudents ?? []).map((s: any) => (
                  <tr key={s.id} className="border-b border-blue-50 hover:bg-blue-50/50 transition-colors">
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-200 to-blue-100 flex items-center justify-center text-blue-800 font-bold text-xs flex-shrink-0">
                          {(s.full_name ?? s.email ?? "?")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-blue-900 truncate">{s.full_name ?? "---"}</p>
                          <p className="text-xs text-slate-400 truncate">{s.email}</p>
                        </div>
                        {s.role === "admin" && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 flex-shrink-0">A</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="badge-level">Lv.{s.level}</span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="badge-xp">
                        <Zap className="w-3 h-3" />
                        {(s.xp_total ?? 0).toLocaleString("it-IT")}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {(s.streak_current ?? 0) > 0 && (
                        <span className="badge-streak">
                          <Flame className="w-3 h-3" />
                          {s.streak_current}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(topStudents ?? []).length === 0 && (
              <p className="text-slate-400 text-sm text-center py-6">Nessuno studente registrato.</p>
            )}
          </div>
        </div>

        {/* Courses Table */}
        <div className="card p-6 animate-fade-in-up" style={{ animationDelay: "240ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-blue-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-green-500" />
              Corsi
            </h2>
            <Link href="/admin/courses" className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer">
              Gestisci
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-blue-100">
                  <th className="text-left pb-3 text-xs font-bold text-blue-900 uppercase tracking-wider">Corso</th>
                  <th className="text-left pb-3 text-xs font-bold text-blue-900 uppercase tracking-wider">Livello</th>
                  <th className="text-right pb-3 text-xs font-bold text-blue-900 uppercase tracking-wider">XP</th>
                  <th className="text-center pb-3 text-xs font-bold text-blue-900 uppercase tracking-wider">Stato</th>
                </tr>
              </thead>
              <tbody>
                {(recentCourses ?? []).map((c: any) => (
                  <tr key={c.id} className="border-b border-blue-50 hover:bg-blue-50/50 transition-colors">
                    <td className="py-3 pr-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-blue-900 truncate">{c.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_CHIPS[c.category] ?? "bg-slate-100 text-slate-600"}`}>
                          {CATEGORY_LABELS[c.category] ?? c.category}
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="text-xs font-semibold text-slate-500 capitalize">{c.level}</span>
                    </td>
                    <td className="py-3 text-right">
                      {c.xp_reward && (
                        <span className="badge-xp">
                          <TrendingUp className="w-3 h-3" />
                          +{c.xp_reward}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {c.is_published ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                          <Eye className="w-3 h-3" />
                          Live
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                          <EyeOff className="w-3 h-3" />
                          Bozza
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(recentCourses ?? []).length === 0 && (
              <p className="text-slate-400 text-sm text-center py-6">Nessun corso creato.</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6 animate-fade-in-up" style={{ animationDelay: "320ms" }}>
        <h2 className="font-bold text-blue-900 mb-4">Azioni Rapide</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <Link
            href="/admin/courses"
            className="flex items-center gap-3 p-4 rounded-xl border border-blue-100 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900">Aggiungi Corso</p>
              <p className="text-xs text-slate-400">Crea un nuovo corso</p>
            </div>
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-3 p-4 rounded-xl border border-blue-100 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900">Gestisci Utenti</p>
              <p className="text-xs text-slate-400">Visualizza e gestisci</p>
            </div>
          </Link>
          <Link
            href="/leaderboard"
            className="flex items-center gap-3 p-4 rounded-xl border border-blue-100 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <Award className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900">Classifica</p>
              <p className="text-xs text-slate-400">Vedi la leaderboard</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
