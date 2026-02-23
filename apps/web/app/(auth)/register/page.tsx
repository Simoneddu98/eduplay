"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { GraduationCap, CheckCircle, Mail, Lock, Eye, EyeOff, AlertCircle, User, Star, Award, Bot, Gamepad2 } from "lucide-react";

function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  if (password.length === 0) return { level: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: "Debole", color: "bg-red-500" };
  if (score <= 3) return { level: 2, label: "Media", color: "bg-yellow-500" };
  return { level: 3, label: "Forte", color: "bg-green-500" };
}

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  async function handleGoogleRegister() {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Le password non coincidono");
      return;
    }
    if (!acceptTerms) {
      setError("Devi accettare i Termini di Servizio e la Privacy Policy");
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Panel - Visual Branding (hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-800 via-blue-900 to-indigo-950 relative overflow-hidden flex-col justify-between p-10 lg:p-14">
        {/* Blob decorations */}
        <div className="absolute top-[-80px] left-[-60px] w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-100px] right-[-80px] w-96 h-96 bg-indigo-400/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-cyan-400/10 rounded-full blur-2xl" />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <GraduationCap className="w-10 h-10 text-white" />
            <span className="text-white font-poppins text-4xl font-bold">EduPlay</span>
          </div>

          {/* Headline */}
          <h2 className="text-white font-poppins text-3xl font-bold mb-3">
            Inizia oggi, gratis.
          </h2>
          <p className="text-blue-200 text-lg mb-10">
            Unisciti a 10.000+ studenti
          </p>

          {/* Progress bar visual */}
          <div className="mb-10">
            <div className="flex items-center justify-between text-blue-300 text-xs mb-2">
              <span>Comunita in crescita</span>
              <span>10.000+</span>
            </div>
            <div className="w-full h-2 bg-blue-700/50 rounded-full overflow-hidden">
              <div className="h-full w-4/5 bg-gradient-to-r from-green-400 to-cyan-400 rounded-full" />
            </div>
          </div>

          {/* Benefits */}
          <ul className="space-y-5">
            <li className="flex items-start gap-3 text-blue-100">
              <Award className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Certificazioni riconosciute</p>
                <p className="text-blue-300 text-sm">Ottieni certificati al completamento dei corsi</p>
              </div>
            </li>
            <li className="flex items-start gap-3 text-blue-100">
              <Bot className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">AI Tutor personale</p>
                <p className="text-blue-300 text-sm">Assistente intelligente disponibile 24/7</p>
              </div>
            </li>
            <li className="flex items-start gap-3 text-blue-100">
              <Gamepad2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Gamificazione completa</p>
                <p className="text-blue-300 text-sm">XP, livelli, badge e leaderboard</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="relative z-10">
          {/* Stats avatars */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-blue-400 border-2 border-blue-900 flex items-center justify-center text-white text-xs font-bold">MR</div>
              <div className="w-8 h-8 rounded-full bg-green-400 border-2 border-blue-900 flex items-center justify-center text-white text-xs font-bold">AL</div>
              <div className="w-8 h-8 rounded-full bg-purple-400 border-2 border-blue-900 flex items-center justify-center text-white text-xs font-bold">GS</div>
            </div>
            <span className="text-blue-200 text-sm font-medium">Unisciti alla comunita</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center bg-white md:bg-blue-50/30 px-6 py-10 md:px-10">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 mb-8 md:hidden">
            <GraduationCap className="w-8 h-8 text-blue-800" />
            <span className="text-blue-900 font-poppins text-2xl font-bold">EduPlay</span>
          </div>

          {/* Headline */}
          <h1 className="font-poppins text-2xl font-bold text-blue-900 mb-1">
            Crea il tuo account gratuito
          </h1>
          <p className="text-gray-500 mb-8">
            Inizia il tuo percorso di apprendimento
          </p>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Google OAuth */}
          <button
            onClick={handleGoogleRegister}
            disabled={loading}
            className="border-2 border-gray-200 rounded-xl px-4 py-3 w-full flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 cursor-pointer disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-gray-700 font-semibold text-sm">Continua con Google</span>
          </button>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="px-3 bg-white text-gray-400 text-sm">oppure</span></div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Mario Rossi"
                  required
                  className="border border-gray-200 rounded-xl pl-11 pr-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@email.com"
                  required
                  className="border border-gray-200 rounded-xl pl-11 pr-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Crea una password sicura"
                  required
                  className="border border-gray-200 rounded-xl pl-11 pr-11 py-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {/* Password strength indicator */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          level <= passwordStrength.level ? passwordStrength.color : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs mt-1 ${
                    passwordStrength.level === 1 ? "text-red-500" :
                    passwordStrength.level === 2 ? "text-yellow-600" :
                    "text-green-600"
                  }`}>
                    {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">Conferma password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ripeti la password"
                  required
                  className={`border rounded-xl pl-11 pr-11 py-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm ${
                    confirmPassword.length > 0
                      ? passwordsMatch
                        ? "border-green-400"
                        : "border-red-300"
                      : "border-gray-200"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${passwordsMatch ? "text-green-600" : "text-red-500"}`}>
                  {passwordsMatch ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Le password coincidono</span>
                    </>
                  ) : (
                    <span>Le password non coincidono</span>
                  )}
                </p>
              )}
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                required
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm text-gray-600">
                Accetto i{" "}
                <Link href="/terms" className="text-blue-600 hover:underline font-medium">Termini di Servizio</Link>
                {" "}e la{" "}
                <Link href="/privacy" className="text-blue-600 hover:underline font-medium">Privacy Policy</Link>
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-cta w-full py-3.5 text-base flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Registrazione in corso...</span>
                </>
              ) : (
                "Crea Account Gratis"
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center mt-6 text-sm text-gray-500">
            Hai gia un account?{" "}
            <Link href="/login" className="text-blue-600 font-semibold hover:underline transition cursor-pointer">
              Accedi
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
