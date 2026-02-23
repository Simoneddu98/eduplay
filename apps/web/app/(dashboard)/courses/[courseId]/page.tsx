import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  ChevronRight,
  CheckCircle2,
  Lock,
  PlayCircle,
  Zap,
  Video,
  ClipboardList,
  FileText,
} from "lucide-react";

const LEVEL_LABELS: Record<string, string> = {
  base: "Base",
  intermediate: "Intermedio",
  advanced: "Avanzato",
};

const LEVEL_COLORS: Record<string, string> = {
  base: "bg-green-100 text-green-700 border border-green-200",
  intermediate: "bg-amber-100 text-amber-700 border border-amber-200",
  advanced: "bg-red-100 text-red-700 border border-red-200",
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  programmazione: "from-blue-600 to-indigo-700",
  matematica: "from-purple-600 to-fuchsia-700",
  scienze: "from-emerald-600 to-teal-700",
  lingue: "from-orange-500 to-red-600",
  storia: "from-amber-600 to-yellow-700",
  default: "from-blue-600 to-indigo-700",
};

const LESSON_TYPE_ICONS: Record<string, { icon: any; label: string; color: string }> = {
  video: { icon: Video, label: "Video", color: "bg-blue-100 text-blue-600" },
  quiz: { icon: ClipboardList, label: "Quiz", color: "bg-purple-100 text-purple-600" },
  text: { icon: FileText, label: "Testo", color: "bg-slate-100 text-slate-600" },
};

