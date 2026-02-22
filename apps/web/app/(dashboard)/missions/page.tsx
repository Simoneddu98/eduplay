import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Calendar, CheckCircle2, Clock, Zap, Target, Trophy } from "lucide-react";

const MISSION_TYPE_LABELS: Record<string, string> = {
  daily: "Giornaliera",
  weekly: "Settimanale",
};

const MISSION_TYPE_COLORS: Record<string, string> = {
  daily: "bg-blue-100 text-blue-700",
  weekly: "bg-purple-100 text-purple-700",
};

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{current} / {target}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-green-500" : "bg-gradient-to-r from-primary to-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function MissionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  // Fetch missions, user_missions, profile
  const [
    { data: missions },
    { data: userMissions },
    { data: profile },
  ] = await Promise.all([
    supabase.from("missions").select("*").eq("is_active", true).order("mission_type"),
    supabase
      .from("user_missions")
      .select("*")
      .eq("user_id", user.id),
    supabase.from("profiles").select("xp_total, level, streak_current, edu_coins").eq("id", user.id).single(),
  ]);

  const userMissionMap = new Map(
    (userMissions ?? []).map((um: any) => [um.mission_id, um])
  );

  const daily = (missions ?? []).filter((m: any) => m.mission_type === "daily");
  const weekly = (missions ?? []).filter((m: any) => m.mission_type === "weekly");

  // Calculate actual progress for auto-missions based on today's activity
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
    if (um?.completed_at) return { current: mission.target_value, completed: true };

    // Auto-calculate progress based on mission_type and target
    const type = mission.mission_type;
    const req = mission.requirement_type ?? "";
    let current = um?.progress ?? 0;

    if (req === "lessons" && type === "daily") current = Math.max(current, lessonsToday ?? 0);
    if (req === "quiz" && type === "daily") current = Math.max(current, quizzesToday ?? 0);
    if (req === "lessons" && type === "weekly") current = Math.max(current, lessonsThisWeek ?? 0);

    const completed = current >= mission.target_value;
    return { current: Math.min(current, mission.target_value), completed };
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Missioni</h1>
          <p className="text-gray-500 mt-1">Completa le missioni per guadagnare XP ed EduCoins</p>
        </div>
        {profile && (
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="font-bold text-primary text-lg">{profile.streak_current}</p>
              <p className="text-gray-400 text-xs">🔥 Streak</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-yellow-600 text-lg">{profile.edu_coins}</p>
              <p className="text-gray-400 text-xs">🪙 EduCoins</p>
            </div>
          </div>
        )}
      </div>

      {/* Daily missions */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-bold text-gray-900">Missioni Giornaliere</h2>
          <span className="text-xs text-gray-400">Si aggiornano mezzanotte</span>
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
            <p className="text-gray-400 text-sm col-span-2">Nessuna missione giornaliera.</p>
          )}
        </div>
      </section>

      {/* Weekly missions */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-bold text-gray-900">Missioni Settimanali</h2>
          <span className="text-xs text-gray-400">Si aggiornano ogni lunedì</span>
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
            <p className="text-gray-400 text-sm col-span-2">Nessuna missione settimanale.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function MissionCard({
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
      className={`card transition-all ${
        completed ? "border-green-200 bg-green-50/50" : "card-hover"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{mission.icon ?? "🎯"}</span>
          <div>
            <h3
              className={`font-semibold text-sm ${
                completed ? "text-green-700" : "text-gray-800"
              }`}
            >
              {mission.title}
            </h3>
            <p className="text-xs text-gray-400">{mission.description}</p>
          </div>
        </div>
        {completed && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />}
      </div>

      <ProgressBar current={current} target={mission.target_value} />

      {/* Rewards */}
      <div className="flex items-center gap-4 mt-3 text-xs">
        {mission.xp_reward && (
          <span className="flex items-center gap-1 text-yellow-600 font-semibold">
            <Zap className="w-3 h-3" />+{mission.xp_reward} XP
          </span>
        )}
        {mission.coin_reward && (
          <span className="flex items-center gap-1 text-amber-600 font-semibold">
            🪙 +{mission.coin_reward}
          </span>
        )}
        <span
          className={`px-2 py-0.5 rounded-full font-medium ml-auto ${
            mission.mission_type === "daily"
              ? "bg-blue-100 text-blue-700"
              : "bg-purple-100 text-purple-700"
          }`}
        >
          {mission.mission_type === "daily" ? "Giornaliera" : "Settimanale"}
        </span>
      </div>
    </div>
  );
}
