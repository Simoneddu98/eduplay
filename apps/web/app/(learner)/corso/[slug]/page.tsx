import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  BookOpen, Clock, ChevronRight, CheckCircle2,
  Lock, PlayCircle, Zap, Video, ClipboardList,
  FileText, Award, Users, BarChart2, ArrowLeft, Target,
} from "lucide-react";

/**
 * /corso/[slug] — Learner view pubblica.
 * Lo "slug" è l'ID del corso (UUID). In futuro può essere sostituito
 * da uno slug testuale aggiungendo una colonna slug alla tabella courses.
 */

interface Props {
  params: Promise<{ slug: string }>;
}

const LESSON_TYPE_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  video:       { icon: Video,         label: "Video",  color: "bg-blue-100 text-blue-600" },
  quiz:        { icon: ClipboardList, label: "Quiz",   color: "bg-purple-100 text-purple-600" },
  text:        { icon: FileText,      label: "Testo",  color: "bg-slate-100 text-slate-600" },
  interactive: { icon: Zap,           label: "Live",   color: "bg-amber-100 text-amber-600" },
};

const LEVEL_LABELS: Record<string, string> = {
  base: "Base", intermediate: "Intermedio", advanced: "Avanzato",
};
const LEVEL_COLORS: Record<string, string> = {
  base: "bg-green-100 text-green-700",
  intermediate: "bg-amber-100 text-amber-700",
  advanced: "bg-red-100 text-red-700",
};

