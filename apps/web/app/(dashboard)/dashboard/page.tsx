import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Trophy,
  Target,
  Bot,
  Award,
  Flame,
  Zap,
  Coins,
  CheckCircle2,
} from "lucide-react";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: enrollments }, { data: missions }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("enrollments")
        .select(
          "*, course:courses(id, title, description, cover_url, category)"
        )
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: false })
        .limit(3),
      supabase
        .from("user_missions")
        .select("*, mission:missions(*)")
        .eq("user_id", user.id)
        .is("completed_at", null)
        .order("assigned_at", { ascending: false })
        .limit(3),
    ]);

  const level = profile?.level ?? 1;
  const xp = profile?.xp_total ?? 0;
  const nextLevelXP = LEVEL_XP[Math.min(level + 1, 6)] ?? 15000;
  const currentLevelXP = LEVEL_XP[level] ?? 0;
  const progressPct =
    level >= 6
      ? 100
      : Math.min(
          100,
          ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100
        );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Section 1: Welcome Hero Card */}
      <div className="glass-card p-6 bg-gradient-to-r from-blue-50/80 to-indigo-50/80">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-poppins text-slate-900">
              Ciao, {profile?.full_name?.split(" ")[0] ?? "Campione"}!
            </h1>
            <p className="text-slate-500 mt-1">
              Continua il tuo percorso di apprendimento
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="badge-level text-sm px-3 py-1.5">
              <Zap className="w-4 h-4" />
              Lv.{level} {LEVEL_NAMES[level]}
            </span>
            <div className="hidden sm:block w-32">
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>{xp.toLocaleString()} XP</span>
                {level < 6 && <span>{nextLevelXP.toLocaleString()}</span>}
              </div>
              <div className="xp-bar">
                <div
                  className="xp-bar-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak */}
        <div className="card p-4 hover:shadow-md transition-all duration-200 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Flame className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold font-poppins text-slate-900">
                {profile?.streak_current ?? 0}
              </p>
              <p className="text-xs text-slate-500">Giorni streak</p>
            </div>
          </div>
        </div>

        {/* XP */}
        <div className="card p-4 hover:shadow-md transition-all duration-200 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold font-poppins text-slate-900">
                {xp.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">XP totale</p>
            </div>
          </div>
        </div>

        {/* EduCoins */}
        <div className="card p-4 hover:shadow-md transition-all duration-200 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Coins className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold font-poppins text-slate-900">
                {(profile?.edu_coins ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">EduCoins</p>
            </div>
          </div>
        </div>

        {/* Corsi iscritti */}
        <div className="card p-4 hover:shadow-md transition-all duration-200 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold font-poppins text-slate-900">
                {enrollments?.length ?? 0}
              </p>
              <p className="text-xs text-slate-500">Corsi iscritti</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Continua ad imparare */}
      {enrollments && enrollments.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold font-poppins text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Continua ad imparare
            </h2>
            <Link
              href="/courses"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors cursor-pointer"
            >
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
                  className="card-hover p-4 group"
                >
                  <div className="h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl mb-3 overflow-hidden flex items-center justify-center">
                    {course.cover_url ? (
                      <img
                        src={course.cover_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="w-10 h-10 text-blue-300" />
                    )}
                  </div>
                  {course.category && (
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                      {course.category}
                    </span>
                  )}
                  <h3 className="font-bold text-slate-900 mt-1 group-hover:text-blue-700 transition-colors">
                    {course.title}
                  </h3>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Progresso</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="xp-bar">
                      <div
                        className="xp-bar-fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <button className="btn-primary text-xs px-4 py-2 mt-3 w-full">
                    Continua
                  </button>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty state */}
      {(!enrollments || enrollments.length === 0) && (
        <div className="glass-card p-12 text-center">
          <BookOpen className="w-16 h-16 text-blue-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold font-poppins text-slate-900 mb-2">
            Inizia il tuo percorso!
          </h2>
          <p className="text-slate-500 mb-6">
            Scegli il tuo primo corso e inizia a guadagnare XP
          </p>
          <Link href="/courses" className="btn-primary inline-flex">
            Esplora i corsi
          </Link>
        </div>
      )}

      {/* Section 4: Quick Actions */}
      <section>
        <h2 className="text-lg font-bold font-poppins text-slate-900 mb-4">
          Azioni rapide
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/leaderboard"
            className="card-hover p-5 flex flex-col items-center text-center gap-3"
          >
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-yellow-500" />
            </div>
            <span className="text-sm font-semibold text-slate-800">
              Classifica
            </span>
          </Link>
          <Link
            href="/missions"
            className="card-hover p-5 flex flex-col items-center text-center gap-3"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-purple-500" />
            </div>
            <span className="text-sm font-semibold text-slate-800">
              Missioni
            </span>
          </Link>
          <Link
            href="/ai-tutor"
            className="card-hover p-5 flex flex-col items-center text-center gap-3"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-blue-500" />
            </div>
            <span className="text-sm font-semibold text-slate-800">
              AI Tutor
            </span>
          </Link>
          <Link
            href="/profile"
            className="card-hover p-5 flex flex-col items-center text-center gap-3"
          >
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6 text-green-500" />
            </div>
            <span className="text-sm font-semibold text-slate-800">Badge</span>
          </Link>
        </div>
      </section>

      {/* Section 5: Missioni del giorno */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold font-poppins text-slate-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Missioni del giorno
          </h2>
          <Link
            href="/missions"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors cursor-pointer"
          >
            Vedi tutte
          </Link>
        </div>
        {missions && missions.length > 0 ? (
          <div className="space-y-3">
            {missions.map((um: any) => {
              const mission = um.mission;
              if (!mission) return null;
              const missionProgress = um.progress ?? 0;
              const missionTarget = mission.condition_value ?? 1;
              const missionPct = Math.min(
                100,
                (missionProgress / missionTarget) * 100
              );
              const completed = missionProgress >= missionTarget;
              return (
                <div
                  key={um.id}
                  className="card p-4 flex items-center gap-4"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      completed
                        ? "bg-green-100 text-green-600"
                        : "bg-blue-100 text-blue-400"
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        completed
                          ? "text-slate-400 line-through"
                          : "text-slate-800"
                      }`}
                    >
                      {mission.title ?? "Missione"}
                    </p>
                    <div className="mt-1.5">
                      <div className="xp-bar h-1.5">
                        <div
                          className="xp-bar-fill"
                          style={{ width: `${missionPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <span className="badge-xp text-[10px] flex-shrink-0">
                    <Zap className="w-3 h-3" />+{mission.xp_reward ?? 0} XP
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card p-6 text-center">
            <Target className="w-10 h-10 text-blue-200 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              Nessuna missione attiva al momento
            </p>
            <Link
              href="/missions"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-2 inline-block cursor-pointer"
            >
              Scopri le missioni
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
