import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Flame,
  Zap,
  Trophy,
  Star,
  Lock,
  Settings,
  Award,
  TrendingUp,
} from "lucide-react";

const LEVELS = [
  { level: 1, name: "Novizio", minXp: 0, color: "text-slate-500", bg: "bg-slate-100" },
  { level: 2, name: "Apprendista", minXp: 500, color: "text-blue-600", bg: "bg-blue-100" },
  { level: 3, name: "Praticante", minXp: 1500, color: "text-green-600", bg: "bg-green-100" },
  { level: 4, name: "Esperto", minXp: 3500, color: "text-amber-600", bg: "bg-amber-100" },
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

const BADGE_RARITY: Record<string, { label: string; color: string; border: string }> = {
  common: { label: "Comune", color: "bg-slate-100 text-slate-600", border: "border-slate-200" },
  rare: { label: "Raro", color: "bg-blue-100 text-blue-700", border: "border-blue-200" },
  epic: { label: "Epico", color: "bg-purple-100 text-purple-700", border: "border-purple-200" },
  legendary: { label: "Leggendario", color: "bg-amber-100 text-amber-700", border: "border-amber-300" },
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
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("enrollments").select("*, courses(*)").eq("user_id", user.id),
    supabase.from("user_badges").select("*, badges(*)").eq("user_id", user.id).order("earned_at", { ascending: false }),
    supabase.from("badges").select("*").order("condition_value"),
  ]);

  const xp = profile?.xp_total ?? 0;
  const { current: levelInfo, next: nextLevel } = getLevelInfo(xp);
  const xpProgress = getXpProgress(xp);
  const earnedBadgeIds = new Set((userBadges ?? []).map((ub: any) => ub.badge_id));
  const completedCourses = (enrollments ?? []).filter((e: any) => e.progress_pct === 100).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Profile Header - Glassmorphism */}
      <div className="glass-card p-6 md:p-8 animate-fade-in-up">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-24 h-24 rounded-2xl object-cover ring-2 ring-blue-200"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-800 to-blue-500 flex items-center justify-center text-white text-3xl font-bold ring-2 ring-blue-200">
                {(profile?.full_name ?? user.email ?? "?")[0].toUpperCase()}
              </div>
            )}
            <span className="badge-level absolute -bottom-2 -right-2 shadow-md">
              Lv.{profile?.level ?? 1}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-blue-900">
                {profile?.full_name ?? "Studente"}
              </h1>
              {profile?.role === "admin" && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Admin</span>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-0.5">{user.email}</p>

            <div className="flex items-center gap-2 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${levelInfo.bg} ${levelInfo.color}`}>
                {levelInfo.name}
              </span>
            </div>

            {/* XP Progress Bar */}
            <div className="mt-4 max-w-md">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-blue-900">{xp.toLocaleString("it-IT")} XP</span>
                {nextLevel && (
                  <span className="text-slate-400">
                    Prossimo: {nextLevel.name} ({nextLevel.minXp.toLocaleString("it-IT")} XP)
                  </span>
                )}
              </div>
              <div className="xp-bar">
                <div className="xp-bar-fill" style={{ width: `${xpProgress}%` }} />
              </div>
            </div>
          </div>

          {/* Settings link */}
          <Link
            href="/settings"
            className="btn-outline px-4 py-2 text-sm flex items-center gap-2 flex-shrink-0"
          >
            <Settings className="w-4 h-4" />
            Impostazioni
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <div className="glass-card p-4 text-center">
          <TrendingUp className="w-5 h-5 text-amber-500 mx-auto mb-2" />
          <p className="text-2xl font-extrabold text-blue-900">{xp.toLocaleString("it-IT")}</p>
          <p className="text-xs text-slate-400 font-medium">XP Totale</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Star className="w-5 h-5 text-purple-500 mx-auto mb-2" />
          <p className="text-2xl font-extrabold text-blue-900">{profile?.level ?? 1}</p>
          <p className="text-xs text-slate-400 font-medium">Livello</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Flame className="w-5 h-5 text-red-500 mx-auto mb-2" />
          <p className="text-2xl font-extrabold text-blue-900">{profile?.streak_current ?? 0}</p>
          <p className="text-xs text-slate-400 font-medium">Streak</p>
        </div>
        <div className="glass-card p-4 text-center">
          <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-extrabold text-blue-900">{completedCourses}</p>
          <p className="text-xs text-slate-400 font-medium">Corsi Finiti</p>
        </div>
        <div className="glass-card p-4 text-center col-span-2 md:col-span-1">
          <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-2" />
          <p className="text-2xl font-extrabold text-blue-900">{earnedBadgeIds.size}</p>
          <p className="text-xs text-slate-400 font-medium">Badge</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Badges Section */}
        <div className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <div className="card p-6">
            <h2 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Badge
              <span className="text-sm font-normal text-slate-400">
                ({earnedBadgeIds.size}/{(allBadges ?? []).length})
              </span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(allBadges ?? []).map((badge: any) => {
                const earned = earnedBadgeIds.has(badge.id);
                const rarity = getBadgeRarity(badge.condition_value ?? 1);
                const rarityInfo = BADGE_RARITY[rarity];
                const ub = (userBadges ?? []).find((u: any) => u.badge_id === badge.id);

                return (
                  <div
                    key={badge.id}
                    title={earned ? badge.description : "Bloccato"}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                      earned
                        ? `${rarityInfo.border} bg-white hover:shadow-md hover:-translate-y-0.5 cursor-pointer`
                        : "border-slate-100 bg-slate-50/50 opacity-40"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${earned ? rarityInfo.color : "bg-slate-100"}`}>
                      {badge.icon_url ? (
                        <img src={badge.icon_url} alt={badge.name} className={`w-6 h-6 ${earned ? "" : "grayscale opacity-50"}`} />
                      ) : (
                        <Award className={`w-5 h-5 ${earned ? "text-amber-500" : "text-slate-300"}`} />
                      )}
                    </div>
                    <p className="text-xs font-bold text-center text-blue-900 leading-tight">
                      {badge.name}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${rarityInfo.color}`}>
                      {rarityInfo.label}
                    </span>
                    {!earned && (
                      <Lock className="absolute top-2 right-2 w-3.5 h-3.5 text-slate-300" />
                    )}
                    {earned && ub?.earned_at && (
                      <p className="text-xs text-slate-400">
                        {new Date(ub.earned_at).toLocaleDateString("it-IT")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          {/* Enrolled Courses */}
          <div className="card p-5">
            <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-800" />
              Corsi Iscritto
            </h3>
            {(enrollments ?? []).length === 0 ? (
              <p className="text-slate-400 text-sm">Nessun corso.</p>
            ) : (
              <ul className="space-y-3">
                {(enrollments as any[]).map((e: any) => (
                  <li key={e.id}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm text-blue-900 font-semibold truncate pr-2">
                        {e.courses?.title}
                      </span>
                      {e.progress_pct === 100 ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <span className="text-xs font-bold text-blue-800">{e.progress_pct}%</span>
                      )}
                    </div>
                    <div className="xp-bar">
                      <div
                        className="xp-bar-fill"
                        style={{ width: `${e.progress_pct}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Stats Summary */}
          <div className="card p-5">
            <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Riepilogo
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Streak attuale</span>
                <span className="badge-streak flex-shrink-0">
                  <Flame className="w-3 h-3" />
                  {profile?.streak_current ?? 0} giorni
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Streak record</span>
                <span className="text-sm font-bold text-blue-900">
                  {profile?.streak_longest ?? 0} giorni
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-sm text-slate-500">EduCoins</span>
                <span className="badge-coins flex-shrink-0">
                  {(profile?.edu_coins ?? 0).toLocaleString()}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
