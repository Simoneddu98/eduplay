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
      .from("profiles").select("role").eq("id", user.id).single();

    if (profile?.role !== "admin") { setIsLoading(false); return; }
    setIsAdmin(true);

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, email, role, level, xp_total, edu_coins, streak_current, created_at, last_activity_at")
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
      .select("progress_pct, enrolled_at, courses(title, category)")
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
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <p className="text-gray-500">Accesso negato.</p>
        <Link href="/dashboard" className="btn-outline mt-3 inline-block">← Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestione Utenti</h1>
          <p className="text-gray-400 mt-1">{users.length} utenti registrati</p>
        </div>
        <Link href="/admin" className="btn-outline text-sm">← Admin</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User list */}
        <div className="lg:col-span-2">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              placeholder="Cerca per nome o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-2">
            {pageUsers.map((u: any) => (
              <button
                key={u.id}
                onClick={() => viewUser(u)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  selectedUser?.id === u.id
                    ? "border-primary/30 bg-primary/5"
                    : "border-gray-100 hover:border-primary/20 hover:bg-gray-50"
                }`}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center font-semibold text-primary text-sm flex-shrink-0">
                  {(u.full_name ?? u.email ?? "?")[0].toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {u.full_name ?? "—"}
                    </span>
                    {u.role === "admin" && (
                      <ShieldCheck className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-semibold text-primary">Lv.{u.level}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5" />
                    {(u.xp_total ?? 0).toLocaleString("it-IT")}
                  </p>
                </div>
              </button>
            ))}

            {pageUsers.length === 0 && (
              <div className="text-center py-10">
                <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Nessun utente trovato.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-outline text-sm py-1.5 px-3 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-400">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="btn-outline text-sm py-1.5 px-3 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* User detail panel */}
        <div>
          {selectedUser ? (
            <div className="card sticky top-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center font-bold text-primary text-lg">
                  {(selectedUser.full_name ?? "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selectedUser.full_name ?? "—"}</p>
                  <p className="text-xs text-gray-400">{selectedUser.email}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    selectedUser.role === "admin" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {selectedUser.role === "admin" ? "Admin" : "Studente"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-yellow-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-sm font-bold text-yellow-700">
                    {(selectedUser.xp_total ?? 0).toLocaleString("it-IT")}
                  </p>
                  <p className="text-xs text-gray-400">XP</p>
                </div>
                <div className="bg-blue-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-sm font-bold text-blue-700">
                    {LEVEL_NAMES[selectedUser.level] ?? `Lv.${selectedUser.level}`}
                  </p>
                  <p className="text-xs text-gray-400">Livello</p>
                </div>
                <div className="bg-orange-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-sm font-bold text-orange-600">
                    {selectedUser.streak_current ?? 0}🔥
                  </p>
                  <p className="text-xs text-gray-400">Streak</p>
                </div>
                <div className="bg-amber-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-sm font-bold text-amber-600">
                    {selectedUser.edu_coins ?? 0}🪙
                  </p>
                  <p className="text-xs text-gray-400">EduCoins</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  Corsi iscritto
                </h4>
                {loadingDetail ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto" />
                ) : userEnrollments.length === 0 ? (
                  <p className="text-xs text-gray-400">Nessun corso.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {userEnrollments.map((e: any, i: number) => (
                      <li key={i} className="text-xs">
                        <div className="flex justify-between mb-0.5">
                          <span className="text-gray-600 truncate">{(e.courses as any)?.title}</span>
                          <span className="text-primary font-semibold">{e.progress_pct}%</span>
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

              <p className="text-xs text-gray-300 mt-3">
                Registrato il{" "}
                {selectedUser.created_at
                  ? new Date(selectedUser.created_at).toLocaleDateString("it-IT")
                  : "—"}
              </p>
            </div>
          ) : (
            <div className="card text-center py-10">
              <User className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">
                Seleziona un utente per vedere i dettagli
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
