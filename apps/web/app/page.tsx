'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  TrendingUp,
  Bot,
  Trophy,
  Menu,
  X,
  Star,
  Clock,
  Zap,
  Users,
  Award,
  ChevronRight,
  Github,
  Twitter,
  Linkedin,
  GraduationCap,
  Sparkles,
  Target,
  BarChart3,
  ShieldCheck,
  Megaphone,
  Brain,
  HandshakeIcon,
} from 'lucide-react';

/* ── Intersection Observer hook for scroll animations ──────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

/* ── Animated counter ──────────────────────────────────────── */
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView(0.3);

  useEffect(() => {
    if (!inView) return;
    let current = 0;
    const increment = Math.ceil(target / 40);
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {count.toLocaleString('it-IT')}
      {suffix}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════
   LANDING PAGE
   ══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* section refs for scroll animations */
  const hero = useInView(0.1);
  const features = useInView();
  const howItWorks = useInView();
  const social = useInView();
  const courses = useInView();
  const ctaFinal = useInView();

  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      {/* ── 1. NAVBAR ─────────────────────────────────────── */}
      <nav
        className="fixed top-4 left-4 right-4 z-50 glass-nav rounded-2xl shadow-lg"
        role="navigation"
        aria-label="Navigazione principale"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 cursor-pointer"
            aria-label="EduPlay home"
          >
            <div className="w-9 h-9 bg-blue-800 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <span className="text-xl font-bold font-poppins text-blue-800">
              EduPlay
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="#corsi"
              className="text-slate-600 hover:text-blue-800 font-medium transition-colors duration-200 cursor-pointer"
            >
              Corsi
            </Link>
            <Link
              href="#funzionalita"
              className="text-slate-600 hover:text-blue-800 font-medium transition-colors duration-200 cursor-pointer"
            >
              Funzionalità
            </Link>
            <Link
              href="#leaderboard"
              className="text-slate-600 hover:text-blue-800 font-medium transition-colors duration-200 cursor-pointer"
            >
              Leaderboard
            </Link>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="btn-outline text-sm px-4 py-2 cursor-pointer"
            >
              Accedi
            </Link>
            <Link
              href="/register"
              className="btn-cta text-sm px-4 py-2 cursor-pointer"
            >
              Inizia Gratis
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-blue-50 transition-colors duration-200 cursor-pointer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Chiudi menu' : 'Apri menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-blue-800" aria-hidden="true" />
            ) : (
              <Menu className="w-6 h-6 text-blue-800" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pb-4 border-t border-blue-100">
            <div className="flex flex-col gap-2 pt-3">
              <Link
                href="#corsi"
                className="px-4 py-2 rounded-lg hover:bg-blue-50 text-slate-700 font-medium transition-colors duration-200 cursor-pointer"
                onClick={() => setMobileMenuOpen(false)}
              >
                Corsi
              </Link>
              <Link
                href="#funzionalita"
                className="px-4 py-2 rounded-lg hover:bg-blue-50 text-slate-700 font-medium transition-colors duration-200 cursor-pointer"
                onClick={() => setMobileMenuOpen(false)}
              >
                Funzionalità
              </Link>
              <Link
                href="#leaderboard"
                className="px-4 py-2 rounded-lg hover:bg-blue-50 text-slate-700 font-medium transition-colors duration-200 cursor-pointer"
                onClick={() => setMobileMenuOpen(false)}
              >
                Leaderboard
              </Link>
              <hr className="border-blue-100" />
              <Link
                href="/login"
                className="btn-outline text-sm text-center cursor-pointer"
                onClick={() => setMobileMenuOpen(false)}
              >
                Accedi
              </Link>
              <Link
                href="/register"
                className="btn-cta text-sm text-center cursor-pointer"
                onClick={() => setMobileMenuOpen(false)}
              >
                Inizia Gratis
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── 2. HERO SECTION ───────────────────────────────── */}
      <section
        ref={hero.ref}
        className="min-h-screen bg-gradient-to-b from-blue-50 via-indigo-50 to-white pt-28 sm:pt-32 pb-16 relative overflow-hidden"
      >
        {/* Decorative blob */}
        <div
          className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(59,130,246,0.4) 0%, rgba(99,102,241,0.2) 50%, transparent 70%)',
          }}
          aria-hidden="true"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center relative z-10">
          {/* Left content */}
          <div
            className={`transition-all duration-700 ${hero.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h1 className="text-5xl md:text-7xl font-bold font-poppins leading-tight mb-6">
              <span className="bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent">
                Impara.
              </span>{' '}
              <span className="text-slate-800">Gioca.</span>{' '}
              <span className="bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent">
                Domina.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 max-w-xl mb-8 leading-relaxed">
              La prima piattaforma italiana che trasforma l&apos;apprendimento in un gioco.
              Guadagna XP, scala le classifiche, ottieni certificati.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link
                href="/register"
                className="btn-cta text-base px-8 py-3.5 text-center cursor-pointer animate-pulse-glow"
              >
                Inizia Gratis Ora
              </Link>
              <Link
                href="#corsi"
                className="btn-outline text-base px-8 py-3.5 text-center cursor-pointer"
              >
                Esplora i Corsi
              </Link>
            </div>

            {/* Stats inline */}
            <div className="flex flex-wrap gap-6 text-sm font-semibold text-slate-500">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" aria-hidden="true" />
                <span>7+ Corsi</span>
              </div>
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-600" aria-hidden="true" />
                <span>21 Agenti AI</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" aria-hidden="true" />
                <span>10.000+ Studenti</span>
              </div>
            </div>
          </div>

          {/* Right side: visual mockup */}
          <div
            className={`relative hidden lg:block transition-all duration-700 delay-200 ${hero.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            aria-hidden="true"
          >
            {/* Device frame */}
            <div className="relative mx-auto w-[340px]">
              <div className="rounded-3xl bg-white shadow-2xl border border-blue-100 p-6 space-y-4">
                {/* Header mockup */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-blue-700" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800">Livello 12</div>
                      <div className="text-xs text-slate-400">Digital Marketing</div>
                    </div>
                  </div>
                  <div className="badge-xp">
                    <Zap className="w-3 h-3" />
                    2.450 XP
                  </div>
                </div>
                {/* XP bar */}
                <div className="xp-bar">
                  <div className="xp-bar-fill" style={{ width: '72%' }} />
                </div>
                {/* Mini cards */}
                <div className="space-y-3">
                  <div className="glass-card p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-700 truncate">SEO Fundamentals</div>
                      <div className="text-xs text-green-600 font-medium">Completato</div>
                    </div>
                    <Award className="w-5 h-5 text-amber-500 ml-auto shrink-0" />
                  </div>
                  <div className="glass-card p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-700 truncate">Analytics Avanzato</div>
                      <div className="text-xs text-blue-600 font-medium">In corso - 65%</div>
                    </div>
                  </div>
                  <div className="glass-card p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-700 truncate">AI Content Creation</div>
                      <div className="text-xs text-slate-400 font-medium">Da iniziare</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 glass-card px-4 py-2 flex items-center gap-2 animate-float">
                <GraduationCap className="w-5 h-5 text-blue-700" />
                <span className="text-sm font-bold text-blue-800">Lv.12</span>
                <span className="badge-xp text-xs">+50 XP</span>
              </div>

              {/* Floating trophy card */}
              <div className="absolute -bottom-6 -left-8 glass-card px-4 py-3 flex items-center gap-2 animate-float" style={{ animationDelay: '1.5s' }}>
                <Trophy className="w-5 h-5 text-amber-500" />
                <div>
                  <div className="text-xs font-bold text-slate-700">Badge Sbloccato!</div>
                  <div className="text-xs text-slate-400">Prima Lezione</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. FEATURES GRID ──────────────────────────────── */}
      <section
        id="funzionalita"
        ref={features.ref}
        className="py-20 sm:py-28 bg-white"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Section header */}
          <div className="text-center mb-16">
            <div className="inline-block w-12 h-1 bg-blue-800 rounded-full mb-4" aria-hidden="true" />
            <h2 className="text-3xl sm:text-4xl font-bold font-poppins text-slate-900 mb-4">
              Perché EduPlay?
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Tutto quello che serve per imparare divertendosi, in un&apos;unica piattaforma.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: TrendingUp,
                title: 'Sistema XP & Livelli',
                desc: 'Guadagna punti esperienza ogni volta che completi una lezione. Sale di livello da Novizio a Guru.',
                color: 'text-amber-500',
                bg: 'bg-amber-50',
              },
              {
                icon: Bot,
                title: 'AI Tutor 24/7',
                desc: 'Il tuo assistente personale conosce ogni corso e risponde in italiano. Sempre disponibile.',
                color: 'text-blue-600',
                bg: 'bg-blue-50',
              },
              {
                icon: Trophy,
                title: 'Missioni & Badge',
                desc: 'Completa sfide giornaliere, conquista badge esclusivi e scala la classifica globale.',
                color: 'text-green-600',
                bg: 'bg-green-50',
              },
            ].map(({ icon: Icon, title, desc, color, bg }, i) => (
              <div
                key={title}
                className={`glass-card p-8 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 ${
                  features.inView
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div
                  className={`w-14 h-14 ${bg} rounded-2xl flex items-center justify-center mb-6`}
                >
                  <Icon className={`w-7 h-7 ${color}`} aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold font-poppins text-slate-900 mb-3">
                  {title}
                </h3>
                <p className="text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. COME FUNZIONA ──────────────────────────────── */}
      <section
        ref={howItWorks.ref}
        className="py-20 sm:py-28 bg-gradient-to-br from-blue-800 to-indigo-900 relative overflow-hidden"
      >
        {/* Subtle pattern */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
          aria-hidden="true"
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-block w-12 h-1 bg-green-400 rounded-full mb-4" aria-hidden="true" />
            <h2 className="text-3xl sm:text-4xl font-bold font-poppins text-white mb-4">
              Come Funziona
            </h2>
            <p className="text-blue-200 text-lg max-w-2xl mx-auto">
              Tre semplici passi per iniziare il tuo percorso di apprendimento.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-4 relative">
            {/* Connector line (desktop only) */}
            <div
              className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-blue-600/30"
              aria-hidden="true"
            />

            {[
              {
                num: '01',
                title: 'Scegli il Corso',
                desc: 'Esplora il catalogo e trova il percorso perfetto per i tuoi obiettivi.',
                icon: Target,
              },
              {
                num: '02',
                title: 'Completa Lezioni',
                desc: 'Segui le lezioni interattive, supera i quiz e guadagna XP ad ogni step.',
                icon: BookOpen,
              },
              {
                num: '03',
                title: 'Guadagna Certificato',
                desc: 'Raggiungi il traguardo finale e ottieni il tuo certificato verificato.',
                icon: Award,
              },
            ].map(({ num, title, desc, icon: Icon }, i) => (
              <div
                key={num}
                className={`text-center relative transition-all duration-500 ${
                  howItWorks.inView
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${i * 200}ms` }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 border border-white/20 mb-6 relative z-10">
                  <span className="text-2xl font-bold font-poppins bg-gradient-to-br from-green-400 to-blue-400 bg-clip-text text-transparent">
                    {num}
                  </span>
                </div>
                <div className="mb-3">
                  <Icon className="w-6 h-6 text-blue-300 mx-auto" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold font-poppins text-white mb-2">
                  {title}
                </h3>
                <p className="text-blue-200 leading-relaxed max-w-xs mx-auto">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. SOCIAL PROOF ───────────────────────────────── */}
      <section
        id="leaderboard"
        ref={social.ref}
        className="py-20 sm:py-28 bg-gradient-to-b from-white to-blue-50"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-block w-12 h-1 bg-blue-800 rounded-full mb-4" aria-hidden="true" />
            <h2 className="text-3xl sm:text-4xl font-bold font-poppins text-slate-900 mb-4">
              Unisciti a 10.000+ studenti
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Scopri cosa dicono i nostri studenti della loro esperienza su EduPlay.
            </p>
          </div>

          {/* Testimonials */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              {
                name: 'Marco R.',
                role: 'Digital Marketer',
                text: 'In 3 mesi ho ottenuto la certificazione e trovato lavoro. La gamification ti tiene motivato ogni giorno.',
                initials: 'MR',
                color: 'bg-blue-600',
                stars: 5,
              },
              {
                name: 'Laura B.',
                role: 'Studentessa Universitaria',
                text: 'Il tutor AI è incredibile. Risponde in italiano e spiega concetti complessi in modo semplice.',
                initials: 'LB',
                color: 'bg-purple-600',
                stars: 5,
              },
              {
                name: 'Alessandro T.',
                role: 'Imprenditore',
                text: 'Ho formato il mio team vendite con EduPlay. I badge e le classifiche hanno aumentato il completamento del 300%.',
                initials: 'AT',
                color: 'bg-green-600',
                stars: 5,
              },
            ].map(({ name, role, text, initials, color, stars }, i) => (
              <div
                key={name}
                className={`glass-card p-6 transition-all duration-500 ${
                  social.inView
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-11 h-11 ${color} rounded-full flex items-center justify-center text-white font-bold text-sm`}
                  >
                    {initials}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{name}</div>
                    <div className="text-sm text-slate-400">{role}</div>
                  </div>
                </div>
                <div className="flex gap-1 mb-3" aria-label={`${stars} stelle su 5`}>
                  {Array.from({ length: stars }).map((_, si) => (
                    <Star
                      key={si}
                      className="w-4 h-4 text-amber-400 fill-amber-400"
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <p className="text-slate-600 leading-relaxed text-sm">{text}</p>
              </div>
            ))}
          </div>

          {/* Stats counter */}
          <div
            className={`grid grid-cols-2 md:grid-cols-4 gap-6 transition-all duration-700 ${
              social.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '400ms' }}
          >
            {[
              { value: 10000, suffix: '+', label: 'Studenti', icon: Users },
              { value: 98, suffix: '%', label: 'Soddisfazione', icon: Star },
              { value: 7, suffix: '', label: 'Corsi', icon: BookOpen },
              { value: 21, suffix: '', label: 'AI Agenti', icon: Bot },
            ].map(({ value, suffix, label, icon: Icon }) => (
              <div
                key={label}
                className="glass-card p-6 text-center"
              >
                <Icon className="w-6 h-6 text-blue-600 mx-auto mb-2" aria-hidden="true" />
                <div className="text-3xl sm:text-4xl font-bold font-poppins text-slate-900">
                  <AnimatedCounter target={value} suffix={suffix} />
                </div>
                <div className="text-sm text-slate-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. CORSI IN EVIDENZA ──────────────────────────── */}
      <section
        id="corsi"
        ref={courses.ref}
        className="py-20 sm:py-28 bg-white"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-block w-12 h-1 bg-blue-800 rounded-full mb-4" aria-hidden="true" />
            <h2 className="text-3xl sm:text-4xl font-bold font-poppins text-slate-900 mb-4">
              Corsi in Evidenza
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Scegli il tuo percorso e inizia a guadagnare XP oggi stesso.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Digital Marketing',
                desc: 'Impara SEO, Social Media, Ads e Analytics con lezioni pratiche e progetti reali.',
                icon: Megaphone,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                badge: 'Intermedio',
                badgeColor: 'bg-blue-100 text-blue-700',
                xp: '2.500 XP',
                duration: '12 settimane',
              },
              {
                title: 'Intelligenza Artificiale',
                desc: 'Dai fondamenti al prompt engineering avanzato. Costruisci agenti AI e automatizza i flussi di lavoro.',
                icon: Brain,
                color: 'text-purple-600',
                bg: 'bg-purple-50',
                badge: 'Avanzato',
                badgeColor: 'bg-purple-100 text-purple-700',
                xp: '3.200 XP',
                duration: '16 settimane',
              },
              {
                title: 'Vendite',
                desc: 'Tecniche di vendita, negoziazione e CRM. Dal primo contatto alla chiusura del deal.',
                icon: HandshakeIcon,
                color: 'text-green-600',
                bg: 'bg-green-50',
                badge: 'Base',
                badgeColor: 'bg-green-100 text-green-700',
                xp: '1.800 XP',
                duration: '8 settimane',
              },
            ].map(
              (
                { title, desc, icon: Icon, color, bg, badge, badgeColor, xp, duration },
                i
              ) => (
                <div
                  key={title}
                  className={`card-hover p-6 flex flex-col transition-all duration-500 ${
                    courses.inView
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: `${i * 150}ms` }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center`}
                    >
                      <Icon className={`w-6 h-6 ${color}`} aria-hidden="true" />
                    </div>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${badgeColor}`}
                    >
                      {badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold font-poppins text-slate-900 mb-2">
                    {title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-1">
                    {desc}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                      {xp}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      {duration}
                    </span>
                  </div>

                  <Link
                    href="/register"
                    className="btn-cta text-sm text-center w-full cursor-pointer"
                  >
                    Inizia Gratis
                    <ChevronRight className="w-4 h-4 inline ml-1" aria-hidden="true" />
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ── 7. CTA FINALE ─────────────────────────────────── */}
      <section
        ref={ctaFinal.ref}
        className="py-20 sm:py-28 bg-gradient-to-br from-blue-800 to-indigo-900 relative overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
          aria-hidden="true"
        />
        <div
          className={`max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10 transition-all duration-700 ${
            ctaFinal.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl sm:text-5xl font-bold font-poppins text-white mb-6">
            Inizia il tuo percorso oggi
          </h2>
          <p className="text-blue-200 text-lg mb-10 max-w-xl mx-auto">
            Unisciti a migliaia di studenti che stanno già trasformando il loro futuro
            con EduPlay. Gratis per iniziare.
          </p>
          <Link
            href="/register"
            className="btn-cta text-lg px-10 py-4 inline-flex items-center gap-2 cursor-pointer"
          >
            Inizia Gratis Ora
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* ── 8. FOOTER ─────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-16" role="contentinfo">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Col 1: Logo */}
            <div>
              <Link href="/" className="flex items-center gap-2 mb-4 cursor-pointer" aria-label="EduPlay home">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" aria-hidden="true" />
                </div>
                <span className="text-xl font-bold font-poppins text-white">
                  EduPlay
                </span>
              </Link>
              <p className="text-sm leading-relaxed">
                La piattaforma educativa gamificata italiana.
                Impara, gioca, domina.
              </p>
            </div>

            {/* Col 2: Corsi */}
            <div>
              <h4 className="text-white font-semibold mb-4">Corsi</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="hover:text-white transition-colors duration-200 cursor-pointer">
                    Digital Marketing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors duration-200 cursor-pointer">
                    Intelligenza Artificiale
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors duration-200 cursor-pointer">
                    Vendite
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Azienda */}
            <div>
              <h4 className="text-white font-semibold mb-4">Azienda</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="hover:text-white transition-colors duration-200 cursor-pointer">
                    Chi siamo
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors duration-200 cursor-pointer">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors duration-200 cursor-pointer">
                    Lavora con noi
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Contatti */}
            <div>
              <h4 className="text-white font-semibold mb-4">Contatti</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="mailto:info@eduplay.it"
                    className="hover:text-white transition-colors duration-200 cursor-pointer"
                  >
                    info@eduplay.it
                  </Link>
                </li>
              </ul>
              <div className="flex gap-4 mt-4">
                <Link
                  href="#"
                  className="hover:text-white transition-colors duration-200 cursor-pointer"
                  aria-label="GitHub"
                >
                  <Github className="w-5 h-5" aria-hidden="true" />
                </Link>
                <Link
                  href="#"
                  className="hover:text-white transition-colors duration-200 cursor-pointer"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5" aria-hidden="true" />
                </Link>
                <Link
                  href="#"
                  className="hover:text-white transition-colors duration-200 cursor-pointer"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-5 h-5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 text-center text-sm">
            <p>&copy; 2026 EduPlay. Tutti i diritti riservati.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
