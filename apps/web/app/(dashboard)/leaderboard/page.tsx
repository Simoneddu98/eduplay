import { createClient } from "@/lib/supabase/server";
import { Trophy, Medal, Crown } from "lucide-react";

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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          Classifica Globale
        </h1>
        <p className="text-gray-500 mt-1">I migliori studenti EduPlay</p>
      </div>

      {/* My rank callout */}
      {user && myRank >= 0 && (
        <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-4 text-white flex items-center justify-between">
          <span className="font-semibold">La tua posizione</span>
          <span className="text-2xl font-black">#{myRank + 1}</span>
        </div>
      )}

      {/* Top 3 podium */}
      {leaders && leaders.length >= 3 && (
        <div className="flex items-end justify-center gap-4 py-6">
          {/* 2nd */}
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden mb-2">
              {(leaders[1] as any).avatar_url ? (
                <img src={(leaders[1] as any).avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold">
                  {((leaders[1] as any).full_name ?? "U")[0]}
                </div>
              )}
            </div>
            <Medal className="w-6 h-6 text-gray-400 mb-1" />
            <p className="text-sm font-semibold text-gray-700 truncate max-w-[80px] text-center">
              {(leaders[1] as any).full_name ?? "Anonimo"}
            </p>
            <p className="text-xs text-gray-500">{((leaders[1] as any).xp_total ?? 0).toLocaleString()} XP</p>
            <div className="w-20 h-20 bg-gray-200 rounded-t-xl mt-2 flex items-end justify-center pb-1">
              <span className="text-2xl font-black text-gray-400">2</span>
            </div>
          </div>

          {/* 1st */}
          <div className="flex flex-col items-center">
            <Crown className="w-8 h-8 text-yellow-500 mb-1" />
            <div className="w-16 h-16 rounded-full bg-yellow-100 overflow-hidden mb-2">
              {(leaders[0] as any).avatar_url ? (
                <img src={(leaders[0] as any).avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-yellow-600 font-bold text-xl">
                  {((leaders[0] as any).full_name ?? "U")[0]}
                </div>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-900 truncate max-w-[80px] text-center">
              {(leaders[0] as any).full_name ?? "Anonimo"}
            </p>
            <p className="text-xs text-gray-500">{((leaders[0] as any).xp_total ?? 0).toLocaleString()} XP</p>
            <div className="w-20 h-28 bg-yellow-400 rounded-t-xl mt-2 flex items-end justify-center pb-1">
              <span className="text-2xl font-black text-yellow-800">1</span>
            </div>
          </div>

          {/* 3rd */}
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-orange-100 overflow-hidden mb-2">
              {(leaders[2] as any).avatar_url ? (
                <img src={(leaders[2] as any).avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-orange-600 font-bold">
                  {((leaders[2] as any).full_name ?? "U")[0]}
                </div>
              )}
            </div>
            <Medal className="w-6 h-6 text-orange-400 mb-1" />
            <p className="text-sm font-semibold text-gray-700 truncate max-w-[80px] text-center">
              {(leaders[2] as any).full_name ?? "Anonimo"}
            </p>
            <p className="text-xs text-gray-500">{((leaders[2] as any).xp_total ?? 0).toLocaleString()} XP</p>
            <div className="w-20 h-14 bg-orange-300 rounded-t-xl mt-2 flex items-end justify-center pb-1">
              <span className="text-2xl font-black text-orange-700">3</span>
            </div>
          </div>
        </div>
      )}

      {/* Full list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left p-4 text-sm font-semibold text-gray-500 w-12">#</th>
              <th className="text-left p-4 text-sm font-semibold text-gray-500">Studente</th>
              <th className="text-left p-4 text-sm font-semibold text-gray-500">Livello</th>
              <th className="text-right p-4 text-sm font-semibold text-gray-500">XP</th>
            </tr>
          </thead>
          <tbody>
            {(leaders ?? []).map((leader: any, idx: number) => {
              const isMe = leader.user_id === user?.id;
              return (
                <tr
                  key={leader.user_id}
                  className={`border-b border-gray-50 transition-colors ${
                    isMe ? "bg-primary/5" : "hover:bg-gray-50"
                  }`}
                >
                  <td className="p-4">
                    <span className={`text-sm font-bold ${
                      idx === 0 ? "text-yellow-500" :
                      idx === 1 ? "text-gray-400" :
                      idx === 2 ? "text-orange-400" :
                      "text-gray-400"
                    }`}>
                      {leader.rank}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {leader.avatar_url ? (
                        <img src={leader.avatar_url} className="w-8 h-8 rounded-full" alt="" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {(leader.full_name ?? "U")[0]}
                        </div>
                      )}
                      <span className={`text-sm font-semibold ${isMe ? "text-primary" : "text-gray-900"}`}>
                        {leader.full_name ?? "Anonimo"} {isMe && "(Tu)"}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-semibold text-gray-500">
                      Lv.{leader.level} {LEVEL_NAMES[leader.level]}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-sm font-bold text-yellow-600">
                      ⚡ {(leader.xp_total ?? 0).toLocaleString()}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {(!leaders || leaders.length === 0) && (
          <div className="text-center py-12 text-gray-400">
            Nessun dato disponibile
          </div>
        )}
      </div>
    </div>
  );
}
