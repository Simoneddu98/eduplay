import { createClient } from "@/lib/supabase/server";
import { Trophy, Crown, Medal, TrendingUp, Zap } from "lucide-react";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: leaders } = await supabase
    .from("leaderboard_global")
    .select("*")
    .limit(50);

  const myRank = user
    ? leaders?.findIndex((l: any) => l.user_id === user.id) ?? -1
    : -1;

  const LEVEL_NAMES: Record<number, string> = {
    1: "Novizio", 2: "Apprendista", 3: "Praticante",
    4: "Esperto", 5: "Master", 6: "Guru",
  };

  const top3 = (leaders ?? []).slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-card p-6 md:p-8 text-center animate-fade-in-up">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Trophy className="w-7 h-7 text-amber-500" />
          <h1 className="text-2xl md:text-3xl font-bold text-blue-900">Classifica Globale</h1>
        </div>
        <p className="text-slate-500">I migliori studenti EduPlay</p>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mt-5">
          <button className="btn-primary px-5 py-2 text-sm">Globale</button>
          <button className="btn-secondary px-5 py-2 text-sm">Settimanale</button>
          <button className="btn-secondary px-5 py-2 text-sm">Per Corso</button>
        </div>
      </div>

      {/* My rank callout */}
      {user && myRank >= 0 && (
        <div className="glass-card p-5 bg-gradient-to-r from-blue-800 to-blue-600 animate-fade-in-up">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-200">La tua posizione</p>
                <p className="text-2xl font-extrabold">#{myRank + 1}</p>
              </div>
            </div>
            {leaders && leaders[myRank] && (
              <div className="text-right">
                <p className="text-sm text-blue-200">XP Totale</p>
                <p className="text-xl font-bold">
                  {((leaders[myRank] as any).xp_total ?? 0).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      {top3.length >= 3 && (
        <div className="flex items-end justify-center gap-3 md:gap-5 py-4 animate-fade-in-up">
          {/* 2nd Place */}
          <div className="flex flex-col items-center flex-1 max-w-[140px]">
            <div className="glass-card p-4 w-full text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden mx-auto mb-2 ring-2 ring-slate-300">
                {(top3[1] as any).avatar_url ? (
                  <img src={(top3[1] as any).avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold text-lg">
                    {((top3[1] as any).full_name ?? "U")[0]}
                  </div>
                )}
              </div>
              <span className="badge-silver mb-2">
                <Medal className="w-3 h-3" />
                2nd
              </span>
              <p className="text-sm font-bold text-blue-900 truncate mt-2">
                {(top3[1] as any).full_name ?? "Anonimo"}
              </p>
              <p className="badge-xp mt-1">
                <TrendingUp className="w-3 h-3" />
                {((top3[1] as any).xp_total ?? 0).toLocaleString()} XP
              </p>
            </div>
            <div className="w-full h-16 bg-gradient-to-t from-slate-300 to-slate-200 rounded-t-xl mt-2 flex items-center justify-center">
              <span className="text-2xl font-extrabold text-slate-500">2</span>
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center flex-1 max-w-[160px] -mt-4">
            <Crown className="w-8 h-8 text-amber-500 mb-2 animate-float" />
            <div className="glass-card p-4 w-full text-center ring-2 ring-amber-300">
              <div className="w-16 h-16 rounded-full bg-amber-100 overflow-hidden mx-auto mb-2 ring-2 ring-amber-400">
                {(top3[0] as any).avatar_url ? (
                  <img src={(top3[0] as any).avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-amber-600 font-bold text-xl">
                    {((top3[0] as any).full_name ?? "U")[0]}
                  </div>
                )}
              </div>
              <span className="badge-gold mb-2">
                <Crown className="w-3 h-3" />
                1st
              </span>
              <p className="text-sm font-bold text-blue-900 truncate mt-2">
                {(top3[0] as any).full_name ?? "Anonimo"}
              </p>
              <p className="badge-xp mt-1">
                <TrendingUp className="w-3 h-3" />
                {((top3[0] as any).xp_total ?? 0).toLocaleString()} XP
              </p>
            </div>
            <div className="w-full h-24 bg-gradient-to-t from-amber-400 to-yellow-300 rounded-t-xl mt-2 flex items-center justify-center">
              <span className="text-3xl font-extrabold text-amber-800">1</span>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center flex-1 max-w-[140px]">
            <div className="glass-card p-4 w-full text-center">
              <div className="w-14 h-14 rounded-full bg-orange-100 overflow-hidden mx-auto mb-2 ring-2 ring-orange-300">
                {(top3[2] as any).avatar_url ? (
                  <img src={(top3[2] as any).avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-orange-600 font-bold text-lg">
                    {((top3[2] as any).full_name ?? "U")[0]}
                  </div>
                )}
              </div>
              <span className="badge-bronze mb-2">
                <Medal className="w-3 h-3" />
                3rd
              </span>
              <p className="text-sm font-bold text-blue-900 truncate mt-2">
                {(top3[2] as any).full_name ?? "Anonimo"}
              </p>
              <p className="badge-xp mt-1">
                <TrendingUp className="w-3 h-3" />
                {((top3[2] as any).xp_total ?? 0).toLocaleString()} XP
              </p>
            </div>
            <div className="w-full h-12 bg-gradient-to-t from-orange-400 to-orange-300 rounded-t-xl mt-2 flex items-center justify-center">
              <span className="text-2xl font-extrabold text-orange-700">3</span>
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="card overflow-hidden animate-fade-in-up">
        <table className="w-full">
          <thead>
            <tr className="border-b border-blue-100 bg-blue-50/50">
              <th className="text-left p-4 text-xs font-bold text-blue-900 uppercase tracking-wider w-14">Pos</th>
              <th className="text-left p-4 text-xs font-bold text-blue-900 uppercase tracking-wider">Studente</th>
              <th className="text-left p-4 text-xs font-bold text-blue-900 uppercase tracking-wider hidden sm:table-cell">Livello</th>
              <th className="text-right p-4 text-xs font-bold text-blue-900 uppercase tracking-wider">XP</th>
            </tr>
          </thead>
          <tbody>
            {(leaders ?? []).map((leader: any, idx: number) => {
              const isMe = leader.user_id === user?.id;
              const rowClass =
                idx === 0 ? "leaderboard-row-1" :
                idx === 1 ? "leaderboard-row-2" :
                idx === 2 ? "leaderboard-row-3" :
                "";

              return (
                <tr
                  key={leader.user_id}
                  className={`border-b border-blue-50 transition-colors ${rowClass} ${
                    isMe ? "bg-blue-100/50 ring-1 ring-inset ring-blue-300" : idx > 2 ? "hover:bg-blue-50/50" : ""
                  }`}
                >
                  <td className="p-4">
                    <span className={`text-sm font-extrabold ${
                      idx === 0 ? "text-amber-500" :
                      idx === 1 ? "text-slate-400" :
                      idx === 2 ? "text-orange-500" :
                      "text-slate-400"
                    }`}>
                      {leader.rank}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {leader.avatar_url ? (
                        <img src={leader.avatar_url} className="w-9 h-9 rounded-full" alt="" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold text-sm">
                          {(leader.full_name ?? "U")[0]}
                        </div>
                      )}
                      <span className={`text-sm font-semibold ${isMe ? "text-blue-800" : "text-blue-900"}`}>
                        {leader.full_name ?? "Anonimo"} {isMe && <span className="text-blue-500">(Tu)</span>}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 hidden sm:table-cell">
                    <span className="badge-level">
                      Lv.{leader.level} {LEVEL_NAMES[leader.level] ?? ""}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="badge-xp">
                      <TrendingUp className="w-3 h-3" />
                      {(leader.xp_total ?? 0).toLocaleString()}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {(!leaders || leaders.length === 0) && (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 text-blue-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Nessun dato disponibile</p>
          </div>
        )}
      </div>
    </div>
  );
}
