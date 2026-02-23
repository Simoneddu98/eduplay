"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  BookOpen,
  Zap,
  MessageSquare,
  ClipboardList,
  Clock,
  AlertCircle,
  Loader2,
  PlayCircle,
} from "lucide-react";

function YouTubeEmbed({ videoId }: { videoId: string }) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-blue-100 shadow-sm" style={{ paddingTop: "56.25%" }}>
      <iframe
        className="absolute inset-0 w-full h-full"
        src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
        title="Lesson video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export default function LessonViewerPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;

  const [lesson, setLesson] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [course, setCourse] = useState<any>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [xpGained, setXpGained] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedSet, setCompletedSet] = useState<Set<string>>(new Set());

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const [
      { data: lessonData, error: lessonErr },
      { data: allLessons },
      { data: courseData },
      { data: enrollment },
      { data: completions },
    ] = await Promise.all([
      supabase.from("lessons").select("*").eq("id", lessonId).single(),
      supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId)
        .eq("is_published", true)
        .order("order_index"),
      supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single(),
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

    if (lessonErr || !lessonData) {
      setError("Lezione non trovata.");
      setIsLoading(false);
      return;
    }

    const completed = new Set(
      (completions ?? []).map((c: any) => c.lesson_id)
    );
    setLesson(lessonData);
    setLessons(allLessons ?? []);
    setCourse(courseData);
    setIsEnrolled(!!enrollment);
    setCompletedSet(completed);
    setIsCompleted(completed.has(lessonId));
    setIsLoading(false);
  }, [courseId, lessonId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleComplete = async () => {
    if (isCompleting || isCompleted) return;
    setIsCompleting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const res = await fetch(`/api/lessons/${lessonId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId }),
    });

    if (res.ok) {
      const data = await res.json();
      setIsCompleted(true);
      setCompletedSet((prev) => new Set([...prev, lessonId]));
      if (data.xp_gained) setXpGained(data.xp_gained);
    } else {
      const err = await res.json();
      setError(err.error ?? "Errore nel completamento");
    }
    setIsCompleting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-80">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-slate-600">{error ?? "Lezione non trovata."}</p>
        <Link
          href={`/courses/${courseId}`}
          className="btn-outline mt-4 inline-block"
        >
          Torna al corso
        </Link>
      </div>
    );
  }

  const currentIndex = lessons.findIndex((l: any) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const videoId = lesson.video_url
    ? extractYouTubeId(lesson.video_url)
    : null;
  const courseProgressPct =
    lessons.length > 0
      ? Math.round(
          (Array.from(completedSet).filter((id) =>
            lessons.some((l: any) => l.id === id)
          ).length /
            lessons.length) *
            100
        )
      : 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Course progress indicator */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>Progresso corso</span>
          <span className="font-semibold text-blue-600">
            {courseProgressPct}%
          </span>
        </div>
        <div className="xp-bar h-1.5">
          <div
            className="xp-bar-fill"
            style={{ width: `${courseProgressPct}%` }}
          />
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <Link
          href="/courses"
          className="hover:text-blue-600 transition-colors cursor-pointer"
        >
          Corsi
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link
          href={`/courses/${courseId}`}
          className="hover:text-blue-600 transition-colors cursor-pointer"
        >
          {course?.title ?? "Corso"}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-700 font-medium truncate max-w-48">
          {lesson.title}
        </span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content: 75% */}
        <div className="lg:col-span-3 space-y-5">
          {/* Video player */}
          {videoId ? (
            <YouTubeEmbed videoId={videoId} />
          ) : (
            <div className="glass-card h-64 flex items-center justify-center">
              <div className="text-center">
                <BookOpen className="w-12 h-12 text-blue-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">
                  Nessun video disponibile
                </p>
              </div>
            </div>
          )}

          {/* Lesson info card */}
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-slate-400 font-mono">
                    Lezione {currentIndex + 1} / {lessons.length}
                  </span>
                  {lesson.duration_minutes && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {lesson.duration_minutes} min
                    </span>
                  )}
                  {lesson.xp_reward && (
                    <span className="badge-xp text-[10px]">
                      <Zap className="w-3 h-3" />+{lesson.xp_reward} XP
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-bold font-poppins text-slate-900">
                  {lesson.title}
                </h1>
                {lesson.description && (
                  <p className="text-slate-500 mt-1 text-sm">
                    {lesson.description}
                  </p>
                )}
              </div>
            </div>

            {/* XP gained toast */}
            {xpGained && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-amber-700 font-semibold mb-4 animate-fade-in-up">
                <Zap className="w-5 h-5" />+{xpGained} XP guadagnati!
              </div>
            )}

            {/* Lesson content */}
            {lesson.content && (
              <div className="mt-4 pt-4 border-t border-blue-100">
                <h2 className="text-sm font-semibold text-slate-700 mb-3">
                  Trascrizione / Note
                </h2>
                <div
                  className="prose prose-sm prose-slate max-w-none"
                  dangerouslySetInnerHTML={{ __html: lesson.content }}
                />
              </div>
            )}
          </div>

          {/* Bottom bar: complete + navigation */}
          <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left nav */}
            {prevLesson ? (
              <Link
                href={`/courses/${courseId}/lessons/${prevLesson.id}`}
                className="btn-outline flex items-center gap-2 text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Precedente
              </Link>
            ) : (
              <Link
                href={`/courses/${courseId}`}
                className="btn-outline flex items-center gap-2 text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Al corso
              </Link>
            )}

            {/* Center: complete button */}
            {isEnrolled && (
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <span className="flex items-center gap-2 text-green-600 font-semibold text-sm bg-green-50 px-4 py-2.5 rounded-xl">
                    <CheckCircle2 className="w-5 h-5" />
                    Lezione completata
                  </span>
                ) : (
                  <button
                    onClick={handleComplete}
                    disabled={isCompleting}
                    className="btn-cta flex items-center gap-2 text-sm"
                  >
                    {isCompleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Lezione completata
                  </button>
                )}
              </div>
            )}

            {/* Right nav */}
            {nextLesson ? (
              <Link
                href={`/courses/${courseId}/lessons/${nextLesson.id}`}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                Prossima
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href={`/courses/${courseId}`}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                Finito!
                <CheckCircle2 className="w-4 h-4" />
              </Link>
            )}
          </div>

          {/* Quick actions */}
          {isEnrolled && (
            <div className="flex items-center gap-4">
              <Link
                href={`/ai-tutor?course=${courseId}`}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                Chiedi all'AI Tutor
              </Link>
              {lesson.content_type === "quiz" && (
                <Link
                  href={`/courses/${courseId}/lessons/${lessonId}/quiz`}
                  className="flex items-center gap-2 text-sm text-green-600 hover:text-green-800 font-medium transition-colors cursor-pointer"
                >
                  <ClipboardList className="w-4 h-4" />
                  Vai al Quiz
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: lesson list (25%) */}
        <div className="space-y-2">
          <h3 className="font-semibold font-poppins text-slate-700 text-sm mb-3">
            Contenuto del corso
          </h3>
          <ol className="space-y-1">
            {lessons.map((l: any, idx: number) => {
              const isCurrent = l.id === lessonId;
              const isDone = completedSet.has(l.id);

              return (
                <li key={l.id}>
                  <Link
                    href={`/courses/${courseId}/lessons/${l.id}`}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer ${
                      isCurrent
                        ? "bg-blue-50 text-blue-700 font-semibold border border-blue-200"
                        : isDone
                          ? "text-green-700 hover:bg-green-50"
                          : "text-slate-600 hover:bg-blue-50/50"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
                    ) : isCurrent ? (
                      <PlayCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                    ) : (
                      <span className="w-4 h-4 mt-0.5 flex-shrink-0 text-xs font-mono flex items-center justify-center text-slate-400">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate leading-snug">{l.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {l.duration_minutes && (
                          <p className="text-[10px] text-slate-400">
                            {l.duration_minutes}m
                          </p>
                        )}
                        {l.xp_reward && (
                          <p className="text-[10px] text-amber-600 font-medium">
                            +{l.xp_reward} XP
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>

          {/* Not enrolled notice */}
          {!isEnrolled && (
            <div className="mt-4 glass-card p-4 text-xs text-slate-500">
              <Link
                href={`/courses/${courseId}`}
                className="text-blue-600 font-semibold hover:text-blue-800 transition-colors cursor-pointer"
              >
                Iscriviti al corso
              </Link>{" "}
              per sbloccare tutte le lezioni e guadagnare XP.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
