"use client";

/**
 * CourseWizard — 4-step guided course creation flow.
 *
 * Steps:
 * 1. Info    — title, category, level (quick wins)
 * 2. AI      — let AI generate the outline (wow moment)
 * 3. Review  — confirm/edit the outline
 * 4. Ready   — course created, enter editor
 *
 * The AI step is optional — trainer can skip and build manually.
 * This respects both the "expert who knows what they want" and
 * "first-timer who needs a starting point" personas.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  BookOpen,
  Target,
  Loader2,
  Check,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import { createCourse } from "../hooks/useCourse";
import type { CourseWizardData, AIOutline, AIOutlineModule } from "../types";
import { CategoryInput } from "@/components/ui/CategoryInput";

type WizardStep = "info" | "ai" | "outline" | "ready";

const STEPS: Array<{ id: WizardStep; label: string; icon: React.ElementType }> = [
  { id: "info", label: "Informazioni base", icon: BookOpen },
  { id: "ai", label: "Assistente AI", icon: Sparkles },
  { id: "outline", label: "Struttura corso", icon: Target },
  { id: "ready", label: "Pronto!", icon: Check },
];

// Categories are now free-form via CategoryInput — no hardcoded list

const LEVEL_OPTIONS = [
  { value: "base", label: "Base", desc: "Per chi inizia da zero" },
  { value: "intermediate", label: "Intermedio", desc: "Con qualche esperienza" },
  { value: "advanced", label: "Avanzato", desc: "Per professionisti" },
];

interface CourseWizardProps {
  userId: string;
  onClose: () => void;
}

export function CourseWizard({ userId, onClose }: CourseWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("info");
  const [data, setData] = useState<CourseWizardData>({
    title: "",
    description: "",
    category: "" as CourseWizardData["category"],
    level: "base" as CourseWizardData["level"],
    cover_url: "",
    learning_objectives: [],
    ai_topic: "",
    ai_audience: "",
    ai_duration_hours: 2,
  });
  const [outline, setOutline] = useState<AIOutline | null>(null);
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [outlineError, setOutlineError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);

  const update = (partial: Partial<CourseWizardData>) =>
    setData((prev) => ({ ...prev, ...partial }));

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const canProceedInfo = data.title.trim().length >= 3;

  // ─── Generate AI outline ─────────────────────────────────────
  const generateOutline = useCallback(async () => {
    if (!data.ai_topic && !data.title) return;
    setGeneratingOutline(true);
    setOutlineError(null);

    try {
      const res = await fetch("/api/ai/course-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: data.ai_topic || data.title,
          audience: data.ai_audience,
          duration_hours: data.ai_duration_hours,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setOutline(json.outline);
      setStep("outline");
    } catch (err) {
      setOutlineError(err instanceof Error ? err.message : "Errore generazione");
    } finally {
      setGeneratingOutline(false);
    }
  }, [data]);

  // ─── Create course and enter editor ─────────────────────────
  const handleCreate = useCallback(async () => {
    setCreating(true);

    const objectives = outline?.learning_objectives ??
      data.learning_objectives.filter(Boolean);

    const { data: course, error } = await createCourse({
      title: data.title || outline?.course_title || "Nuovo corso",
      description: data.description || outline?.course_description || "",
      category: data.category,
      level: data.level,
      learning_objectives: objectives,
      created_by: userId,
    });

    setCreating(false);

    if (!error && course) {
      setCreatedCourseId(course.id);
      setStep("ready");
    }
  }, [data, outline, userId]);

  const handleEnterEditor = () => {
    if (createdCourseId) {
      router.push(`/crea-corso/${createdCourseId}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Crea nuovo corso</h2>
            <p className="text-sm text-gray-500">
              Passo {stepIndex + 1} di {STEPS.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Chiudi wizard"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex px-6 py-3 gap-1 border-b border-gray-100">
          {STEPS.map((s, i) => {
            const StepIcon = s.icon;
            const isActive = s.id === step;
            const isDone = i < stepIndex;
            return (
              <div key={s.id} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                  isActive ? "bg-purple-100 text-purple-700" :
                  isDone ? "bg-green-100 text-green-700" :
                  "text-gray-400"
                }`}>
                  {isDone ? <Check className="w-3.5 h-3.5" /> : <StepIcon className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px flex-1 mx-1 ${i < stepIndex ? "bg-green-200" : "bg-gray-100"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: Info */}
          {step === "info" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-gray-800 mb-1">
                  Come si chiama il tuo corso?
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Scegli un titolo chiaro e coinvolgente. Potrai modificarlo in seguito.
                </p>
                <input
                  type="text"
                  autoFocus
                  value={data.title}
                  onChange={(e) => update({ title: e.target.value, ai_topic: e.target.value })}
                  placeholder="Es. Email Marketing per il tuo e-commerce"
                  aria-label="Titolo del corso"
                  className="w-full px-4 py-3 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
                  onKeyDown={(e) => e.key === "Enter" && canProceedInfo && setStep("ai")}
                />
                {data.title.length > 0 && data.title.length < 3 && (
                  <p className="text-xs text-amber-600 mt-1">Il titolo deve avere almeno 3 caratteri</p>
                )}
              </div>

              <CategoryInput
                label="Categoria"
                value={data.category ?? ""}
                onChange={(v) => update({ category: v as CourseWizardData["category"] })}
                placeholder="Es. Marketing, Leadership, Python..."
              />

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Livello di difficoltà
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {LEVEL_OPTIONS.map((lv) => (
                    <button
                      key={lv.value}
                      onClick={() => update({ level: lv.value as CourseWizardData["level"] })}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        data.level === lv.value
                          ? "border-purple-400 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-800">{lv.label}</p>
                      <p className="text-xs text-gray-500">{lv.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: AI */}
          {step === "ai" && (
            <div className="space-y-5">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-base font-semibold text-gray-800 mb-1">
                  Vuoi che l&apos;AI crei la struttura del corso?
                </h3>
                <p className="text-sm text-gray-500">
                  In 10 secondi generiamo moduli, lezioni e obiettivi di apprendimento.
                  Potrai modificare tutto.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Argomento specifico (opzionale)
                  </label>
                  <input
                    type="text"
                    value={data.ai_topic}
                    onChange={(e) => update({ ai_topic: e.target.value })}
                    placeholder={data.title || "Descrivi il contenuto del corso..."}
                    aria-label="Argomento del corso per AI"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    A chi è rivolto il corso?
                  </label>
                  <input
                    type="text"
                    value={data.ai_audience}
                    onChange={(e) => update({ ai_audience: e.target.value })}
                    placeholder="Es. Responsabili marketing di PMI con 2+ anni di esperienza"
                    aria-label="Pubblico target"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Durata: {data.ai_duration_hours}h
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={data.ai_duration_hours}
                    onChange={(e) => update({ ai_duration_hours: Number(e.target.value) })}
                    className="w-full accent-purple-600"
                    aria-label="Durata corso"
                  />
                </div>
              </div>

              {outlineError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {outlineError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={generateOutline}
                  disabled={generatingOutline}
                  className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {generatingOutline ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generazione...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Genera struttura</>
                  )}
                </button>
                <button
                  onClick={() => setStep("outline")}
                  className="flex items-center justify-center gap-2 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all"
                >
                  Salta — creo io la struttura
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Outline review */}
          {step === "outline" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-800 mb-1">
                  {outline ? "Struttura generata dall'AI" : "Struttura del corso"}
                </h3>
                <p className="text-sm text-gray-500">
                  {outline
                    ? "Rivedi e conferma. Potrai modificare tutto nell'editor."
                    : "Inizia con un corso vuoto e aggiungi le lezioni nell'editor."}
                </p>
              </div>

              {outline ? (
                <OutlineReview outline={outline} onChange={setOutline} />
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    Creerai un corso vuoto e aggiungerai i contenuti nell&apos;editor.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Ready */}
          {step === "ready" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Corso creato!</h3>
              <p className="text-sm text-gray-500 mb-6">
                Il tuo corso è stato salvato come bozza. Ora puoi iniziare ad
                aggiungere contenuti.
              </p>
              <div className="bg-purple-50 rounded-xl p-4 text-left space-y-2 mb-6">
                <p className="text-xs font-semibold text-purple-700">Prossimi passi:</p>
                <div className="space-y-1">
                  {["Aggiungi lezioni e contenuti", "Inserisci quiz e verifiche", "Pubblica quando sei pronto"].map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-purple-800">
                      <div className="w-5 h-5 bg-purple-200 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                        {i + 1}
                      </div>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100">
          <button
            onClick={() => {
              if (stepIndex === 0) onClose();
              else setStep(STEPS[stepIndex - 1].id);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {stepIndex === 0 ? "Annulla" : "Indietro"}
          </button>

          {step === "info" && (
            <button
              onClick={() => setStep("ai")}
              disabled={!canProceedInfo}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-all"
            >
              Continua <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === "outline" && (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-all"
            >
              {creating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creazione...</>
              ) : (
                <>Crea corso <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          )}

          {step === "ready" && (
            <button
              onClick={handleEnterEditor}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-sm"
            >
              Entra nell&apos;editor <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Outline review sub-component ───────────────────────────

function OutlineReview({
  outline,
  onChange,
}: {
  outline: AIOutline;
  onChange: (o: AIOutline) => void;
}) {
  const updateModuleTitle = (idx: number, title: string) => {
    onChange({
      ...outline,
      modules: outline.modules.map((m, i) => (i === idx ? { ...m, title } : m)),
    });
  };

  const addModule = () => {
    onChange({
      ...outline,
      modules: [
        ...outline.modules,
        { title: "Nuovo modulo", description: "", lessons: [] },
      ],
    });
  };

  const removeModule = (idx: number) => {
    onChange({
      ...outline,
      modules: outline.modules.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="space-y-3">
      {/* Course title & description */}
      <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
        <p className="text-xs font-semibold text-purple-700 mb-1">Titolo corso</p>
        <p className="text-sm font-bold text-gray-900">{outline.course_title}</p>
        <p className="text-xs text-gray-600 mt-1">{outline.course_description}</p>
      </div>

      {/* Objectives */}
      <div className="p-3 bg-gray-50 rounded-xl">
        <p className="text-xs font-semibold text-gray-600 mb-2">Obiettivi di apprendimento</p>
        <ul className="space-y-1">
          {outline.learning_objectives.slice(0, 4).map((obj, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
              <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
              {obj}
            </li>
          ))}
        </ul>
      </div>

      {/* Modules */}
      <div className="space-y-2">
        {outline.modules.map((mod, modIdx) => (
          <div key={modIdx} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 p-3 bg-gray-50">
              <span className="text-xs font-semibold text-purple-600 w-5 text-center">
                M{modIdx + 1}
              </span>
              <input
                type="text"
                value={mod.title}
                onChange={(e) => updateModuleTitle(modIdx, e.target.value)}
                className="flex-1 text-sm font-medium text-gray-800 bg-transparent border-none outline-none focus:bg-white focus:border-b focus:border-purple-300 rounded px-1"
                aria-label={`Titolo modulo ${modIdx + 1}`}
              />
              <button
                onClick={() => removeModule(modIdx)}
                className="p-1 hover:text-red-500 text-gray-400"
                aria-label={`Rimuovi modulo ${modIdx + 1}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="px-4 py-2 space-y-1">
              {mod.lessons.map((les, lesIdx) => (
                <div key={lesIdx} className="flex items-center gap-2 text-xs text-gray-600 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                  <span className="flex-1">{les.title}</span>
                  <span className="text-gray-400">{les.duration_minutes}min</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={addModule}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-gray-500 border border-dashed border-gray-200 rounded-xl hover:border-purple-300 hover:text-purple-600 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Aggiungi modulo
        </button>
      </div>
    </div>
  );
}
