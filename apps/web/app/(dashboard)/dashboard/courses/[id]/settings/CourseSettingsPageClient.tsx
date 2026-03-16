"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  BarChart2,
  Globe,
  Lock,
  Award,
  Clock,
  Target,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Upload,
  Zap,
  CircleDollarSign,
  Image as ImageIcon,
  Settings2,
  Flame,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CategoryInput } from "@/components/ui/CategoryInput";
import {
  updateCourseAction,
  publishCourseAction,
  unpublishCourseAction,
  deleteCourseAction,
} from "@/lib/actions/courses";

interface CourseData {
  id: string;
  title: string;
  description: string | null;
  category: string;
  level: string;
  status: "draft" | "published";
  is_published: boolean;
  cover_url: string | null;
  xp_reward: number;
  coin_reward: number;
  passing_score: number;
  certificate_on_completion: boolean;
  estimated_duration_minutes: number | null;
  learning_objectives: string[];
  lessons_count: number;
}

interface Props {
  course: CourseData;
  editorHref: string;
  analyticsHref: string;
}

// No hardcoded category list — CategoryInput fetches from DB

const LEVEL_OPTIONS = [
  { value: "base", label: "Base" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzato" },
];

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
        <Icon className="w-4 h-4 text-purple-700" />
      </div>
      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{label}</h2>
    </div>
  );
}

function SaveStatus({ saving, saved, error }: { saving: boolean; saved: boolean; error: string | null }) {
  if (error) return (
    <div className="flex items-center gap-1.5 text-xs text-red-600">
      <AlertCircle className="w-3.5 h-3.5" />
      {error}
    </div>
  );
  if (saving) return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400">
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
      Salvataggio...
    </div>
  );
  if (saved) return (
    <div className="flex items-center gap-1.5 text-xs text-green-600">
      <CheckCircle className="w-3.5 h-3.5" />
      Salvato
    </div>
  );
  return null;
}

