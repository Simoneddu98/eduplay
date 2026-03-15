"use client";

/**
 * /dashboard/courses/new — Wizard 3 step per creare un corso.
 *
 * Step 1: Titolo, descrizione, categoria, livello
 * Step 2: Obiettivi formativi + durata
 * Step 3: Scegli struttura (vuoto / AI)
 *
 * Al submit: Server Action → crea corso → redirect all'editor.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Sparkles, BookOpen,
  Target, Plus, Trash2, Loader2, Check,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { createCourseAction } from "@/lib/actions/courses";
import { generateCourseOutlineAction } from "@/lib/actions/ai";
import type { AIOutline } from "@/features/course-creator/types";

type Step = 1 | 2 | 3;

interface FormData {
  title: string;
  description: string;
  category: string;
  level: string;
  objectives: string[];
  duration_hours: number;
  ai_audience: string;
  structure: "empty" | "ai";
}

const CATEGORIES = [
  { value: "digital-marketing", label: "Digital Marketing", emoji: "📣" },
  { value: "ai",               label: "Intelligenza Artificiale", emoji: "🤖" },
  { value: "sales",            label: "Vendite", emoji: "💼" },
];

const LEVELS = [
  { value: "base",         label: "Base",        desc: "Per chi inizia" },
  { value: "intermediate", label: "Intermedio",   desc: "Con esperienza" },
  { value: "advanced",     label: "Avanzato",     desc: "Professionisti" },
];

export default function NewCoursePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [isPending, startTransition] = useTransition();
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [outline, setOutline] = useState<AIOutline | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    title: "",
    description: "",
    category: "digital-marketing",
    level: "base",
    objectives: [""],
    duration_hours: 2,
    ai_audience: "",
    structure: "empty",
  });

  const update = (partial: Partial<FormData>) => setForm((p) => ({ ...p, ...partial }));

  const canNext1 = form.title.trim().length >= 3;
  const canNext2 = form.objectives.some((o) => o.trim().length > 0);

  const handleGenerateOutline = async () => {
    setGeneratingOutline(true);
    setError(null);
    const result = await generateCourseOutlineAction({
      topic: form.title,
      audience: form.ai_audience,
      duration_hours: form.duration_hours,
    });
    setGeneratingOutline(false);
    if (result.ok) {
      setOutline(result.data);
      // Merge AI objectives into form
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
        <div className="w-full max-w-lg">

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Informazioni base</h2>
                <p className="text-slate-400 text-sm">Dai un nome al tuo corso e scegli la categoria.</p>
              </div>

              <Input
                label="Titolo del corso *"
                value={form.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Es. Email Marketing per e-commerce"
                autoFocus
              />

              <Textarea
                label="Descrizione (opzionale)"
                value={form.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="Breve descrizione del corso..."
                rows={3}
              />

              <div>
                <p className="text-xs font-semibold text-slate-300 mb-2">Categoria *</p>
                <div className="grid grid-cols-3 gap-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => update({ category: cat.value })}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        form.category === cat.value
                          ? "border-purple-500 bg-purple-900/30 text-purple-300"
                          : "border-slate-700 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      <span className="text-2xl">{cat.emoji}</span>
                      <span className="text-xs font-medium">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-300 mb-2">Livello *</p>
                <div className="grid grid-cols-3 gap-3">
                  {LEVELS.map((lv) => (
                    <button
                      key={lv.value}
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

          {/* STEP 2 */}
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
                      placeholder={`Obiettivo ${i + 1}... (usa verbi d'azione)`}
                      aria-label={`Obiettivo ${i + 1}`}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={() => update({ objectives: form.objectives.filter((_, idx) => idx !== i) })}
                      disabled={form.objectives.length === 1}
                      className="p-2 text-slate-500 hover:text-red-400 disabled:opacity-30"
                      aria-label="Rimuovi obiettivo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => update({ objectives: [...form.objectives, ""] })}
                  className="flex items-center gap-1.5 text-xs text-purple-400 hover:underline"
                >
                  <Plus className="w-3 h-3" /> Aggiungi obiettivo
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Durata stimata: {form.duration_hours}h
                </label>
                <input
                  type="range" min={1} max={20} value={form.duration_hours}
                  onChange={(e) => update({ duration_hours: Number(e.target.value) })}
                  className="w-full accent-purple-600"
                  aria-label="Durata corso"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1h</span><span>20h</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Struttura del corso</h2>
                <p className="text-slate-400 text-sm">Inizia da zero o lascia che l&apos;AI crei la struttura.</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* Empty option */}
                <button
                  onClick={() => update({ structure: "empty" })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    form.structure === "empty"
                      ? "border-purple-500 bg-purple-900/20"
                      : "border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-semibold text-white">Inizia da zero</p>
                      <p className="text-xs text-slate-400">Crea lezioni e moduli manualmente</p>
                    </div>
                  </div>
                </button>

                {/* AI option */}
                <button
                  onClick={() => update({ structure: "ai" })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    form.structure === "ai"
                      ? "border-purple-500 bg-purple-900/20"
                      : "border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-sm font-semibold text-white flex items-center gap-2">
                        Genera con AI
                        <span className="text-[10px] bg-purple-900/50 border border-purple-700 text-purple-300 px-1.5 py-0.5 rounded-full">Consigliato</span>
                      </p>
                      <p className="text-xs text-slate-400">Struttura completa in 10 secondi</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* AI config */}
              {form.structure === "ai" && (
                <div className="space-y-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <Input
                    label="Pubblico target"
                    value={form.ai_audience}
                    onChange={(e) => update({ ai_audience: e.target.value })}
                    placeholder="Es. Manager di PMI con 3+ anni di esperienza"
                  />
                  <Button
                    onClick={handleGenerateOutline}
                    loading={generatingOutline}
                    icon={<Sparkles className="w-4 h-4" />}
                    className="w-full"
                  >
                    {outline ? "Rigenera struttura" : "Genera struttura AI"}
                  </Button>
                </div>
              )}

              {/* Outline preview */}
              {outline && (
                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl space-y-3">
                  <p className="text-xs font-semibold text-green-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Struttura generata — {outline.modules.length} moduli
                  </p>
                  {outline.modules.slice(0, 3).map((m, i) => (
                    <div key={i} className="text-xs">
                      <p className="font-medium text-slate-200">Modulo {i + 1}: {m.title}</p>
                      <p className="text-slate-500 ml-3">{m.lessons.length} lezioni · {m.lessons.map(l => l.duration_minutes).reduce((a, b) => a + b, 0)} min</p>
                    </div>
                  ))}
                  {outline.modules.length > 3 && (
                    <p className="text-xs text-slate-500">+{outline.modules.length - 3} altri moduli...</p>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-red-400 bg-red-900/20 p-3 rounded-xl border border-red-800">{error}</p>}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pb-12">
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
                disabled={form.structure === "ai" && !outline && !isPending}
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
