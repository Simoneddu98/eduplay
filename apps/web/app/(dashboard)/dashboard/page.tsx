import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Trophy, Target, Flame, Zap, TrendingUp } from "lucide-react";

const LEVEL_XP: Record<number, number> = {
  1: 0,
  2: 500,
  3: 1500,
  4: 3500,
  5: 7500,
  6: 15000,
};

const LEVEL_NAMES: Record<number, string> = {
  1: "Novizio",
  2: "Apprendista",
  3: "Praticante",
  4: "Esperto",
  5: "Master",
  6: "Guru",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: enrollments }, { data: recentActivity }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("enrollments")
      .select("*, course:courses(id, title, description, cover_url, category)")
      .eq("user_id", user.id)
      .order("enrolled_at", { ascending: false })
      .limit(3),
    supabase
      .from("xp_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const level = profile?.level ?? 1;
  const xp = profile?.xp_total ?? 0;
  const nextLevelXP = LEVEL_XP[Math.min(level + 1, 6)] ?? 15000;
  const currentLevelXP = LEVEL_XP[level] ?? 0;
  const progressPct = level >= 6
    ? 100
    : Math.min(100, ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bentornato, {profile?.full_name?.split(" ")[0] ?? "Campione"}! 👋
          </h1>
          <p className="text-gray-500 mt-1">Continua la tua avventura di apprendimento</p>
        </div>
        {profile?.streak_current > 0 && (
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-xs text-orange-600">Streak attivo</p>
              <p className="text-lg font-black text-orange-600">{profile.streak_current} giorni</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Level + XP */}
        <div className="bg-gradient-to-br from-primary to-accent rounded-2xl p-5 text-white col-span-1 sm:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-white/70 text-sm">Livello attuale</p>
              <p className="text-3xl font-black">Lv.{level} — {LEVEL_NAMES[level]}</p>
            </div>
            <Zap className="w-10 h-10 text-yellow-400" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-white/70">
              <span>{xp.toLocaleString()} XP</span>
              {level < 6 && <span>{nextLevelXP.toLocaleString()} XP</span>}
            </div>
            <div className="xp-bar">
              <div className="xp-bar-fill" style={{ width: `${progressPct}%` }} />
            </div>
            {level < 6 && (
              <p className="text-xs text-white/60">
                Mancano {(nextLevelXP - xp).toLocaleString()} XP al prossimo livello
              </p>
            )}
          </div>
        </div>

        {/* EduCoins */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-sm mb-1">EduCoins</p>
          <p className="text-2xl font-black text-yellow-500">🪙 {(profile?.edu_coins ?? 0).toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-2">Valuta virtuale</p>
        </div>

        {/* Corsi iscritti */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-sm mb-1">Corsi attivi</p>
          <p className="text-2xl font-black text-primary">{enrollments?.length ?? 0}</p>
          <Link href="/courses" className="text-xs text-accent hover:underline mt-2 block">
            Esplora tutti i corsi →
          </Link>
        </div>
      </div>

      {/* Continue Learning */}
      {enrollments && enrollments.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Continua a studiare
            </h2>
            <Link href="/courses" className="text-sm text-accent hover:underline">
              Vedi tutti
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {enrollments.map((enrollment: any) => {
              const course = enrollment.course;
              if (!course) return null;
              const progress = enrollment.progress_pct ?? 0;
              return (
                <Link
                  key={enrollment.id}
                  href={`/courses/${course.id}`}
                  className="card card-hover group"
                >
                  <div className="h-32 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl mb-3 overflow-hidden flex items-center justify-center">
                    {course.cover_url ? (
                      <img src={course.cover_url} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="w-10 h-10 text-primary/40" />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-accent uppercase tracking-wide">
                    {course.category}
                  </span>
                  <h3 className="font-bold text-gray-900 mt-1 group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progresso</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty state - no enrollments */}
      {(!enrollments || enrollments.length === 0) && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Inizia il tuo percorso!</h2>
          <p className="text-gray-500 mb-6">
            Scegli il tuo primo corso e inizia a guadagnare XP
          </p>
          <Link href="/courses" className="btn-primary inline-flex">
            Esplora i corsi
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/leaderboard" className="flex items-center gap-4 bg-white rounded-2xl p-5 border border-gray-200 hover:border-primary/30 hover:shadow-md transition-all duration-150">
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Trophy className="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Classifica</p>
            <p className="text-sm text-gray-500">Sfida gli altri studenti</p>
          </div>
        </Link>

        <Link href="/missions" className="flex items-center gap-4 bg-white rounded-2xl p-5 border border-gray-200 hover:border-primary/30 hover:shadow-md transition-all duration-150">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Target className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Missioni</p>
            <p className="text-sm text-gray-500">Completa le sfide settimanali</p>
          </div>
        </Link>

        <Link href="/ai-tutor" className="flex items-center gap-4 bg-white rounded-2xl p-5 border border-gray-200 hover:border-primary/30 hover:shadow-md transition-all duration-150">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">AI Tutor</p>
            <p className="text-sm text-gray-500">Chiedi aiuto al tuo tutor</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