export default async function CourseDetailPage({
  params,
}: {
  params: { courseId: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { courseId } = params;

  const [
    { data: course, error: courseError },
    { data: lessons },
    { data: enrollment },
    { data: completions },
  ] = await Promise.all([
    supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .eq("is_published", true)
      .single(),
    supabase
      .from("lessons")
      .select("*")
      .eq("course_id", courseId)
      .eq("is_published", true)
      .order("order_index"),
    supabase
      .from("enrollments")
      .select("*")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("lesson_completions")
      .select("*")
      .eq("user_id", user.id),
  ]);

  if (courseError || !course) notFound();

  const completedSet = new Set(
    (completions ?? []).map((c: any) => c.lesson_id)
  );
  const isEnrolled = !!enrollment;
  const completedCount = (lessons ?? []).filter((l: any) =>
    completedSet.has(l.id)
  ).length;
  const totalLessons = (lessons ?? []).length;
  const progressPct =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const nextLesson = (lessons ?? []).find(
    (l: any) => !completedSet.has(l.id)
  );

  const categoryGradient =
    CATEGORY_GRADIENTS[course.category?.toLowerCase()] ??
    CATEGORY_GRADIENTS.default;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <Link
          href="/courses"
          className="hover:text-blue-600 transition-colors cursor-pointer"
        >
          Corsi
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-700 font-medium">{course.title}</span>
      </nav>

      {/* Hero Header */}
      <div
        className={`bg-gradient-to-r ${categoryGradient} rounded-2xl p-6 md:p-8 mb-8 text-white relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {course.category && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 text-white uppercase tracking-wide">
                {course.category}
              </span>
            )}
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${
                LEVEL_COLORS[course.level] ?? "bg-white/20 text-white"
              }`}
            >
              {LEVEL_LABELS[course.level] ?? course.level}
            </span>
            {course.xp_reward && (
              <span className="badge-xp">
                <Zap className="w-3 h-3" />+{course.xp_reward} XP
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold font-poppins mb-2">
            {course.title}
          </h1>
          <p className="text-white/80 max-w-2xl leading-relaxed">
            {course.description}
          </p>

          <div className="flex flex-wrap items-center gap-5 mt-5 text-sm text-white/70">
            {course.duration_hours && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {course.duration_hours} ore
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              {totalLessons} lezioni
            </span>
            {course.lessons_count && (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {course.lessons_count} lezioni totali
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lessons list */}
          <div className="card p-6">
            <h2 className="text-lg font-bold font-poppins text-slate-900 mb-4">
              Programma del corso
            </h2>

            {(lessons ?? []).length === 0 ? (
              <p className="text-slate-400 text-sm py-4">
                Nessuna lezione disponibile.
              </p>
            ) : (
              <ol className="space-y-2">
                {(lessons ?? []).map((lesson: any, idx: number) => {
                  const isCompleted = completedSet.has(lesson.id);
                  const isLocked = !isEnrolled && idx > 0;
                  const href = isLocked
                    ? "#"
                    : `/courses/${courseId}/lessons/${lesson.id}`;
                  const typeInfo =
                    LESSON_TYPE_ICONS[lesson.content_type] ??
                    LESSON_TYPE_ICONS.text;
                  const TypeIcon = typeInfo.icon;

                  return (
                    <li key={lesson.id}>
                      <Link
                        href={href}
                        className={`flex items-center gap-4 p-3.5 rounded-xl transition-all duration-200 ${
                          isLocked
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-blue-50/50 cursor-pointer"
                        } ${
                          isCompleted
                            ? "bg-green-50/50 border border-green-100"
                            : "border border-transparent"
                        }`}
                        aria-disabled={isLocked}
                        onClick={
                          isLocked ? (e) => e.preventDefault() : undefined
                        }
                      >
                        {/* Status icon */}
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
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
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
                            <span
                              className={`text-sm font-medium truncate ${
                                isCompleted
                                  ? "text-green-700"
                                  : "text-slate-800"
                              }`}
                            >
                              {lesson.title}
                            </span>
                          </div>
                          {lesson.description && (
                            <p className="text-xs text-slate-400 mt-0.5 ml-7 truncate">
                              {lesson.description}
                            </p>
                          )}
                        </div>

                        {/* Meta badges */}
                        <div className="flex-shrink-0 flex items-center gap-2">
                          {/* Content type badge */}
                          <span
                            className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeInfo.color}`}
                          >
                            <TypeIcon className="w-3 h-3" />
                            {typeInfo.label}
                          </span>
                          {lesson.xp_reward && (
                            <span className="flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                              <Zap className="w-3 h-3" />
                              {lesson.xp_reward}
                            </span>
                          )}
                          {lesson.duration_minutes && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Clock className="w-3 h-3" />
                              {lesson.duration_minutes}m
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

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="glass-card p-6 sticky top-24">
            {isEnrolled ? (
              <>
                <h3 className="font-bold font-poppins text-slate-900 mb-4">
                  Il tuo progresso
                </h3>

                {/* Progress */}
                <div className="mb-5">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500">Completato</span>
                    <span className="font-bold text-blue-700">
                      {progressPct}%
                    </span>
                  </div>
                  <div className="xp-bar h-3">
                    <div
                      className="xp-bar-fill"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {completedCount} di {totalLessons} lezioni completate
                  </p>
                </div>

                {/* CTA */}
                {nextLesson ? (
                  <Link
                    href={`/courses/${courseId}/lessons/${nextLesson.id}`}
                    className="btn-cta w-full text-center block"
                  >
                    Continua
                  </Link>
                ) : (
                  <div className="text-center py-3">
                    <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-green-700">
                      Corso completato!
                    </p>
                  </div>
                )}

                {enrollment?.enrolled_at && (
                  <p className="text-xs text-slate-400 text-center mt-3">
                    Iscritto il{" "}
                    {new Date(enrollment.enrolled_at).toLocaleDateString(
                      "it-IT"
                    )}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="text-center mb-5">
                  {course.price_cents && course.price_cents > 0 ? (
                    <p className="text-3xl font-bold font-poppins text-slate-900">
                      &euro;{(course.price_cents / 100).toFixed(2)}
                    </p>
                  ) : (
                    <p className="text-xl font-bold font-poppins text-green-600">
                      Gratuito
                    </p>
                  )}
                </div>

                <form
                  action={`/api/courses/${courseId}/enroll`}
                  method="POST"
                >
                  <button type="submit" className="btn-cta w-full cursor-pointer">
                    Iscriviti al corso
                  </button>
                </form>

                <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Accesso illimitato
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {totalLessons} lezioni
                  </li>
                  {course.xp_reward && (
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Guadagna {course.xp_reward} XP
                    </li>
                  )}
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    AI Tutor dedicato
                  </li>
                </ul>

                {(lessons ?? []).length > 0 && (
                  <div className="mt-5 pt-5 border-t border-blue-100">
                    <p className="text-xs text-slate-400 mb-2 font-medium">
                      Anteprima gratuita:
                    </p>
                    <Link
                      href={`/courses/${courseId}/lessons/${(lessons as any[])[0].id}`}
                      className="btn-outline w-full text-center text-sm flex items-center justify-center gap-1.5"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Prima lezione gratis
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
