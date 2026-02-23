import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Zap,
  Target,
  Trophy,
  Flame,
  Star,
  Coins,
  Award,
  Timer,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────── */
const MISSION_ICONS: Record<string, { icon: typeof Target; color: string; bg: string }> = {
  lessons: { icon: Target, color: "text-blue-600", bg: "bg-blue-100" },
  quiz: { icon: Zap, color: "text-amber-600", bg: "bg-amber-100" },
  streak: { icon: Flame, color: "text-red-500", bg: "bg-red-100" },
  default: { icon: Trophy, color: "text-purple-600", bg: "bg-purple-100" },
};

/* ── Progress Bar ──────────────────────────────────────────── */
function ProgressBar({
  current,
  target,
}: {
  current: number;
  target: number;
}) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-1.5">
        <span className="font-medium">
          {current} / {target}
        </span>
        <span className="font-semibold text-slate-500">{pct}%</span>
      </div>
      <div className="xp-bar">
        <div
          className={`xp-bar-fill ${pct >= 100 ? "!bg-green-500" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Streak Tracker ────────────────────────────────────────── */
function StreakTracker({ currentStreak }: { currentStreak: number }) {
  const today = new Date().getDay();
  const dayLabels = ["D", "L", "M", "M", "G", "V", "S"];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-5 h-5 text-red-500" aria-hidden="true" />
        <h3 className="font-bold font-poppins text-slate-800 text-sm">
          Streak Settimanale
        </h3>
        <span className="badge-streak ml-auto">
          <Flame className="w-3 h-3" aria-hidden="true" />
          {currentStreak} giorni
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        {dayLabels.map((label, i) => {
          const isToday = i === today;
          const isCompleted = i < today && i >= today - currentStreak;
          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">
                {label}
              </span>
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isToday
                      ? "border-2 border-blue-500 bg-blue-50 text-blue-600"
                      : "bg-slate-100 text-slate-300"
                }`}
                aria-label={
                  isCompleted
                    ? `${label}: completato`
                    : isToday
                      ? `${label}: oggi`
                      : `${label}: non completato`
                }
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                ) : isToday ? (
                  <Flame className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-current" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MISSIONS PAGE
   ══════════════════════════════════════════════════════════════ */
export default async function MissionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  // Fetch missions, user_missions, profile
  const [{ data: missions }, { data: userMissions }, { data: profile }] =
    await Promise.all([
      supabase
        .from("missions")
        .select("*")
        .eq("is_active", true)
        .order("type"),
      supabase.from("user_missions").select("*").eq("user_id", user.id),
      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single(),
    ]);

  const userMissionMap = new Map(
    (userMissions ?? []).map((um: any) => [um.mission_id, um])
  );

  const daily = (missions ?? []).filter(
    (m: any) => m.type === "daily"
  );
  const weekly = (missions ?? []).filter(
    (m: any) => m.type === "weekly"
  );
  const special = (missions ?? []).filter(
    (m: any) => m.type === "special"
  );

  // Calculate actual progress
  const [
    { count: lessonsToday },
    { count: quizzesToday },
    { count: lessonsThisWeek },
  ] = await Promise.all([
    supabase
      .from("lesson_completions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("completed_at", todayStart.toISOString()),
    supabase
      .from("quiz_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", todayStart.toISOString()),
    supabase
      .from("lesson_completions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("completed_at", weekStart.toISOString()),
  ]);

  function getMissionProgress(mission: any) {
    const um = userMissionMap.get(mission.id);
    if (um?.completed_at)
      return { current: mission.condition_value, completed: true };

    const type = mission.type;
    const req = mission.condition_type ?? "";
    let current = um?.progress ?? 0;

    if (req === "lessons" && type === "daily")
      current = Math.max(current, lessonsToday ?? 0);
    if (req === "quiz" && type === "daily")
      current = Math.max(current, quizzesToday ?? 0);
    if (req === "lessons" && type === "weekly")
      current = Math.max(current, lessonsThisWeek ?? 0);

    const completed = current >= mission.condition_value;
    return { current: Math.min(current, mission.condition_value), completed };
  }

  // Daily progress summary
  const dailyCompleted = daily.filter(
    (m: any) => getMissionProgress(m).completed
  ).length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-poppins text-slate-900">
            Le tue Missioni
          </h1>
          <p className="text-slate-500 mt-1">
            Completa le missioni per guadagnare XP ed EduCoins
          </p>
        </div>

        {/* Daily progress + profile stats */}
        {profile && (
          <div className="flex items-center gap-4">
            <div className="glass-card px-4 py-2.5 flex items-center gap-3">
              <div>
                <p className="text-xs text-slate-400">Progresso giornaliero</p>
                <p className="font-bold font-poppins text-slate-800 text-lg">
                  {dailyCompleted}/{daily.length}
                </p>
              </div>
              <div className="w-12 h-12 relative">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#22C55E"
                    strokeWidth="3"
                    strokeDasharray={`${daily.length > 0 ? (dailyCompleted / daily.length) * 100 : 0}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <div className="glass-card px-3 py-2 text-center">
                <p className="badge-streak">
                  <Flame className="w-3 h-3" aria-hidden="true" />
                  {profile.streak_current}
                </p>
              </div>
              <div className="glass-card px-3 py-2 text-center">
                <p className="badge-coins">
                  <Coins className="w-3 h-3" aria-hidden="true" />
                  {profile.edu_coins}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Streak Tracker ────────────────────────────────── */}
      <StreakTracker currentStreak={profile?.streak_current ?? 0} />

      {/* ── Daily Missions ────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-blue-600" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold font-poppins text-slate-900">
            Missioni Giornaliere
          </h2>
          <span className="text-xs text-slate-400 ml-1">
            Si aggiornano a mezzanotte
          </span>
          <span className="ml-auto badge-xp">
            <Zap className="w-3 h-3" aria-hidden="true" />
            {dailyCompleted}/{daily.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {daily.map((mission: any) => {
            const { current, completed } = getMissionProgress(mission);
            return (
              <MissionCard
                key={mission.id}
                mission={mission}
                current={current}
                completed={completed}
              />
            );
          })}
          {daily.length === 0 && (
            <p className="text-slate-400 text-sm col-span-2">
              Nessuna missione giornaliera attiva.
            </p>
          )}
        </div>
      </section>

      {/* ── Weekly Missions ───────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
            <Target
              className="w-4 h-4 text-purple-600"
              aria-hidden="true"
            />
          </div>
          <h2 className="text-lg font-bold font-poppins text-slate-900">
            Missioni Settimanali
          </h2>
          <span className="text-xs text-slate-400 ml-1">
            Si aggiornano ogni lunedi
          </span>
          <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
            <Target className="w-3 h-3" aria-hidden="true" />
            {weekly.filter((m: any) => getMissionProgress(m).completed).length}/
            {weekly.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {weekly.map((mission: any) => {
            const { current, completed } = getMissionProgress(mission);
            return (
              <MissionCard
                key={mission.id}
                mission={mission}
                current={current}
                completed={completed}
              />
            );
          })}
          {weekly.length === 0 && (
            <p className="text-slate-400 text-sm col-span-2">
              Nessuna missione settimanale attiva.
            </p>
          )}
        </div>
      </section>

      {/* ── Special Missions ──────────────────────────────── */}
      {special.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
              <Star
                className="w-4 h-4 text-amber-600"
                aria-hidden="true"
              />
            </div>
            <h2 className="text-lg font-bold font-poppins text-slate-900">
              Missioni Speciali
            </h2>
            <span className="badge-gold ml-2">
              <Award className="w-3 h-3" aria-hidden="true" />
              Limitate
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {special.map((mission: any) => {
              const { current, completed } = getMissionProgress(mission);
              return (
                <SpecialMissionCard
                  key={mission.id}
                  mission={mission}
                  current={current}
                  completed={completed}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

/* ── Mission Card ──────────────────────────────────────────── */
function MissionCard({
  mission,
  current,
  completed,
}: {
  mission: any;
  current: number;
  completed: boolean;
}) {
  const reqType = mission.condition_type ?? "default";
  const iconConfig =
    MISSION_ICONS[reqType] ?? MISSION_ICONS.default;
  const Icon = iconConfig.icon;

  return (
    <div
      className={`card-hover !p-0 overflow-hidden transition-all duration-200 ${
        completed ? "!border-green-200 !opacity-75" : ""
      }`}
    >
      <div className="p-5 flex items-start gap-4">
        {/* Left: icon */}
        <div
          className={`w-12 h-12 rounded-2xl ${iconConfig.bg} flex items-center justify-center shrink-0`}
        >
          <Icon
            className={`w-6 h-6 ${iconConfig.color}`}
            aria-hidden="true"
          />
        </div>

        {/* Center: content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3
              className={`font-semibold text-sm truncate ${
                completed ? "text-green-700" : "text-slate-800"
              }`}
            >
              {mission.title}
            </h3>
            {completed && (
              <CheckCircle2
                className="w-4 h-4 text-green-500 shrink-0"
                aria-label="Completata"
              />
            )}
          </div>
          <p className="text-xs text-slate-400 mb-3 line-clamp-2">
            {mission.description}
          </p>
          <ProgressBar current={current} target={mission.condition_value} />
        </div>

        {/* Right: rewards */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {mission.xp_reward > 0 && (
            <span className="badge-xp">
              <Zap className="w-3 h-3" aria-hidden="true" />+
              {mission.xp_reward} XP
            </span>
          )}
          {mission.coin_reward > 0 && (
            <span className="badge-coins">
              <Coins className="w-3 h-3" aria-hidden="true" />+
              {mission.coin_reward}
            </span>
          )}
          {completed && (
            <span className="text-xs font-semibold text-green-600">
              Completata!
            </span>
          )}
        </div>
      </div>

      {/* Type badge bar at bottom */}
      <div
        className={`px-5 py-2 text-xs font-medium border-t ${
          mission.type === "daily"
            ? "bg-blue-50/50 border-blue-100 text-blue-600"
            : "bg-purple-50/50 border-purple-100 text-purple-600"
        }`}
      >
        {mission.type === "daily" ? "Giornaliera" : "Settimanale"}
      </div>
    </div>
  );
}

/* ── Special Mission Card (larger) ─────────────────────────── */
function SpecialMissionCard({
  mission,
  current,
  completed,
}: {
  mission: any;
  current: number;
  completed: boolean;
}) {
  return (
    <div
      className={`glass-card p-6 border-2 transition-all duration-200 ${
        completed
          ? "border-green-300 opacity-75"
          : "border-amber-200 hover:border-amber-300 hover:shadow-lg"
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start gap-4">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center shrink-0">
          <Trophy className="w-7 h-7 text-amber-600" aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3
              className={`font-bold text-base ${
                completed ? "text-green-700" : "text-slate-800"
              }`}
            >
              {mission.title}
            </h3>
            {completed && (
              <CheckCircle2
                className="w-5 h-5 text-green-500"
                aria-label="Completata"
              />
            )}
            {mission.expires_at && !completed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                <Timer className="w-3 h-3" aria-hidden="true" />
                Scadenza attiva
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mb-4">
            {mission.description}
          </p>
          <ProgressBar current={current} target={mission.condition_value} />
        </div>

        {/* Rewards */}
        <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
          {mission.xp_reward > 0 && (
            <span className="badge-gold">
              <Zap className="w-3 h-3" aria-hidden="true" />+
              {mission.xp_reward} XP
            </span>
          )}
          {mission.coin_reward > 0 && (
            <span className="badge-coins">
              <Coins className="w-3 h-3" aria-hidden="true" />+
              {mission.coin_reward}
            </span>
          )}
          {completed && (
            <span className="text-sm font-bold text-green-600">
              Completata!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
