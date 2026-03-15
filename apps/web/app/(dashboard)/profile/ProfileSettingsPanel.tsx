"use client";
import { useState, useTransition, useEffect } from "react";
import { updateProfile, changePassword } from "./actions";
import { User, Lock, Bell, Save, Check, AlertCircle, Eye, EyeOff } from "lucide-react";

type Tab = "profilo" | "sicurezza" | "notifiche";

interface ProfileData {
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

function StatusBadge({ status }: { status: { success?: boolean; error?: string } | null }) {
  if (!status) return null;
  if (status.success) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-green-600 font-semibold">
        <Check className="w-4 h-4" /> Salvato!
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-sm text-red-500 font-semibold">
      <AlertCircle className="w-4 h-4" /> {status.error}
    </span>
  );
}

export function ProfileSettingsPanel({ profile }: { profile: ProfileData }) {
  const [tab, setTab] = useState<Tab>("profilo");
  const [isPending, startTransition] = useTransition();
  const [profileStatus, setProfileStatus] = useState<{ success?: boolean; error?: string } | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<{ success?: boolean; error?: string } | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [notifs, setNotifs] = useState({
    email_badge: true,
    email_streak: true,
    email_corso: true,
  });

  useEffect(() => {
    setNotifs({
      email_badge: localStorage.getItem("notif_email_badge") !== "false",
      email_streak: localStorage.getItem("notif_email_streak") !== "false",
      email_corso: localStorage.getItem("notif_email_corso") !== "false",
    });
  }, []);

  function toggleNotif(key: keyof typeof notifs) {
    const newVal = !notifs[key];
    setNotifs((prev) => ({ ...prev, [key]: newVal }));
    localStorage.setItem(`notif_${key}`, String(newVal));
  }

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileStatus(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProfile(formData);
      setProfileStatus(result);
    });
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordStatus(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await changePassword(formData);
      setPasswordStatus(result);
      if (result.success) (e.target as HTMLFormElement).reset();
    });
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "profilo", label: "Profilo", icon: <User className="w-4 h-4" /> },
    { id: "sicurezza", label: "Sicurezza", icon: <Lock className="w-4 h-4" /> },
    { id: "notifiche", label: "Notifiche", icon: <Bell className="w-4 h-4" /> },
  ];

  return (
    <div className="card" id="impostazioni">
      {/* Tab header */}
      <div className="flex gap-1 border-b border-slate-100 px-6 pt-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors ${
              tab === t.id
                ? "text-blue-700 border-b-2 border-blue-600 -mb-px"
                : "text-slate-500 hover:text-blue-600"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* ── PROFILO ── */}
        {tab === "profilo" && (
          <form onSubmit={handleProfileSubmit} className="space-y-5 max-w-lg">
            <div>
              <label className="block text-sm font-semibold text-blue-900 mb-1.5">
                Nome completo
              </label>
              <input
                name="full_name"
                defaultValue={profile.full_name ?? ""}
                placeholder="Il tuo nome"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-blue-900 mb-1.5">Bio</label>
              <textarea
                name="bio"
                defaultValue={profile.bio ?? ""}
                placeholder="Raccontati in poche parole..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-blue-900 mb-1.5">
                URL Avatar
              </label>
              <input
                name="avatar_url"
                defaultValue={profile.avatar_url ?? ""}
                placeholder="https://..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              />
              <p className="text-xs text-slate-400 mt-1">Incolla l&apos;URL di un&apos;immagine pubblica</p>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {isPending ? "Salvataggio..." : "Salva modifiche"}
              </button>
              <StatusBadge status={profileStatus} />
            </div>
          </form>
        )}

        {/* ── SICUREZZA ── */}
        {tab === "sicurezza" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-5 max-w-sm">
            <p className="text-sm text-slate-500">
              Inserisci la nuova password per il tuo account.
            </p>

            <div>
              <label className="block text-sm font-semibold text-blue-900 mb-1.5">
                Nuova password
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPw ? "text" : "password"}
                  placeholder="Min. 6 caratteri"
                  required
                  minLength={6}
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-blue-900 mb-1.5">
                Conferma password
              </label>
              <input
                name="confirm"
                type={showPw ? "text" : "password"}
                placeholder="Ripeti la password"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              />
            </div>

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-60"
              >
                <Lock className="w-4 h-4" />
                {isPending ? "Aggiornamento..." : "Aggiorna password"}
              </button>
              <StatusBadge status={passwordStatus} />
            </div>
          </form>
        )}

        {/* ── NOTIFICHE ── */}
        {tab === "notifiche" && (
          <div className="space-y-3 max-w-sm">
            <p className="text-sm text-slate-500 mb-4">
              Preferenze di notifica salvate su questo dispositivo.
            </p>
            {(
              [
                {
                  key: "email_badge" as const,
                  label: "Nuovo badge sbloccato",
                  desc: "Quando guadagni un badge",
                },
                {
                  key: "email_streak" as const,
                  label: "Reminder streak",
                  desc: "Se rischi di perdere la streak",
                },
                {
                  key: "email_corso" as const,
                  label: "Aggiornamenti corso",
                  desc: "Nuove lezioni disponibili",
                },
              ] as const
            ).map(({ key, label, desc }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-100 bg-white"
              >
                <div>
                  <p className="text-sm font-semibold text-blue-900">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNotif(key)}
                  aria-label={`Toggle ${label}`}
                  className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${
                    notifs[key] ? "bg-blue-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      notifs[key] ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
