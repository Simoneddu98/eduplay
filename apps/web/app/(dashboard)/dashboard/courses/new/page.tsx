"use client";

/**
 * /dashboard/courses/new — Wizard 3 step per creare un corso.
 *
 * Step 1: Titolo, descrizione, categoria (libera), livello
 * Step 2: Obiettivi formativi + durata
 * Step 3: Scegli struttura (da zero / template / AI)
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Sparkles, BookOpen,
  Target, Plus, Trash2, Loader2, Check, Layout,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { CategoryInput } from "@/components/ui/CategoryInput";
import { createCourseAction } from "@/lib/actions/courses";
import { generateCourseOutlineAction } from "@/lib/actions/ai";
import type { AIOutline } from "@/features/course-creator/types";

type Step = 1 | 2 | 3;
type Structure = "empty" | "template" | "ai";

interface FormData {
  title: string;
  description: string;
  category: string;
  level: string;
  objectives: string[];
  duration_hours: number;
  ai_audience: string;
  ai_num_modules: number;
  structure: Structure;
  template_id: string | null;
}

const LEVELS = [
  { value: "base",         label: "Base",        desc: "Per chi inizia" },
  { value: "intermediate", label: "Intermedio",   desc: "Con esperienza" },
  { value: "advanced",     label: "Avanzato",     desc: "Professionisti" },
];

// Course structure templates — pure structure, no content
const TEMPLATES = [
  {
    id: "base",
    name: "Corso base",
    desc: "3 moduli × 3 lezioni",
    emoji: "📘",
    modules: [
      { title: "Introduzione", lessons: ["Benvenuto al corso", "Obiettivi", "Come usare il corso"] },
      { title: "Parte centrale", lessons: ["Concetto 1", "Concetto 2", "Quiz intermedio"] },
      { title: "Conclusioni", lessons: ["Riepilogo", "Metti in pratica", "Prossimi passi"] },
    ],
  },
  {
    id: "intensive",
    name: "Corso intensivo",
    desc: "5 moduli × 4 lezioni",
    emoji: "⚡",
    modules: [
      { title: "Fondamenti", lessons: ["Introduzione", "Concetti chiave", "Storia e contesto", "Quiz"] },
      { title: "Teoria avanzata", lessons: ["Approfondimento 1", "Approfondimento 2", "Casi studio", "Quiz"] },
      { title: "Applicazione pratica", lessons: ["Tecnica 1", "Tecnica 2", "Esercizio guidato", "Quiz"] },
      { title: "Progetto reale", lessons: ["Briefing progetto", "Sviluppo", "Revisione", "Quiz"] },
      { title: "Mastery", lessons: ["Sintesi", "Best practice", "Risorse aggiuntive", "Esame finale"] },
    ],
  },
  {
    id: "workshop",
    name: "Workshop pratico",
    desc: "2 moduli × 5 lezioni",
    emoji: "🔧",
    modules: [
      { title: "Teoria essenziale", lessons: ["Principi base", "Strumenti necessari", "Setup iniziale", "Primo esercizio", "Quiz"] },
      { title: "Laboratorio pratico", lessons: ["Esercizio 1", "Esercizio 2", "Esercizio 3", "Progetto finale", "Revisione"] },
    ],
  },
  {
    id: "onboarding",
    name: "Corso onboarding",
    desc: "4 moduli × 3 lezioni",
    emoji: "👋",
    modules: [
      { title: "Benvenuto", lessons: ["Presentazione", "Struttura dell'azienda", "Valori e cultura"] },
      { title: "Il tuo ruolo", lessons: ["Responsabilità", "Strumenti di lavoro", "Procedure chiave"] },
      { title: "Collaborazione", lessons: ["Il tuo team", "Comunicazione interna", "Meeting e rituali"] },
      { title: "Primi 30 giorni", lessons: ["Obiettivi iniziali", "Check-in settimanale", "Risorse utili"] },
    ],
  },
  {
    id: "masterclass",
    name: "Masterclass",
    desc: "6 moduli × 5 lezioni",
    emoji: "🎓",
    modules: [
      { title: "Panoramica", lessons: ["Intro masterclass", "Framework principale", "Mindset", "Risorse", "Quiz"] },
      { title: "Livello 1", lessons: ["Lezione 1", "Lezione 2", "Lezione 3", "Esercizio", "Quiz"] },
      { title: "Livello 2", lessons: ["Lezione 1", "Lezione 2", "Lezione 3", "Esercizio", "Quiz"] },
      { title: "Livello 3", lessons: ["Lezione 1", "Lezione 2", "Case study", "Esercizio", "Quiz"] },
      { title: "Progetto finale", lessons: ["Briefing", "Sviluppo pt.1", "Sviluppo pt.2", "Revisione", "Quiz"] },
      { title: "Certificazione", lessons: ["Riepilogo globale", "Consigli avanzati", "Community", "Esame", "Certificato"] },
    ],
  },
  {
    id: "mini",
    name: "Mini-corso",
    desc: "2 moduli × 2 lezioni",
    emoji: "⚡",
    modules: [
      { title: "Fondamentali", lessons: ["Introduzione rapida", "Concetto principale"] },
      { title: "Metti in pratica", lessons: ["Esercizio pratico", "Prossimi passi"] },
    ],
  },
];

export default function NewCoursePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [isPending, startTransition] = useTransition();
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [outline, setOutline] = useState<AIOutline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    title: "",
    description: "",
    category: "",
    level: "base",
    objectives: [""],
    duration_hours: 2,
    ai_audience: "",
    ai_num_modules: 4,
    structure: "empty",
    template_id: null,
  });

  const update = (partial: Partial<FormData>) => setForm((p) => ({ ...p, ...partial }));

  const canNext1 = form.title.trim().length >= 3;
  const canNext2 = form.objectives.some((o) => o.trim().length > 0);
  const canSubmit = form.structure === "empty" || form.structure === "template"
    ? true
    : !!outline;

  const handleGenerateOutline = async () => {
    setGeneratingOutline(true);
    setError(null);
    const result = await generateCourseOutlineAction({
      topic: form.title,
      audience: form.ai_audience,
      duration_hours: form.duration_hours,
      num_modules: form.ai_num_modules,
      level: form.level,
    });
    setGeneratingOutline(false);
    if (result.ok) {
      setOutline(result.data);
      update({ objectives: result.data.learning_objectives });
    } else {
      setError(result.error);
    }
  };

  const handleSubmit = () => {
    startTransition(async () => {
      setError(null);
      const result = await createCourseAction({
        title: outline?.course_title || form.title,
        description: outline?.course_description || form.description,
        category: form.category,
        level: form.level,
        learning_objectives: form.objectives.filter(Boolean),
      });
      if (result.ok) {
        router.push(`/dashboard/courses/${result.data.id}`);
      } else {
        setError(result.error);
      }
    });
  };

  const STEPS = [
    { n: 1, label: "Informazioni" },
    { n: 2, label: "Obiettivi" },
    { n: 3, label: "Struttura" },
  ];

  const selectedTemplate = TEMPLATES.find((t) => t.id === form.template_id);
  const previewTpl = TEMPLATES.find((t) => t.id === previewTemplate);

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-slate-800">
        <Link href="/dashboard/courses" className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-sm font-semibold text-white">Nuovo corso</h1>

        {/* Step indicator */}
        <div className="flex items-center gap-2 ml-auto">
          {STEPS.map(({ n, label }) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step > n ? "bg-green-600 text-white" :
                step === n ? "bg-purple-600 text-white" :
                "bg-slate-800 text-slate-500"
              }`}>
                {step > n ? <Check className="w-3.5 h-3.5" /> : n}
              </div>
              <span className={`text-xs hidden sm:inline ${step === n ? "text-white" : "text-slate-500"}`}>
                {label}
              </span>
              {n < 3 && <div className={`h-px w-8 ${step > n ? "bg-green-600" : "bg-slate-700"}`} />}
            </div>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center pt-12 px-4">
        <div className="w-full max-w-lg pb-12">

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Informazioni base</h2>
                <p className="text-slate-400 text-sm">Dai un nome al tuo corso e scegli la categoria.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Titolo del corso * <span className="text-slate-500 font-normal ml-1">{form.title.length}/100</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  maxLength={100}
                  value={form.title}
                  onChange={(e) => update({ title: e.target.value })}
                  placeholder="Es. Email Marketing per e-commerce"
                  aria-label="Titolo del corso"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {form.title.length > 0 && form.title.length < 3 && (
                  <p className="text-xs text-amber-400 mt-1">Almeno 3 caratteri</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descrizione <span className="text-slate-500 font-normal ml-1">{form.description.length}/300</span>
                </label>
                <textarea
                  maxLength={300}
                  rows={3}
                  value={form.description}
                  onChange={(e) => update({ description: e.target.value })}
                  placeholder="Breve descrizione del corso..."
                  aria-label="Descrizione del corso"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* CategoryInput — free text + autocomplete */}
              <CategoryInput
                label="Categoria"
                value={form.category}
                onChange={(v) => update({ category: v })}
                dark
              />

              <div>
                <p className="text-xs font-semibold text-slate-300 mb-2">Livello *</p>
                <div className="grid grid-cols-3 gap-3">
                  {LEVELS.map((lv) => (
                    <button
                      key={lv.value}
                      type="button"
                      onClick={() => update({ level: lv.value })}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        form.level === lv.value
                          ? "border-purple-500 bg-purple-900/30"
                          : "border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">{lv.label}</p>
                      <p className="text-xs text-slate-400">{lv.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Obiettivi formativi</h2>
                <p className="text-slate-400 text-sm">Cosa saprà fare il corsista al termine?</p>
              </div>

              <div className="space-y-2">
                {form.objectives.map((obj, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={obj}
                      onChange={(e) => {
                        const o = [...form.objectives];
                        o[i] = e.target.value;
                        update({ objectives: o });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && i === form.objectives.length - 1) {
                          e.preventDefault();
                          if (form.objectives.length < 8) {
                            update({ objectives: [...form.objectives, ""] });
                          }
                        }
                      }}
                      placeholder={`Obiettivo ${i + 1}... (usa verbi d'azione)`}
                      aria-label={`Obiettivo ${i + 1}`}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => update({ objectives: form.objectives.filter((_, idx) => idx !== i) })}
                      disabled={form.objectives.length === 1}
                      className="p-2 text-slate-500 hover:text-red-400 disabled:opacity-30"
                      aria-label="Rimuovi obiettivo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {form.objectives.length < 8 && (
                  <button
                    type="button"
                    onClick={() => update({ objectives: [...form.objectives, ""] })}
                    className="flex items-center gap-1.5 text-xs text-purple-400 hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Aggiungi obiettivo
                  </button>
                )}
                <p className="text-xs text-slate-500">{form.objectives.length}/8 obiettivi · Premi Enter per aggiungere il successivo</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Durata stimata: <span className="text-purple-400">{form.duration_hours}h</span>
                </label>
                <input
                  type="range" min={1} max={20} value={form.duration_hours}
                  onChange={(e) => update({ duration_hours: Number(e.target.value) })}
                  className="w-full accent-purple-600"
                  aria-label="Durata corso"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1h</span><span>10h</span><span>20h</span>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Struttura del corso</h2>
                <p className="text-slate-400 text-sm">Scegli come iniziare a costruire il tuo corso.</p>
              </div>

              {/* Option A — Empty */}
              <button
                type="button"
                onClick={() => update({ structure: "empty", template_id: null })}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  form.structure === "empty"
                    ? "border-purple-500 bg-purple-900/20"
                    : "border-slate-700 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Inizia da zero</p>
                    <p className="text-xs text-slate-400">Crea lezioni e moduli manualmente nell&apos;editor</p>
                  </div>
                  {form.structure === "empty" && <Check className="w-4 h-4 text-purple-400 ml-auto" />}
                </div>
              </button>

              {/* Option B — Template */}
              <div className={`rounded-xl border-2 transition-all overflow-hidden ${
                form.structure === "template"
                  ? "border-purple-500"
                  : "border-slate-700"
              }`}>
                <button
                  type="button"
                  onClick={() => update({ structure: "template" })}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <Layout className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white flex items-center gap-2">
                        Usa un template
                        <span className="text-[10px] bg-blue-900/50 border border-blue-700 text-blue-300 px-1.5 py-0.5 rounded-full">6 opzioni</span>
                      </p>
                      <p className="text-xs text-slate-400">Struttura predefinita editabile nell&apos;editor</p>
                    </div>
                    {form.structure === "template" && <Check className="w-4 h-4 text-purple-400 ml-auto" />}
                  </div>
                </button>

                {form.structure === "template" && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-2 gap-2">
                      {TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => {
                            update({ template_id: tpl.id });
                            setPreviewTemplate(tpl.id === previewTemplate ? null : tpl.id);
                          }}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            form.template_id === tpl.id
                              ? "border-purple-500 bg-purple-900/30"
                              : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
                          }`}
                        >
                          <span className="text-lg">{tpl.emoji}</span>
                          <p className="text-xs font-semibold text-white mt-1">{tpl.name}</p>
                          <p className="text-[10px] text-slate-400">{tpl.desc}</p>
                        </button>
                      ))}
                    </div>

                    {/* Template preview */}
                    {selectedTemplate && (
                      <div className="mt-3 p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-1.5">
                        <p className="text-xs font-semibold text-slate-300">Struttura: {selectedTemplate.name}</p>
                        {selectedTemplate.modules.map((m, i) => (
                          <div key={i}>
                            <p className="text-[10px] text-slate-400 font-medium">Modulo {i + 1}: {m.title}</p>
                            <p className="text-[10px] text-slate-500 ml-2">{m.lessons.join(" · ")}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Option C — AI */}
              <div className={`rounded-xl border-2 transition-all overflow-hidden ${
                form.structure === "ai"
                  ? "border-purple-500"
                  : "border-slate-700"
              }`}>
                <button
                  type="button"
                  onClick={() => update({ structure: "ai", template_id: null })}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white flex items-center gap-2">
                        Genera con AI
                        <span className="text-[10px] bg-purple-900/50 border border-purple-700 text-purple-300 px-1.5 py-0.5 rounded-full">Consigliato</span>
                      </p>
                      <p className="text-xs text-slate-400">Struttura completa generata in 10 secondi</p>
                    </div>
                    {form.structure === "ai" && <Check className="w-4 h-4 text-purple-400 ml-auto" />}
                  </div>
                </button>

                {form.structure === "ai" && (
                  <div className="px-4 pb-4 space-y-3">
                    {!process.env.NEXT_PUBLIC_HAS_AI && (
                      <p className="text-xs text-amber-400 bg-amber-900/20 p-2 rounded-lg border border-amber-800">
                        Configura <code className="font-mono">ANTHROPIC_API_KEY</code> nel .env.local per usare l&apos;AI.
                      </p>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Pubblico target</label>
                      <input
                        type="text"
                        value={form.ai_audience}
                        onChange={(e) => update({ ai_audience: e.target.value })}
                        placeholder="Es. Manager di PMI con 3+ anni di esperienza"
                        aria-label="Pubblico target"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        Numero moduli: <span className="text-purple-400">{form.ai_num_modules}</span>
                      </label>
                      <input
                        type="range" min={3} max={8} value={form.ai_num_modules}
                        onChange={(e) => update({ ai_num_modules: Number(e.target.value) })}
                        className="w-full accent-purple-600"
                        aria-label="Numero moduli"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-0.5">
                        <span>3</span><span>8</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateOutline}
                      disabled={generatingOutline}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                      {generatingOutline ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> L&apos;AI sta costruendo il tuo corso...</>
                      ) : (
                        <><Sparkles className="w-4 h-4" /> {outline ? "Rigenera struttura" : "Genera struttura"}</>
                      )}
                    </button>

                    {/* Outline preview */}
                    {outline && (
                      <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl space-y-2">
                        <p className="text-xs font-semibold text-green-400 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" /> {outline.modules.length} moduli generati
                        </p>
                        {outline.modules.map((m, i) => (
                          <div key={i} className="text-xs">
                            <p className="font-medium text-slate-200">M{i + 1}: {m.title}</p>
                            <p className="text-slate-500 ml-3">{m.lessons.length} lezioni</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-900/20 p-3 rounded-xl border border-red-800">
                  {error}
                </p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              variant="ghost"
              onClick={() => step > 1 ? setStep((s) => (s - 1) as Step) : router.back()}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              {step === 1 ? "Annulla" : "Indietro"}
            </Button>

            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => (s + 1) as Step)}
                disabled={step === 1 ? !canNext1 : !canNext2}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Continua
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                loading={isPending}
                disabled={!canSubmit || isPending}
                icon={isPending ? undefined : <Check className="w-4 h-4" />}
              >
                Crea corso
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
