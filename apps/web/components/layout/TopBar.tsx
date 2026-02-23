"use client";

import { Bell, Flame, Zap, Coins, Menu, UserCircle, Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  streak_current: number;
  xp_total?: number;
  edu_coins?: number;
}

interface TopBarProps {
  profile: Profile | null;
  onMenuToggle?: () => void;
  pageTitle?: string;
}

export default function TopBar({ profile, onMenuToggle, pageTitle }: TopBarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const streak = profile?.streak_current ?? 0;
  const xp = profile?.xp_total ?? 0;
  const coins = profile?.edu_coins ?? 0;

  return (
    <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-blue-100 sticky top-0 z-40 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5 text-slate-600" />
        </button>
        {pageTitle && (
          <h1 className="text-lg font-semibold font-poppins text-slate-800 hidden sm:block">
            {pageTitle}
          </h1>
        )}
      </div>

      {/* Right: stats + notifications + avatar */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Streak badge */}
        {streak > 0 && (
          <div className="badge-streak hidden sm:inline-flex">
            <Flame className="w-3.5 h-3.5" />
            <span>{streak} giorni</span>
          </div>
        )}

        {/* XP display */}
        <div className="badge-xp hidden md:inline-flex">
          <Zap className="w-3.5 h-3.5" />
          <span>{xp.toLocaleString()} XP</span>
        </div>

        {/* Coins */}
        <div className="badge-coins hidden md:inline-flex">
          <Coins className="w-3.5 h-3.5" />
          <span>{coins.toLocaleString()}</span>
        </div>

        {/* Mobile: streak only */}
        {streak > 0 && (
          <div className="badge-streak sm:hidden">
            <Flame className="w-3.5 h-3.5" />
            <span>{streak}</span>
          </div>
        )}

        {/* Notifications */}
        <button className="relative p-2 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer">
          <Bell className="w-5 h-5 text-slate-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Avatar + dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 cursor-pointer"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-9 h-9 rounded-full border-2 border-blue-100"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold border-2 border-blue-100">
                {(profile?.full_name ?? "U")[0].toUpperCase()}
              </div>
            )}
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-blue-100 rounded-xl shadow-lg py-1 z-50 animate-fade-in-up">
              <div className="px-4 py-2 border-b border-blue-50">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {profile?.full_name ?? "Utente"}
                </p>
              </div>
              <Link
                href="/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <UserCircle className="w-4 h-4" />
                Profilo
              </Link>
              <Link
                href="/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                Impostazioni
              </Link>
              <div className="border-t border-blue-50">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Esci
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
