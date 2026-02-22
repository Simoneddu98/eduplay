import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-primary to-accent">
      {/* ── NAVBAR ───────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-400 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm">EP</span>
          </div>
          <span className="text-white font-black text-xl">EduPlay</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="text-white/80 hover:text-white px-4 py-2 text-sm font-medium transition">
            Accedi
          </Link>
          <Link href="/register" className="bg-orange-400 hover:bg-orange-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition">
            Inizia Gratis
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 text-orange-300 px-4 py-2 rounded-full text-sm font-semibold mb-8 border border-orange-400/30">
          <span>🎮</span>
          <span>Impara Digital Marketing, AI e Vendita giocando</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6">
          Trasforma l'apprendimento
          <br />
          <span className="text-orange-400">in un gioco</span>
        </h1>

        <p className="text-xl text-white/70 max-w-2xl mx-auto mb-10">
          Guadagna XP, sblocca badge, scala la leaderboard e ottieni certificazioni reali
          mentre padroneggi Digital Marketing, AI e Vendita.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register" className="btn-primary text-base px-8 py-3.5 bg-orange-400 hover:bg-orange-500 border-0">
            🚀 Inizia Gratis Ora
          </Link>
          <Link href="#corsi" className="btn-outline text-base px-8 py-3.5 border-white/30 text-white hover:bg-white hover:text-primary">
            Vedi i Corsi
          </Link>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: "7", label: "Corsi Disponibili" },
            { value: "21+", label: "AI Agents" },
            { value: "100%", label: "Stack Gratuito" },
          ].map(({ value, label }) => (
            <div key={label} className="bg-white/10 backdrop-blur rounded-xl p-6 text-center border border-white/20">
              <div className="text-3xl font-black text-orange-400">{value}</div>
              <div className="text-white/70 text-sm mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section id="corsi" className="bg-white py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-black text-center text-primary mb-4">
            Non è un corso. È un'avventura.
          </h2>
          <p className="text-center text-gray-600 mb-16 text-lg max-w-2xl mx-auto">
            Ogni lezione è una missione, ogni quiz è una sfida, ogni badge è una conquista.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "🏆",
                title: "Sistema XP & Livelli",
                desc: "Guadagna punti esperienza per ogni lezione completata. Sali di livello da Novizio a Guru del tuo settore.",
                color: "bg-orange-50 border-orange-200",
              },
              {
                icon: "🤖",
                title: "AI Tutor 24/7",
                desc: "Un assistente AI addestrato sui contenuti dei corsi risponde alle tue domande in qualsiasi momento, gratis.",
                color: "bg-blue-50 border-blue-200",
              },
              {
                icon: "🎯",
                title: "Missioni & Badge",
                desc: "Missioni settimanali, sfide di team, streak giornalieri. Ogni traguardo è premiato con badge e EduCoins.",
                color: "bg-green-50 border-green-200",
              },
            ].map(({ icon, title, desc, color }) => (
              <div key={title} className={`rounded-xl border p-8 ${color}`}>
                <div className="text-4xl mb-4">{icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINALE ───────────────────────────────────────── */}
      <section className="bg-primary py-20 text-center">
        <h2 className="text-3xl font-black text-white mb-4">
          Pronto a iniziare la tua avventura?
        </h2>
        <p className="text-white/70 mb-8 text-lg">
          Unisciti ora. È gratis per iniziare.
        </p>
        <Link href="/register" className="bg-orange-400 hover:bg-orange-500 text-white font-bold text-lg px-10 py-4 rounded-xl inline-block transition">
          Crea il tuo account →
        </Link>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-white/50 text-sm text-center py-6">
        <p>© 2025 EduPlay — Creato con 🎮 da Simone</p>
      </footer>
    </main>
  );
}
