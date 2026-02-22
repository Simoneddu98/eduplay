import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  Flame,
  Zap,
  Trophy,
  Star,
  Calendar,
  Lock,
} from "lucide-react";

const LEVELS = [
  { level: 1, name: "Novizio", minXp: 0, color: "text-gray-500", bg: "bg-gray-100" },
  { level: 2, name: "Apprendista", minXp: 500, color: "text-blue-600", bg: "bg-blue-100" },
  { level: 3, name: "Praticante", minXp: 1500, color: "text-green-600", bg: "bg-green-100" },
  { level: 4, name: "Esperto", minXp: 3500, color: "text-yellow-600", bg: "bg-yellow-100" },
  { level: 5, name: "Master", minXp: 7500, color: "text-orange-600", bg: "bg-orange-100" },
  { level: 6, name: "Guru", minXp: 15000, color: "text-purple-600", bg: "bg-purple-100" },
];

function getLevelInfo(xp: number) {
  let current = LEVELS[0];
  let next = LEVELS[1];
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].minXp) {
      current = LEVELS[i];
      next = LEVELS[i + 1] ?? null!;
    }
  }
  return { current, next };
}

function getXpProgress(xp: number) {
  const { current, next } = getLevelInfo(xp);
  if (!next) return 100;
  const range = next.minXp - current.minXp;
  const progress = xp - current.minXp;
  return Math.round((progress / range) * 100);
}

const BADGE_RARITY: Record<string, { label: string; color: string }> = {
  common: { label: "Comune", color: "bg-gray-100 text-gray-600" },
  rare: { label: "Raro", color: "bg-blue-100 text-blue-700" },
  epic: { label: "Epico", color: "bg-purple-100 text-purple-700" },
  legendary: { label: "Leggendario", color: "bg-yellow-100 text-yellow-700" },
};

function getBadgeRarity(conditionValue: number): keyof typeof BADGE_RARITY {
  if (conditionValue >= 100) return "legendary";
  if (conditionValue >= 50) return "epic";
  if (conditionValue >= 10) return "rare";
  return "common";
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: enrollments },
    { data: userBadges },
    { data: allBadges },
    { data: recentXp },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("enrollments").select("*, courses(title, category)").eq("user_id", user.id),
    supabase.from("user_badges").select("*, badges(*)").eq("user_id", user.id).order("earned_at", { ascending: false }),
    supabase.from("badges").select("*").eq("is_active", true).order("condition_value"),
    supabase.from("xp_logs").select("amount, reason, created_at").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(10),
  ]);

  const xp = profile?.xp_total ?? 0;
  const { current: levelInfo, next: nextLevel } = getLevelInfo(xp);
  const xpProgress = getXpProgress(xp);
  const earnedBadgeIds = new Set((userBadges ?? []).map((ub: any) => ub.badge_id));

  const completedCourses = (enrollments ?? []).filter((e: any) => e.progress_pct === 100).length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Profile Header */}
      <div className="card">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-bold">
                {(profile?.full_name ?? user.email ?? "?")[0].toUpperCase()}
              </div>
            )}
            <span
              className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-xs font-bold ${levelInfo.bg} ${levelInfo.color}`}
            >
              Lv.{profile?.level ?? 1}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {profile?.full_name ?? "Studente"}
            </h1>
            <p className="text-gray-400 text-sm">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${levelInfo.bg} ${levelInfo.color}`}>
                {levelInfo.name}
              </span>
              {profile?.role === "admin" && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Admin</span>
              )}
            </div>

            {/* XP bar */}
            <div className="mt-3 max-w-sm">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{xp.toLocaleString("it-IT")} XP</span>
                {nextLevel && (
                  <span>Prossimo: {nextLevel.name} ({nextLevel.minXp.toLocaleString("it-IT")} XP)</span>
                )}
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-orange-50 rounded-xl px-4 py-3">
              <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-orange-600">{profile?.streak_current ?? 0}</p>
              <p className="text-xs text-gray-400">Streak</p>
            </div>
            <div className="bg-yellow-50 rounded-xl px-4 py-3">
              <span className="text-xl block mb-1">🪙</span>
              <p className="text-xl font-bold text-yellow-600">{profile?.edu_coins ?? 0}</p>
              <p className="text-xs text-gray-400">EduCoins</p>
            </div>
            <div className="bg-green-50 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-green-600">{completedCourses}</p>
              <p className="text-xs text-gray-400">Corsi finiti</p>
            </div>
            <div className="bg-blue-50 rounded-xl px-4 py-3">
              <Trophy className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-blue-600">{earnedBadgeIds.size}</p>
              <p className="text-xs text-gray-400">Badge</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Badges */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Badge
              <span className="text-sm font-normal text-gray-400">
                ({earnedBadgeIds.size}/{(allBadges ?? []).length})
              </span>
            </h2>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {(allBadges ?? []).map((badge: any) => {
                const earned = earnedBadgeIds.has(badge.id);
                const rarity = getBadgeRarity(badge.condition_value ?? 1);
                const rarityInfo = BADGE_RARITY[rarity];
                const ub = (userBadges ?? []).find((u: any) => u.badge_id === badge.id);

                return (
                  <div
                    key={badge.id}
                    title={earned ? badge.description : "Bloccato"}
                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                      earned
                        ? "border-yellow-200 bg-yellow-50/50 hover:bg-yellow-50"
                        : "border-gray-100 bg-gray-50 opacity-40"
                    }`}
                  >
                    <span className={`text-2xl ${earned ? "" : "grayscale"}`}>
                      {badge.icon ?? "🏆"}
                    </span>
                    <p className="text-xs font-semibold text-center text-gray-700 leading-tight">
                      {badge.name}
                    </p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${rarityInfo.color}`}>
                      {rarityInfo.label}
                    </span>
                    {!earned && (
                      <Lock className="absolute top-1.5 right-1.5 w-3 h-3 text-gray-400" />
                    )}
                    {earned && ub?.earned_at && (
                      <p className="text-xs text-gray-400">
                        {new Date(ub.earned_at).toLocaleDateString("it-IT")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Courses enrolled */}
          <div className="card">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Corsi iscritto
            </h3>
            {(enrollments ?? []).length === 0 ? (
              <p className="text-gray-400 text-sm">Nessun corso.</p>
            ) : (
              <ul className="space-y-2">
                {(enrollments as any[]).map((e: any) => (
                  <li key={e.id} className="text-sm">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-gray-700 font-medium truncate">{e.courses?.title}</span>
                      <span className="text-primary font-semibold text-xs">{e.progress_pct}%</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                        style={{ width: `${e.progress_pct}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent XP activity */}
          <div className="card">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Attività recente
            </h3>
            {(recentXp ?? []).length === 0 ? (
              <p className="text-gray-400 text-sm">Nessuna attività.</p>
            ) : (
              <ul className="space-y-2">
                {(recentXp as any[]).map((log: any, i: number) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 capitalize">
                      {log.reason?.replace(/_/g, " ") ?? "attività"}
                    </span>
                    <span className="text-yellow-600 font-semibold">+{log.amount}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
