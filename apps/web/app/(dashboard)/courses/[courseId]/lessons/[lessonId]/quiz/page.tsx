"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Trophy,
  Zap,
  RotateCcw,
  AlertCircle,
  Target,
} from "lucide-react";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number; // index of correct option
  explanation?: string;
}

type QuizState = "loading" | "intro" | "active" | "submitting" | "results" | "error";

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: lessonData, error: lessonErr } = await supabase
      .from("lessons")
      .select("id, title, content, lesson_type, xp_reward")
      .eq("id", lessonId)
      .single();

    if (lessonErr || !lessonData) { setError("Lezione non trovata"); setState("error"); return; }
    if (lessonData.lesson_type !== "quiz") { setError("Questa lezione non è un quiz"); setState("error"); return; }

    setLesson(lessonData);

    // Parse questions from content
    let parsedQuestions: QuizQuestion[] = [];
    try {
      const contentData = typeof lessonData.content === "string"
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

    // Check previous attempt
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

  useEffect(() => { load(); }, [load]);

  const startQuiz = () => {
    setCurrentQ(0);
    setAnswers({});
    setSelectedAnswer(null);
    setShowExplanation(false);
    setState("active");
  };

  const selectAnswer = (idx: number) => {
    if (showExplanation) return; // already answered
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
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-gray-600 mb-4">{error}</p>
        <Link href={`/courses/${courseId}/lessons/${lessonId}`} className="btn-outline">
          ← Torna alla lezione
        </Link>
      </div>
    );
  }

  if (state === "intro") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center py-10">
          <Target className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Quiz: {lesson?.title}
          </h1>
          <p className="text-gray-500 mb-6">
            {questions.length} domande · Guadagna fino a {lesson?.xp_reward ?? 100} XP
          </p>

          {previousAttempt && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-6 text-sm text-blue-700">
              Ultimo tentativo:{" "}
              <strong>
                {previousAttempt.score_pct}% ({previousAttempt.correct_count}/
                {previousAttempt.total_questions})
              </strong>{" "}
              — Puoi riprovare per migliorare il punteggio
            </div>
          )}

          <div className="flex flex-col gap-3 items-center">
            <button onClick={startQuiz} className="btn-primary px-8">
              Inizia il quiz →
            </button>
            <Link
              href={`/courses/${courseId}/lessons/${lessonId}`}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              ← Torna alla lezione
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

    return (
      <div className="max-w-2xl mx-auto">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>
              Domanda {currentQ + 1} di {questions.length}
            </span>
            <span>
              {Object.keys(answers).length} risposte date
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
              style={{
                width: `${((currentQ + (isAnswered ? 1 : 0)) / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 leading-relaxed">
            {q.question}
          </h2>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {q.options.map((option, idx) => {
              let className =
                "w-full text-left p-3.5 rounded-xl border-2 transition-all font-medium text-sm";

              if (!isAnswered) {
                className +=
                  selectedAnswer === idx
                    ? " border-primary bg-primary/5 text-primary"
                    : " border-gray-200 hover:border-primary/50 hover:bg-gray-50 text-gray-700 cursor-pointer";
              } else {
                if (idx === q.correct) {
                  className += " border-green-400 bg-green-50 text-green-700";
                } else if (idx === selectedAnswer && idx !== q.correct) {
                  className += " border-red-400 bg-red-50 text-red-600";
                } else {
                  className += " border-gray-200 text-gray-400 cursor-default";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => selectAnswer(idx)}
                  disabled={isAnswered}
                  className={className}
                >
                  <span className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {option}
                    {isAnswered && idx === q.correct && (
                      <CheckCircle2 className="w-4 h-4 ml-auto text-green-500" />
                    )}
                    {isAnswered && idx === selectedAnswer && idx !== q.correct && (
                      <XCircle className="w-4 h-4 ml-auto text-red-500" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {isAnswered && q.explanation && (
            <div
              className={`rounded-lg px-4 py-3 mb-4 text-sm ${
                isCorrect
                  ? "bg-green-50 border border-green-100 text-green-700"
                  : "bg-red-50 border border-red-100 text-red-700"
              }`}
            >
              <p className="font-semibold mb-1">
                {isCorrect ? "✅ Corretto!" : "❌ Non corretto"}
              </p>
              {q.explanation}
            </div>
          )}

          {/* Action button */}
          {!isAnswered ? (
            <button
              onClick={confirmAnswer}
              disabled={selectedAnswer === null}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Conferma risposta
            </button>
          ) : (
            <button onClick={nextQuestion} className="btn-primary w-full">
              {currentQ < questions.length - 1 ? (
                <>
                  Prossima domanda
                  <ChevronRight className="w-4 h-4 ml-1 inline" />
                </>
              ) : (
                <>Vedi risultati</>
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
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-gray-500">Elaborazione risultati...</p>
      </div>
    );
  }

  if (state === "results" && results) {
    const isPassed = results.score_pct >= 70;
    const correctCount = results.correct_count;
    const total = results.total_questions;

    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center py-10">
          {isPassed ? (
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          ) : (
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          )}

          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {isPassed ? "Ottimo lavoro! 🎉" : "Riprova!"}
          </h1>
          <p className="text-gray-500 mb-6">
            {isPassed
              ? "Hai superato il quiz con successo"
              : "Non hai raggiunto il punteggio minimo (70%). Puoi riprovare!"}
          </p>

          {/* Score circle */}
          <div
            className={`w-28 h-28 rounded-full mx-auto flex flex-col items-center justify-center mb-6 border-4 ${
              isPassed ? "border-green-400 bg-green-50" : "border-red-300 bg-red-50"
            }`}
          >
            <span
              className={`text-3xl font-bold ${
                isPassed ? "text-green-700" : "text-red-600"
              }`}
            >
              {results.score_pct}%
            </span>
            <span className="text-xs text-gray-500">
              {correctCount}/{total}
            </span>
          </div>

          {/* XP gained */}
          {results.xp_gained > 0 && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3 inline-flex items-center gap-2 text-yellow-700 font-semibold mb-6">
              <Zap className="w-4 h-4" />+{results.xp_gained} XP guadagnati
            </div>
          )}

          {/* Level up */}
          {results.leveled_up && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 inline-flex items-center gap-2 text-primary font-semibold mb-4 ml-2">
              ⬆️ Level Up! Sei al livello {results.new_level}
            </div>
          )}

          {/* Answers breakdown */}
          <div className="text-left mt-6">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">Riepilogo risposte</h3>
            <div className="space-y-2">
              {questions.map((q, idx) => {
                const userAnswer = answers[q.id];
                const isOk = userAnswer === q.correct;
                return (
                  <div
                    key={q.id}
                    className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                      isOk ? "bg-green-50" : "bg-red-50"
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
                      {!isOk && userAnswer !== null && userAnswer !== undefined && (
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
              <button onClick={startQuiz} className="btn-outline flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Riprova
              </button>
            )}
            <Link
              href={`/courses/${courseId}/lessons/${lessonId}`}
              className="btn-primary"
            >
              {isPassed ? "Continua il corso →" : "← Rivedi la lezione"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
