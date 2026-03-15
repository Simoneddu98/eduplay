"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  Target,
  Bot,
  UserCircle,
  Settings,
  Zap,
  GraduationCap,
  PenSquare,
} from "lucide-react";
import { clsx } from "clsx";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  level: number;
  xp_total: number;
  edu_coins: number;
  role?: string;
}

interface SidebarProps {
  profile: Profile | null;
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/courses", icon: BookOpen, label: "Corsi" },
  { href: "/leaderboard", icon: Trophy, label: "Classifiche" },
  { href: "/missions", icon: Target, label: "Missioni" },
  { href: "/ai-tutor", icon: Bot, label: "AI Tutor" },
  { href: "/profile", icon: UserCircle, label: "Profilo" },
];

const trainerNavItems = [
  { href: "/crea-corso", icon: PenSquare, label: "Crea Corso" },
];

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

export default function Sidebar({ profile, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const level = profile?.level ?? 1;
  const levelName = LEVEL_NAMES[level] ?? "Novizio";
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
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          "w-64 bg-gradient-to-b from-blue-900 to-indigo-950 border-r border-white/10 text-white flex flex-col flex-shrink-0 h-screen",
          "fixed lg:static z-50 transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold font-poppins text-white">
              EduPlay
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer",
                  active
                    ? "bg-white/15 text-white border-l-2 border-blue-300"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon
                  className={clsx(
                    "w-5 h-5 flex-shrink-0",
                    active ? "text-white" : "text-blue-300"
                  )}
                />
                {label}
              </Link>
            );
          })}

          {/* Trainer tools */}
          {profile?.role && ["trainer", "admin"].includes(profile.role) && (
            <>
              <div className="pt-3 pb-1 px-3">
                <p className="text-[10px] font-semibold text-blue-200/50 uppercase tracking-wider">
                  Strumenti Trainer
                </p>
              </div>
              {trainerNavItems.map(({ href, icon: Icon, label }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={clsx(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer",
                      active
                        ? "bg-purple-500/20 text-purple-200 border-l-2 border-purple-400"
                        : "text-blue-100 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon
                      className={clsx(
                        "w-5 h-5 flex-shrink-0",
                        active ? "text-purple-300" : "text-blue-300"
                      )}
                    />
                    {label}
                  </Link>
                );
              })}
            </>
          )}

          {/* Admin only */}
          {profile?.role === "admin" && (
            <Link
              href="/admin"
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 mt-4 cursor-pointer",
                pathname.startsWith("/admin")
                  ? "bg-white/15 text-white border-l-2 border-blue-300"
                  : "text-blue-100/60 hover:bg-white/10 hover:text-white"
              )}
            >
              <Settings className="w-5 h-5 flex-shrink-0 text-blue-300" />
              Impostazioni
            </Link>
          )}
        </nav>

        {/* Bottom user card */}
        {profile && (
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-3">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name ?? "Avatar"}
                  className="w-10 h-10 rounded-full border-2 border-white/20"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm border-2 border-white/20">
                  {(profile.full_name ?? "U")[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">
                  {profile.full_name ?? "Utente"}
                </p>
                <span className="badge-level text-[10px] px-2 py-0.5">
                  <Zap className="w-3 h-3" />
                  Lv.{level} {levelName}
                </span>
              </div>
            </div>

            {/* XP progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-blue-200/70">
                <span>{xp.toLocaleString()} XP</span>
                {level < 6 && <span>{nextLevelXP.toLocaleString()} XP</span>}
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
