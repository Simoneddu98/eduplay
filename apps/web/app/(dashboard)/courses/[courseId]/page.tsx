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
  Users,
  Star,
  Zap,
} from "lucide-react";

const LEVEL_LABELS: Record<string, string> = {
  base: "Base",
  intermediate: "Intermedio",
  advanced: "Avanzato",
};
const LEVEL_COLORS: Record<string, string> = {
  base: "bg-gray-100 text-gray-600",
  intermediate: "bg-yellow-100 text-yellow-700",
  advanced: "bg-red-100 text-red-700",
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

  // Fetch course + lessons + enrollment in parallel
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
      .select("id, title, description, order_index, duration_minutes, lesson_type, xp_reward, is_published")
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
      .select("lesson_id")
      .eq("user_id", user.id),
  ]);

  if (courseError || !course) notFound();

  const completedSet = new Set((completions ?? []).map((c: any) => c.lesson_id));
  const isEnrolled = !!enrollment;
  const completedCount = (lessons ?? []).filter((l: any) => completedSet.has(l.id)).length;
  const totalLessons = (lessons ?? []).length;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Find next incomplete lesson
  const nextLesson = (lessons ?? []).find((l: any) => !completedSet.has(l.id));

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/courses" className="hover:text-primary transition-colors">
          Corsi
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-700 font-medium">{course.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero */}
          <div className="card">
            <div className="h-48 bg-gradient-to-br from-primary/15 to-accent/15 rounded-xl mb-5 overflow-hidden flex items-center justify-center">
              {course.cover_url ? (
                <img
                  src={course.cover_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <BookOpen className="w-20 h-20 text-primary/20" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  LEVEL_COLORS[course.level] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {LEVEL_LABELS[course.level] ?? course.level}
              </span>
              {course.xp_reward && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  +{course.xp_reward} XP al completamento
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h1>
            <p className="text-gray-600 leading-relaxed">{course.description}</p>

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-6 mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
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
              {course.instructor_name && (
                <span className="flex items-center gap-1.5">
                  <Star className="w-4 h-4" />
                  {course.instructor_name}
                </span>
              )}
            </div>
          </div>

          {/* Lessons list */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Programma del corso
            </h2>

            {(lessons ?? []).length === 0 ? (
              <p className="text-gray-400 text-sm py-4">
                Nessuna lezione disponibile.
              </p>
            ) : (
              <ol className="space-y-2">
                {(lessons ?? []).map((lesson: any, idx: number) => {
                  const isCompleted = completedSet.has(lesson.id);
                  const isLocked = !isEnrolled && idx > 0; // first lesson always accessible as preview
                  const href = isLocked
                    ? "#"
                    : `/courses/${courseId}/lessons/${lesson.id}`;

                  return (
                    <li key={lesson.id}>
                      <Link
                        href={href}
                        className={`flex items-center gap-4 p-3 rounded-lg transition-all ${
                          isLocked
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-gray-50 cursor-pointer"
                        } ${
                          isCompleted ? "bg-green-50 border border-green-100" : ""
                        }`}
                        aria-disabled={isLocked}
                        onClick={isLocked ? (e) => e.preventDefault() : undefined}
                      >
                        {/* Icon */}
                        <div className="flex-shrink-0">
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : isLocked ? (
                            <Lock className="w-5 h-5 text-gray-300" />
                          ) : (
                            <PlayCircle className="w-5 h-5 text-primary/60" />
                          )}
                        </div>

                        {/* Number + Title */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 font-mono w-5">
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <span
                              className={`text-sm font-medium truncate ${
                                isCompleted ? "text-green-700" : "text-gray-800"
                              }`}
                            >
                              {lesson.title}
                            </span>
                          </div>
                          {lesson.description && (
                            <p className="text-xs text-gray-400 mt-0.5 ml-7 truncate">
                              {lesson.description}
                            </p>
                          )}
                        </div>

                        {/* Meta */}
                        <div className="flex-shrink-0 flex items-center gap-3 text-xs text-gray-400">
                          {lesson.xp_reward && (
                            <span className="flex items-center gap-0.5 text-yellow-600">
                              <Zap className="w-3 h-3" />
                              {lesson.xp_reward}
                            </span>
                          )}
                          {lesson.duration_minutes && (
                            <span className="flex items-center gap-1">
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
          {/* Enrollment card */}
          <div className="card sticky top-6">
            {isEnrolled ? (
              <>
                <h3 className="font-bold text-gray-900 mb-3">Il tuo progresso</h3>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-500">Completato</span>
                    <span className="font-semibold text-primary">{progressPct}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {completedCount} / {totalLessons} lezioni completate
                  </p>
                </div>

                {/* Next lesson CTA */}
                {nextLesson ? (
                  <Link
                    href={`/courses/${courseId}/lessons/${nextLesson.id}`}
                    className="btn-primary w-full text-center block"
                  >
                    Continua →
                  </Link>
                ) : (
                  <div className="text-center py-2">
                    <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-1" />
                    <p className="text-sm font-semibold text-green-700">Corso completato!</p>
                  </div>
                )}

                {/* Enrollment date */}
                {enrollment?.enrolled_at && (
                  <p className="text-xs text-gray-400 text-center mt-3">
                    Iscritto il{" "}
                    {new Date(enrollment.enrolled_at).toLocaleDateString("it-IT")}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="text-center mb-4">
                  {course.price_eur && course.price_eur > 0 ? (
                    <p className="text-3xl font-bold text-gray-900">
                      €{course.price_eur}
                    </p>
                  ) : (
                    <p className="text-xl font-bold text-green-600">Gratuito</p>
                  )}
                </div>

                <form action={`/api/courses/${courseId}/enroll`} method="POST">
                  <button type="submit" className="btn-primary w-full">
                    Iscriviti al corso
                  </button>
                </form>

                <ul className="mt-4 space-y-2 text-sm text-gray-500">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Accesso illimitato
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    {totalLessons} lezioni video
                  </li>
                  {course.xp_reward && (
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      Guadagna {course.xp_reward} XP
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    AI Tutor dedicato
                  </li>
                </ul>

                {/* Preview first lesson */}
                {(lessons ?? []).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2 font-medium">
                      Anteprima gratuita:
                    </p>
                    <Link
                      href={`/courses/${courseId}/lessons/${(lessons as any[])[0].id}`}
                      className="btn-outline w-full text-center text-sm"
                    >
                      <PlayCircle className="w-4 h-4 inline mr-1" />
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