export function CourseSettingsPageClient({ course, editorHref, analyticsHref }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    title: course.title,
    description: course.description ?? "",
    category: course.category,
    level: course.level,
    xp_reward: course.xp_reward,
    coin_reward: course.coin_reward,
    passing_score: course.passing_score,
    certificate_on_completion: course.certificate_on_completion,
    estimated_duration_minutes: course.estimated_duration_minutes ?? 0,
  });
  const [objectives, setObjectives] = useState<string[]>(
    course.learning_objectives?.length > 0 ? course.learning_objectives : [""]
  );
  const [coverUrl, setCoverUrl] = useState<string | null>(course.cover_url);
  const [coverUploading, setCoverUploading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const isPublished = course.status === "published";

  // ─── Cover upload ─────────────────────────────────────────────

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setSaveError("L'immagine non può superare i 5 MB");
      return;
    }

    setCoverUploading(true);
    const ext = file.name.split(".").pop();
    const path = `covers/${course.id}/cover_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("course-assets")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setSaveError(uploadError.message);
      setCoverUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("course-assets")
      .getPublicUrl(path);

    setCoverUrl(publicUrl);
    await updateCourseAction(course.id, { cover_url: publicUrl });
    setCoverUploading(false);
  }

  // ─── Save ─────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const result = await updateCourseAction(course.id, {
      ...form,
      learning_objectives: objectives.filter(Boolean),
      cover_url: coverUrl ?? undefined,
    });
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  // ─── Publish / Unpublish ──────────────────────────────────────

  async function handlePublish() {
    setPublishLoading(true);
    setPublishError(null);
    const result = isPublished
      ? await unpublishCourseAction(course.id)
      : await publishCourseAction(course.id);
    setPublishLoading(false);
    if (!result.ok) {
      setPublishError(result.error);
    } else {
      router.refresh();
    }
  }

  // ─── Delete ───────────────────────────────────────────────────

  function handleDelete() {
    if (deleteConfirm !== course.title) return;
    startTransition(async () => {
      const result = await deleteCourseAction(course.id);
      if (result.ok) {
        router.push("/dashboard/courses");
      }
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <Link
          href={editorHref}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
          aria-label="Torna all'editor"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-gray-900 truncate">
            {form.title}
          </h1>
          <p className="text-xs text-gray-400">Impostazioni corso</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={analyticsHref}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Analitiche
          </Link>
          <Link
            href={editorHref}
            className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Editor
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-8 px-4 space-y-8">

        {/* Publish status banner */}
        <div className={`rounded-2xl px-5 py-4 flex items-center gap-4 ${
          isPublished
            ? "bg-green-50 border border-green-200"
            : "bg-amber-50 border border-amber-200"
        }`}>
          {isPublished ? (
            <Globe className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${isPublished ? "text-green-900" : "text-amber-900"}`}>
              {isPublished ? "Pubblicato" : "Bozza"}
            </p>
            <p className={`text-xs ${isPublished ? "text-green-700" : "text-amber-700"}`}>
              {isPublished
                ? "Il corso è visibile a tutti i corsisti iscritti."
                : `Hai ${course.lessons_count} lezione/i. Pubblica quando sei pronto.`}
            </p>
          </div>
          <button
            onClick={handlePublish}
            disabled={publishLoading}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all disabled:opacity-50 ${
              isPublished
                ? "bg-white border border-amber-300 text-amber-700 hover:bg-amber-50"
                : "bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
            }`}
          >
            {publishLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isPublished ? "Riporta in bozza" : "Pubblica"}
          </button>
        </div>
        {publishError && (
          <p className="text-xs text-red-600 -mt-4 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {publishError}
          </p>
        )}

        {/* Cover image */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <SectionTitle icon={ImageIcon} label="Immagine di copertina" />
          <div className="flex items-start gap-5">
            <div
              className="w-36 h-24 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden flex-shrink-0 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-purple-300 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Carica immagine copertina"
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            >
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt="Copertina corso" className="w-full h-full object-cover" />
              ) : coverUploading ? (
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              ) : (
                <div className="text-center">
                  <Upload className="w-5 h-5 text-gray-300 mx-auto mb-1" />
                  <p className="text-[10px] text-gray-400">Carica</p>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-700 font-medium mb-1">
                {coverUrl ? "Cambia copertina" : "Carica una copertina"}
              </p>
              <p className="text-xs text-gray-400 mb-3">
                JPG, PNG o WebP. Max 5 MB. Consigliato: 1280×720px.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={coverUploading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                {coverUploading ? "Caricamento..." : "Scegli file"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverUpload}
                aria-label="Input file copertina"
              />
            </div>
          </div>
        </section>

        {/* General info */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <SectionTitle icon={Settings2} label="Informazioni generali" />

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="settings-title">
              Titolo *
            </label>
            <input
              id="settings-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
              aria-required="true"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="settings-desc">
              Descrizione
            </label>
            <textarea
              id="settings-desc"
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CategoryInput
              label="Categoria"
              value={form.category}
              onChange={(v) => setForm((f) => ({ ...f, category: v }))}
            />
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="settings-level">
                Livello
              </label>
              <select
                id="settings-level"
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                {LEVEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="settings-duration">
              <Clock className="w-3.5 h-3.5 inline mr-1" />
              Durata stimata (minuti)
            </label>
            <input
              id="settings-duration"
              type="number"
              min={0}
              step={5}
              value={form.estimated_duration_minutes}
              onChange={(e) => setForm((f) => ({ ...f, estimated_duration_minutes: Number(e.target.value) }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
        </section>

        {/* Learning objectives */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <SectionTitle icon={Target} label="Obiettivi di apprendimento" />
          <div className="space-y-2">
            {objectives.map((obj, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={obj}
                  onChange={(e) => setObjectives((prev) =>
                    prev.map((o, i) => (i === idx ? e.target.value : o))
                  )}
                  placeholder={`Obiettivo ${idx + 1}...`}
                  aria-label={`Obiettivo di apprendimento ${idx + 1}`}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <button
                  onClick={() => setObjectives((prev) => prev.filter((_, i) => i !== idx))}
                  disabled={objectives.length === 1}
                  className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                  aria-label={`Rimuovi obiettivo ${idx + 1}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setObjectives((prev) => [...prev, ""])}
              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium mt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Aggiungi obiettivo
            </button>
          </div>
        </section>

        {/* Gamification */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <SectionTitle icon={Flame} label="Gamification" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="settings-xp">
                <Zap className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                XP reward
              </label>
              <input
                id="settings-xp"
                type="number"
                min={0}
                step={10}
                value={form.xp_reward}
                onChange={(e) => setForm((f) => ({ ...f, xp_reward: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <p className="text-[10px] text-gray-400 mt-1">XP dati al completamento del corso</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="settings-coins">
                <CircleDollarSign className="w-3.5 h-3.5 inline mr-1 text-yellow-500" />
                EduCoins reward
              </label>
              <input
                id="settings-coins"
                type="number"
                min={0}
                step={5}
                value={form.coin_reward}
                onChange={(e) => setForm((f) => ({ ...f, coin_reward: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <p className="text-[10px] text-gray-400 mt-1">Monete date al completamento del corso</p>
            </div>
          </div>
        </section>

        {/* Assessment */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <SectionTitle icon={Award} label="Valutazione & Certificato" />

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Soglia di superamento: <span className="text-purple-700 font-bold">{form.passing_score}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={form.passing_score}
              onChange={(e) => setForm((f) => ({ ...f, passing_score: Number(e.target.value) }))}
              className="w-full accent-purple-600"
              aria-label="Soglia di superamento quiz"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={form.certificate_on_completion}
              onChange={(e) => setForm((f) => ({ ...f, certificate_on_completion: e.target.checked }))}
              className="w-4 h-4 accent-purple-600 mt-0.5"
              aria-label="Certificato al completamento"
            />
            <div>
              <p className="text-sm font-medium text-gray-800">Certificato al completamento</p>
              <p className="text-xs text-gray-500 mt-0.5">
                I corsisti che superano la soglia ricevono un certificato PDF personalizzato.
              </p>
            </div>
          </label>
        </section>

        {/* Save button */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-4">
          <SaveStatus saving={saving} saved={saved} error={saveError} />
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 shadow-sm ml-auto"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Salva modifiche
          </button>
        </div>

        {/* Danger zone */}
        {course.status === "draft" && (
          <section className="bg-white rounded-2xl border border-red-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-red-700" />
              </div>
              <h2 className="text-sm font-bold text-red-900 uppercase tracking-wide">Zona pericolo</h2>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Elimina definitivamente questo corso. Questa azione è{" "}
              <strong>irreversibile</strong>. Solo i corsi in bozza possono essere eliminati.
            </p>

            <div className="space-y-3 p-4 bg-red-50 rounded-xl border border-red-100">
              <p className="text-xs text-red-700 font-medium">
                Per confermare, scrivi il titolo del corso:{" "}
                <span className="font-bold">{course.title}</span>
              </p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={course.title}
                aria-label="Conferma eliminazione corso"
                className="w-full px-3 py-2 text-sm border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
              />
              <button
                onClick={handleDelete}
                disabled={deleteConfirm !== course.title || isPending}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Elimina corso
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
