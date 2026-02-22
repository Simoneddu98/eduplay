"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  Target,
  Bot,
  User,
  Settings,
  Zap,
  ShieldCheck,
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
}

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/courses", icon: BookOpen, label: "Corsi" },
  { href: "/leaderboard", icon: Trophy, label: "Classifica" },
  { href: "/missions", icon: Target, label: "Missioni" },
  { href: "/ai-tutor", icon: Bot, label: "AI Tutor" },
  { href: "/profile", icon: User, label: "Profilo" },
];

const LEVEL_NAMES: Record<number, string> = {
  1: "Novizio",
  2: "Apprendista",
  3: "Praticante",
  4: "Esperto",
  5: "Master",
  6: "Guru",
};

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const level = profile?.level ?? 1;
  const levelName = LEVEL_NAMES[level] ?? "Novizio";

  return (
    <aside className="w-64 bg-primary text-white flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-400 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-sm">EP</span>
          </div>
          <span className="text-xl font-black">EduPlay</span>
        </Link>
      </div>

      {/* User Quick Stats */}
      {profile && (
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3 mb-3">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name ?? "Avatar"}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold">
                {(profile.full_name ?? "U")[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                {profile.full_name ?? "Utente"}
              </p>
              <span className="inline-flex items-center gap-1 bg-white/10 rounded-full px-2 py-0.5 text-xs">
                <Zap className="w-3 h-3 text-yellow-400" />
                Lv.{level} {levelName}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-white/70">
            <span>⚡ {(profile.xp_total ?? 0).toLocaleString()} XP</span>
            <span>🪙 {(profile.edu_coins ?? 0).toLocaleString()} EC</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                active
                  ? "bg-white text-primary shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </Link>
          );
        })}

        {/* Admin only */}
        {profile?.role === "admin" && (
          <Link
            href="/admin"
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 mt-4",
              pathname.startsWith("/admin")
                ? "bg-white text-primary shadow-sm"
                : "text-white/60 hover:bg-white/10 hover:text-white"
            )}
          >
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            Admin Panel
          </Link>
        )}
      </nav>

      {/* Settings bottom */}
      <div className="p-4 border-t border-white/10">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-all duration-150"
        >
          <Settings className="w-5 h-5" />
          Impostazioni
        </Link>
      </div>
    </aside>
  );
}
