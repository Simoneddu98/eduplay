"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Trophy,
  Zap,
  RotateCcw,
  AlertCircle,
  Target,
  Award,
  Star,
} from "lucide-react";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
}

type QuizState =
  | "loading"
  | "intro"
  | "active"
  | "submitting"
  | "results"
  | "error";

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;

  const [state, setState] = useState<QuizState>("loading");
  const [lesson, setLesson] = useState<any>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [previousAttempt, setPreviousAttempt] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: lessonData, error: lessonErr } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .single();

    if (lessonErr || !lessonData) {
      setError("Lezione non trovata");
      setState("error");
      return;
    }
    if (lessonData.content_type !== "quiz") {
      setError("Questa lezione non è un quiz");
      setState("error");
      return;
    }

    setLesson(lessonData);

    let parsedQuestions: QuizQuestion[] = [];
    try {
      const contentData =
        typeof lessonData.content === "string"
          ? JSON.parse(lessonData.content)
          : lessonData.content;
      parsedQuestions = contentData?.questions ?? [];
    } catch {
      setError("Formato quiz non valido");
      setState("error");
      return;
    }

    if (parsedQuestions.length === 0) {
      setError("Nessuna domanda disponibile in questo quiz");
      setState("error");
      return;
    }

    setQuestions(parsedQuestions);

    const { data: attempt } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("lesson_id", lessonId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (attempt) {
      setPreviousAttempt(attempt);
    }

    setState("intro");
  }, [lessonId]);

  useEffect(() => {
    load();
  }, [load]);

  const startQuiz = () => {
    setCurrentQ(0);
    setAnswers({});
    setSelectedAnswer(null);
    setShowExplanation(false);
    setState("active");
  };

  const selectAnswer = (idx: number) => {
    if (showExplanation) return;
    setSelectedAnswer(idx);
  };

  const confirmAnswer = () => {
    if (selectedAnswer === null) return;
    const q = questions[currentQ];
    setAnswers((prev) => ({ ...prev, [q.id]: selectedAnswer }));
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    setState("submitting");

    const res = await fetch(`/api/quiz/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lessonId,
        courseId,
        answers,
        questions: questions.map((q) => ({
          id: q.id,
          correct: q.correct,
        })),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setResults(data);
      setState("results");
    } else {
      const err = await res.json();
      setError(err.error ?? "Errore nell'invio del quiz");
      setState("error");
    }
  };

  // --- RENDER ---
  if (state === "loading") {
    return (
      <div className="flex items-center justify-center h-80">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-slate-600 mb-4">{error}</p>
        <Link
          href={`/courses/${courseId}/lessons/${lessonId}`}
          className="btn-outline inline-block"
        >
          Torna alla lezione
        </Link>
      </div>
    );
  }

  if (state === "intro") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass-card text-center py-12 px-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Target className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold font-poppins text-slate-900 mb-2">
            Quiz: {lesson?.title}
          </h1>
          <p className="text-slate-500 mb-8">
            {questions.length} domande &middot; Guadagna fino a{" "}
            {lesson?.xp_reward ?? 100} XP
          </p>

          {previousAttempt && (
            <div className="glass-card p-4 mb-8 text-sm text-blue-700 inline-block">
              Ultimo tentativo:{" "}
              <strong>
                {previousAttempt.score_pct}% ({previousAttempt.correct_count}/
                {previousAttempt.total_questions})
              </strong>{" "}
              &mdash; Puoi riprovare per migliorare
            </div>
          )}

          <div className="flex flex-col gap-3 items-center">
            <button onClick={startQuiz} className="btn-cta px-10 cursor-pointer">
              Inizia il quiz
            </button>
            <Link
              href={`/courses/${courseId}/lessons/${lessonId}`}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              Torna alla lezione
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (state === "active") {
    const q = questions[currentQ];
    const isAnswered = showExplanation;
    const chosenAnswer = answers[q.id] ?? selectedAnswer;
    const isCorrect = chosenAnswer === q.correct;
    const progressPct =
      ((currentQ + (isAnswered ? 1 : 0)) / questions.length) * 100;

    return (
      <div className="max-w-2xl mx-auto">
        {/* Progress header */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-slate-500 mb-2">
            <span className="font-poppins font-semibold">
              Domanda {currentQ + 1} di {questions.length}
            </span>
            <span className="text-xs">
              {Object.keys(answers).length} risposte date
            </span>
          </div>
          <div className="xp-bar h-2.5">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="glass-card p-8">
          <h2 className="text-lg font-semibold font-poppins text-slate-900 mb-8 leading-relaxed">
            {q.question}
          </h2>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {q.options.map((option, idx) => {
              let baseClass =
                "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 font-medium text-sm cursor-pointer";

              if (!isAnswered) {
                if (selectedAnswer === idx) {
                  baseClass +=
                    " border-blue-500 bg-blue-50 text-blue-700 shadow-sm";
                } else {
                  baseClass +=
                    " border-blue-100 hover:border-blue-400 hover:bg-blue-50/50 text-slate-700";
                }
              } else {
                if (idx === q.correct) {
                  baseClass +=
                    " border-green-400 bg-green-50 text-green-700";
                } else if (idx === selectedAnswer && idx !== q.correct) {
                  baseClass += " border-red-400 bg-red-50 text-red-600";
                } else {
                  baseClass +=
                    " border-blue-50 text-slate-300 cursor-default";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => selectAnswer(idx)}
                  disabled={isAnswered}
                  className={baseClass}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        !isAnswered && selectedAnswer === idx
                          ? "border-blue-500 bg-blue-500 text-white"
                          : isAnswered && idx === q.correct
                            ? "border-green-500 bg-green-500 text-white"
                            : isAnswered &&
                                idx === selectedAnswer &&
                                idx !== q.correct
                              ? "border-red-500 bg-red-500 text-white"
                              : "border-current"
                      }`}
                    >
                      {isAnswered && idx === q.correct ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isAnswered &&
                        idx === selectedAnswer &&
                        idx !== q.correct ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        String.fromCharCode(65 + idx)
                      )}
                    </span>
                    <span className="flex-1">{option}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {isAnswered && q.explanation && (
            <div
              className={`rounded-xl px-5 py-4 mb-6 text-sm ${
                isCorrect
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              <p className="font-semibold font-poppins mb-1 flex items-center gap-2">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Corretto!
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" /> Non corretto
                  </>
                )}
              </p>
              {q.explanation}
            </div>
          )}

          {/* Action button */}
          {!isAnswered ? (
            <button
              onClick={confirmAnswer}
              disabled={selectedAnswer === null}
              className="btn-cta w-full disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Conferma Risposta
            </button>
          ) : (
            <button
              onClick={nextQuestion}
              className="btn-primary w-full cursor-pointer"
            >
              {currentQ < questions.length - 1 ? (
                <span className="flex items-center justify-center gap-2">
                  Prossima domanda
                  <ChevronRight className="w-4 h-4" />
                </span>
              ) : (
                "Vedi risultati"
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (state === "submitting") {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-slate-500">Elaborazione risultati...</p>
      </div>
    );
  }

  if (state === "results" && results) {
    const isPassed = results.score_pct >= 70;
    const isPerfect = results.score_pct === 100;
    const correctCount = results.correct_count;
    const total = results.total_questions;

    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass-card text-center py-12 px-8">
          {/* Icon */}
          {isPerfect ? (
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-5 animate-level-up">
              <Award className="w-12 h-12 text-white" />
            </div>
          ) : isPassed ? (
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5">
              <Trophy className="w-12 h-12 text-white" />
            </div>
          ) : (
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Target className="w-12 h-12 text-slate-400" />
            </div>
          )}

          <h1 className="text-2xl font-bold font-poppins text-slate-900 mb-1">
            {isPerfect
              ? "Perfetto!"
              : isPassed
                ? "Ottimo lavoro!"
                : "Riprova!"}
          </h1>
          <p className="text-slate-500 mb-8">
            {isPerfect
              ? "Punteggio perfetto! Sei un vero campione"
              : isPassed
                ? "Hai superato il quiz con successo"
                : "Non hai raggiunto il punteggio minimo (70%). Puoi riprovare!"}
          </p>

          {/* Score circle */}
          <div
            className={`w-32 h-32 rounded-full mx-auto flex flex-col items-center justify-center mb-8 border-4 ${
              isPerfect
                ? "border-yellow-400 bg-yellow-50"
                : isPassed
                  ? "border-green-400 bg-green-50"
                  : "border-red-300 bg-red-50"
            }`}
          >
            <span
              className={`text-4xl font-bold font-poppins ${
                isPerfect
                  ? "text-yellow-600"
                  : isPassed
                    ? "text-green-700"
                    : "text-red-600"
              }`}
            >
              {results.score_pct}%
            </span>
            <span className="text-xs text-slate-500">
              {correctCount}/{total}
            </span>
          </div>

          {/* Perfect score badge */}
          {isPerfect && (
            <div className="badge-gold text-sm px-4 py-2 mb-4 inline-flex">
              <Star className="w-4 h-4" />
              Punteggio Perfetto
            </div>
          )}

          {/* XP gained */}
          {results.xp_gained > 0 && (
            <div className="badge-xp text-sm px-4 py-2 mb-4 inline-flex animate-fade-in-up">
              <Zap className="w-4 h-4" />+{results.xp_gained} XP guadagnati
            </div>
          )}

          {/* Level up */}
          {results.leveled_up && (
            <div className="badge-level text-sm px-4 py-2 mb-4 ml-2 inline-flex animate-level-up">
              <Star className="w-4 h-4" />
              Level Up! Livello {results.new_level}
            </div>
          )}

          {/* Answers breakdown */}
          <div className="text-left mt-8">
            <h3 className="font-semibold font-poppins text-slate-700 mb-3 text-sm">
              Riepilogo risposte
            </h3>
            <div className="space-y-2">
              {questions.map((q, idx) => {
                const userAnswer = answers[q.id];
                const isOk = userAnswer === q.correct;
                return (
                  <div
                    key={q.id}
                    className={`flex items-start gap-3 p-3 rounded-xl text-sm ${
                      isOk
                        ? "bg-green-50 border border-green-100"
                        : "bg-red-50 border border-red-100"
                    }`}
                  >
                    {isOk ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className={isOk ? "text-green-800" : "text-red-800"}>
                        {idx + 1}. {q.question}
                      </p>
                      {!isOk &&
                        userAnswer !== null &&
                        userAnswer !== undefined && (
                          <p className="text-xs text-red-600 mt-0.5">
                            Risposta corretta: {q.options[q.correct]}
                          </p>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center">
            {!isPassed && (
              <button
                onClick={startQuiz}
                className="btn-outline flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Riprova
              </button>
            )}
            <Link
              href={`/courses/${courseId}/lessons/${lessonId}`}
              className="btn-primary inline-flex items-center justify-center"
            >
              {isPassed ? "Continua il corso" : "Rivedi la lezione"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