export default async function LearnerCoursePage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch course by ID. The slug parameter contains the course UUID.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: course } = await (supabase as any)
    .from("courses")
    .select("*")
    .eq("id", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!course) notFound();

  // Parallel data fetches
  const [
    { data: lessons },
    { data: enrollment },
    { data: completions },
    { count: enrollCount },
  ] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, title, description, content_type, order_index, xp_reward, duration_minutes, is_published")
      .eq("course_id", course.id)
      .eq("is_published", true)
      .order("order_index"),
    supabase
      .from("enrollments")
      .select("*")
      .eq("course_id", course.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("lesson_completions")
      .select("lesson_id")
      .eq("user_id", user.id),
    supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("course_id", course.id),
  ]);

  const completedSet = new Set((completions ?? []).map((c) => c.lesson_id));
  const isEnrolled = !!enrollment;
  const totalLessons = (lessons ?? []).length;
  const completedCount = (lessons ?? []).filter((l) => completedSet.has(l.id)).length;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const nextLesson = (lessons ?? []).find((l) => !completedSet.has(l.id));
  const totalMinutes = (lessons ?? []).reduce((s, l) => s + (l.duration_minutes ?? 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky nav */}
      <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-2 text-sm text-slate-500">
          <Link href="/courses" className="hover:text-blue-600 transition-colors flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Tutti i corsi
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 font-medium truncate">{course.title}</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Main column ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Hero */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {course.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={course.cover_url}
                  alt={`Copertina: ${course.title}`}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {course.category && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {course.category}
                    </span>
                  )}
                  {course.level && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${LEVEL_COLORS[course.level] ?? "bg-slate-100 text-slate-600"} border-transparent`}>
                      {LEVEL_LABELS[course.level] ?? course.level}
                    </span>
                  )}
                  {course.xp_reward && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                      <Zap className="w-3 h-3" />+{course.xp_reward} XP
                    </span>
                  )}
                </div>

                <h1 className="text-2xl font-bold text-slate-900 mb-2">{course.title}</h1>
                {course.description && (
                  <p className="text-slate-600 leading-relaxed">{course.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-5 mt-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    {totalLessons} lezioni
                  </span>
                  {totalMinutes > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {totalMinutes >= 60
                        ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}min`
                        : `${totalMinutes} min`}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {enrollCount ?? 0} iscritti
                  </span>
                  {course.certificate_on_completion && (
                    <span className="flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-500" />
                      Certificato
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Learning objectives */}
            {Array.isArray(course.learning_objectives) && course.learning_objectives.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-600" />
                  Cosa imparerai
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(course.learning_objectives as string[]).map((obj, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {obj}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Lessons */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                Programma del corso
              </h2>

              {totalLessons === 0 ? (
                <p className="text-slate-400 text-sm py-4">Nessuna lezione disponibile.</p>
              ) : (
                <ol className="space-y-1.5">
                  {(lessons ?? []).map((lesson, idx) => {
                    const isCompleted = completedSet.has(lesson.id);
                    const isLocked = !isEnrolled && idx > 0;
                    const href = isLocked
                      ? "#"
                      : `/courses/${course.id}/lessons/${lesson.id}`;
                    const meta = LESSON_TYPE_META[lesson.content_type] ?? LESSON_TYPE_META.text;
                    const MetaIcon = meta.icon;

                    return (
                      <li key={lesson.id}>
                        <Link
                          href={href}
                          aria-disabled={isLocked}
                          onClick={isLocked ? (e) => e.preventDefault() : undefined}
                          className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all duration-150 ${
                            isLocked
                              ? "opacity-50 cursor-not-allowed border-transparent"
                              : isCompleted
                                ? "bg-green-50 border-green-100 hover:bg-green-100"
                                : "border-transparent hover:bg-slate-50 hover:border-slate-200"
                          }`}
                        >
                          {/* Status dot */}
                          <div className="flex-shrink-0">
                            {isCompleted ? (
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              </div>
                            ) : isLocked ? (
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                <Lock className="w-4 h-4 text-slate-300" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                                <PlayCircle className="w-4 h-4 text-blue-600" />
                              </div>
                            )}
                          </div>

                          {/* Title + description */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 font-mono w-5">
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              <span className={`text-sm font-medium truncate ${
                                isCompleted ? "text-green-700" : "text-slate-800"
                              }`}>
                                {lesson.title}
                              </span>
                            </div>
                            {lesson.description && (
                              <p className="text-xs text-slate-400 mt-0.5 ml-7 truncate">
                                {lesson.description}
                              </p>
                            )}
                          </div>

                          {/* Meta */}
                          <div className="flex-shrink-0 flex items-center gap-2">
                            <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
                              <MetaIcon className="w-3 h-3" />
                              {meta.label}
                            </span>
                            {lesson.xp_reward && (
                              <span className="flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                                <Zap className="w-3 h-3" />{lesson.xp_reward}
                              </span>
                            )}
                            {lesson.duration_minutes && (
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />{lesson.duration_minutes}m
                              </span>
                            )}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sticky top-24">
              {isEnrolled ? (
                /* Progress card */
                <>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-slate-900">Il tuo progresso</h3>
                    <span className="text-sm font-bold text-blue-700">{progressPct}%</span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  <p className="text-xs text-slate-500 mb-5">
                    {completedCount} di {totalLessons} lezioni completate
                  </p>

                  {nextLesson ? (
                    <Link
                      href={`/courses/${course.id}/lessons/${nextLesson.id}`}
                      className="block w-full text-center py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      {completedCount === 0 ? "Inizia ora" : "Continua"}
                    </Link>
                  ) : (
                    <div className="text-center py-3">
                      <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-green-700">Corso completato!</p>
                      {course.certificate_on_completion && (
                        <p className="text-xs text-slate-500 mt-1">Controlla i tuoi certificati nel profilo.</p>
                      )}
                    </div>
                  )}

                  {enrollment?.enrolled_at && (
                    <p className="text-xs text-slate-400 text-center mt-3">
                      Iscritto il {new Date(enrollment.enrolled_at).toLocaleDateString("it-IT")}
                    </p>
                  )}

                  {/* Stats mini */}
                  <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <p className="text-xl font-bold text-slate-900">{completedCount}</p>
                      <p className="text-xs text-slate-500">completate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-slate-900">{totalLessons - completedCount}</p>
                      <p className="text-xs text-slate-500">rimanenti</p>
                    </div>
                  </div>
                </>
              ) : (
                /* Enroll card */
                <>
                  <div className="text-center mb-5">
                    {course.coin_reward && course.coin_reward > 0 ? (
                      <div className="flex items-center justify-center gap-2">
                        <p className="text-3xl font-bold text-slate-900">Gratuito</p>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold text-green-600">Gratuito</p>
                    )}
                  </div>

                  <form action={`/api/courses/${course.id}/enroll`} method="POST">
                    <button
                      type="submit"
                      className="w-full py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      Iscriviti al corso
                    </button>
                  </form>

                  <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Accesso illimitato
                    </li>
                    <li className="flex items-center gap-2.5">
                      <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      {totalLessons} lezioni
                    </li>
                    {course.xp_reward && (
                      <li className="flex items-center gap-2.5">
                        <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        Guadagna {course.xp_reward} XP
                      </li>
                    )}
                    {course.certificate_on_completion && (
                      <li className="flex items-center gap-2.5">
                        <Award className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        Certificato al completamento
                      </li>
                    )}
                  </ul>

                  {totalLessons > 0 && (
                    <div className="mt-5 pt-4 border-t border-slate-100">
                      <p className="text-xs text-slate-400 mb-2 font-medium">Anteprima gratuita:</p>
                      <Link
                        href={`/courses/${course.id}/lessons/${(lessons ?? [])[0]?.id}`}
                        className="flex items-center justify-center gap-1.5 w-full py-2 border border-blue-200 text-blue-600 text-sm font-medium rounded-xl hover:bg-blue-50 transition-colors"
                      >
                        <PlayCircle className="w-4 h-4" />
                        Prima lezione gratis
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Course info widget */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5" />
                Dettagli corso
              </h3>
              <dl className="space-y-2.5 text-sm">
                {course.level && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Livello</dt>
                    <dd className="font-medium text-slate-800">{LEVEL_LABELS[course.level] ?? course.level}</dd>
                  </div>
                )}
                {totalMinutes > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Durata</dt>
                    <dd className="font-medium text-slate-800">
                      {totalMinutes >= 60
                        ? `~${Math.floor(totalMinutes / 60)}h`
                        : `~${totalMinutes}min`}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-slate-500">Lezioni</dt>
                  <dd className="font-medium text-slate-800">{totalLessons}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Iscritti</dt>
                  <dd className="font-medium text-slate-800">{enrollCount ?? 0}</dd>
                </div>
                {course.passing_score && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Soglia superamento</dt>
                    <dd className="font-medium text-slate-800">{course.passing_score}%</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("title, description")
    .eq("id", slug)
    .eq("is_published", true)
    .maybeSingle();

  return {
    title: course?.title ?? "Corso",
    description: course?.description ?? undefined,
  };
}
