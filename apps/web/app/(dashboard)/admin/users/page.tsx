"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Users,
  Search,
  Zap,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldCheck,
  User,
  BookOpen,
  Flame,
  TrendingUp,
} from "lucide-react";

const LEVEL_NAMES: Record<number, string> = {
  1: "Novizio",
  2: "Apprendista",
  3: "Praticante",
  4: "Esperto",
  5: "Master",
  6: "Guru",
};

const PAGE_SIZE = 15;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userEnrollments, setUserEnrollments] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    const filtered = users.filter(
      (u) =>
        (u.full_name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
    );
    setFilteredUsers(filtered);
    setPage(0);
  }, [search, users]);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles").select("*").eq("id", user.id).single();

    if (profile?.role !== "admin") { setIsLoading(false); return; }
    setIsAdmin(true);

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    setUsers(data ?? []);
    setFilteredUsers(data ?? []);
    setIsLoading(false);
  };

  const viewUser = async (user: any) => {
    setSelectedUser(user);
    setLoadingDetail(true);
    const { data } = await supabase
      .from("enrollments")
      .select("*, courses(*)")
      .eq("user_id", user.id)
      .order("enrolled_at", { ascending: false });
    setUserEnrollments(data ?? []);
    setLoadingDetail(false);
  };

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const pageUsers = filteredUsers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-80">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 animate-fade-in-up">
        <div className="glass-card p-8">
          <ShieldCheck className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-slate-500">Accesso negato.</p>
          <Link href="/dashboard" className="btn-outline mt-3 inline-block">Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-card p-6 md:p-8 animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-blue-900">Gestione Utenti</h1>
              <p className="text-slate-400 mt-0.5">{users.length.toLocaleString("it-IT")} utenti registrati</p>
            </div>
          </div>
          <Link href="/admin" className="btn-outline text-sm flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            Admin Panel
          </Link>
        </div>

        {/* Search */}
        <div className="relative mt-5 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            type="text"
            placeholder="Cerca per nome o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-blue-200 rounded-xl text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Table */}
        <div className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-blue-100 bg-blue-50/50">
                  <th className="text-left p-4 text-xs font-bold text-blue-900 uppercase tracking-wider">Utente</th>
                  <th className="text-left p-4 text-xs font-bold text-blue-900 uppercase tracking-wider hidden sm:table-cell">Ruolo</th>
                  <th className="text-left p-4 text-xs font-bold text-blue-900 uppercase tracking-wider hidden md:table-cell">Livello</th>
                  <th className="text-right p-4 text-xs font-bold text-blue-900 uppercase tracking-wider">XP</th>
                  <th className="text-right p-4 text-xs font-bold text-blue-900 uppercase tracking-wider hidden lg:table-cell">Streak</th>
                  <th className="text-right p-4 text-xs font-bold text-blue-900 uppercase tracking-wider hidden md:table-cell">Iscritto</th>
                </tr>
              </thead>
              <tbody>
                {pageUsers.map((u: any) => (
                  <tr
                    key={u.id}
                    onClick={() => viewUser(u)}
                    className={`border-b border-blue-50 transition-all duration-200 cursor-pointer ${
                      selectedUser?.id === u.id
                        ? "bg-blue-100/50 ring-1 ring-inset ring-blue-300"
                        : "hover:bg-blue-50/50"
                    }`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-200 to-blue-100 flex items-center justify-center font-bold text-blue-800 text-sm flex-shrink-0">
                          {(u.full_name ?? u.email ?? "?")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-blue-900 truncate">{u.full_name ?? "---"}</p>
                          <p className="text-xs text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        u.role === "admin" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {u.role === "admin" ? "Admin" : "Studente"}
                      </span>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className="badge-level">
                        Lv.{u.level} {LEVEL_NAMES[u.level] ?? ""}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="badge-xp">
                        <TrendingUp className="w-3 h-3" />
                        {(u.xp_total ?? 0).toLocaleString("it-IT")}
                      </span>
                    </td>
                    <td className="p-4 text-right hidden lg:table-cell">
                      {(u.streak_current ?? 0) > 0 && (
                        <span className="badge-streak">
                          <Flame className="w-3 h-3" />
                          {u.streak_current}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right hidden md:table-cell">
                      <span className="text-xs text-slate-400">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString("it-IT") : "---"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pageUsers.length === 0 && (
              <div className="text-center py-16">
                <Users className="w-12 h-12 text-blue-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Nessun utente trovato.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-outline text-sm py-2 px-4 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Precedente
              </button>
              <span className="text-sm text-slate-400 font-medium">
                Pagina {page + 1} di {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="btn-outline text-sm py-2 px-4 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                Successiva
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* User Detail Panel */}
        <div className="animate-fade-in-up" style={{ animationDelay: "160ms" }}>
          {selectedUser ? (
            <div className="glass-card p-5 sticky top-4 space-y-4">
              {/* User header */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-200 to-blue-100 flex items-center justify-center font-bold text-blue-800 text-xl">
                  {(selectedUser.full_name ?? "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-blue-900 truncate">{selectedUser.full_name ?? "---"}</p>
                  <p className="text-xs text-slate-400 truncate">{selectedUser.email}</p>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    selectedUser.role === "admin" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {selectedUser.role === "admin" ? "Admin" : "Studente"}
                  </span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-amber-50 rounded-xl px-3 py-3 text-center">
                  <Zap className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                  <p className="text-sm font-bold text-amber-700">
                    {(selectedUser.xp_total ?? 0).toLocaleString("it-IT")}
                  </p>
                  <p className="text-xs text-slate-400">XP</p>
                </div>
                <div className="bg-purple-50 rounded-xl px-3 py-3 text-center">
                  <TrendingUp className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                  <p className="text-sm font-bold text-purple-700">
                    {LEVEL_NAMES[selectedUser.level] ?? `Lv.${selectedUser.level}`}
                  </p>
                  <p className="text-xs text-slate-400">Livello</p>
                </div>
                <div className="bg-red-50 rounded-xl px-3 py-3 text-center">
                  <Flame className="w-4 h-4 text-red-500 mx-auto mb-1" />
                  <p className="text-sm font-bold text-red-600">
                    {selectedUser.streak_current ?? 0}
                  </p>
                  <p className="text-xs text-slate-400">Streak</p>
                </div>
                <div className="bg-yellow-50 rounded-xl px-3 py-3 text-center">
                  <Zap className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
                  <p className="text-sm font-bold text-yellow-700">
                    {(selectedUser.edu_coins ?? 0).toLocaleString("it-IT")}
                  </p>
                  <p className="text-xs text-slate-400">EduCoins</p>
                </div>
              </div>

              {/* Enrollments */}
              <div>
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  Corsi Iscritto
                </h4>
                {loadingDetail ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  </div>
                ) : userEnrollments.length === 0 ? (
                  <p className="text-xs text-slate-400">Nessun corso.</p>
                ) : (
                  <ul className="space-y-2">
                    {userEnrollments.map((e: any, i: number) => (
                      <li key={i}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-blue-900 font-semibold truncate pr-2">
                            {(e.courses as any)?.title}
                          </span>
                          <span className="text-xs font-bold text-blue-800">{e.progress_pct}%</span>
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

              <p className="text-xs text-slate-300 pt-2 border-t border-blue-100">
                Registrato il{" "}
                {selectedUser.created_at
                  ? new Date(selectedUser.created_at).toLocaleDateString("it-IT")
                  : "---"}
              </p>
            </div>
          ) : (
            <div className="glass-card text-center py-12">
              <User className="w-10 h-10 text-blue-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">
                Seleziona un utente per vedere i dettagli
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
