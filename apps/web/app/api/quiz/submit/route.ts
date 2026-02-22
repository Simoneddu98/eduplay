import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface SubmitBody {
  lessonId: string;
  courseId: string;
  answers: Record<string, number | null>; // questionId → selectedOptionIndex
  questions: { id: string; correct: number }[];
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  let body: SubmitBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const { lessonId, courseId, answers, questions } = body;

  if (!lessonId || !courseId || !answers || !questions?.length) {
    return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
  }

  // Check enrollment
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!enrollment) {
    return NextResponse.json({ error: "Non iscritto al corso" }, { status: 403 });
  }

  // Grade the quiz
  let correctCount = 0;
  const gradedAnswers: Record<string, { selected: number | null; correct: number; is_correct: boolean }> = {};

  for (const q of questions) {
    const selected = answers[q.id] ?? null;
    const isCorrect = selected === q.correct;
    if (isCorrect) correctCount++;
    gradedAnswers[q.id] = {
      selected,
      correct: q.correct,
      is_correct: isCorrect,
    };
  }

  const totalQuestions = questions.length;
  const scorePct = Math.round((correctCount / totalQuestions) * 100);
  const passed = scorePct >= 70;

  // Fetch lesson for XP reward info
  const { data: lesson } = await supabase
    .from("lessons")
    .select("xp_reward, title")
    .eq("id", lessonId)
    .single();

  // Calculate XP: full reward if passed, partial if not
  const baseXp = lesson?.xp_reward ?? 100;
  const xpGained = passed ? baseXp : Math.round(baseXp * (scorePct / 100) * 0.5);

  // Save quiz attempt
  const { error: attemptError } = await supabase.from("quiz_attempts").insert({
    user_id: user.id,
    lesson_id: lessonId,
    course_id: courseId,
    score_pct: scorePct,
    correct_count: correctCount,
    total_questions: totalQuestions,
    passed,
    answers_json: gradedAnswers,
    xp_earned: xpGained,
    completed_at: new Date().toISOString(),
  });

  if (attemptError) {
    console.error("Quiz attempt error:", attemptError);
    // Don't fail — still return results
  }

  // Award XP
  let xpResult: any = null;
  if (xpGained > 0) {
    const { data } = await supabase.rpc("award_xp", {
      p_user_id: user.id,
      p_amount: xpGained,
      p_reason: "quiz_complete",
      p_reference_id: lessonId,
    });
    xpResult = data?.[0] ?? null;
  }

  // If passed: mark lesson as complete (if not already)
  if (passed) {
    const { data: existingCompletion } = await supabase
      .from("lesson_completions")
      .select("id")
      .eq("lesson_id", lessonId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingCompletion) {
      await supabase.from("lesson_completions").insert({
        user_id: user.id,
        lesson_id: lessonId,
        course_id: courseId,
        completed_at: new Date().toISOString(),
      });

      // Update enrollment progress
      const [{ count: completedCount }, { count: totalCount }] = await Promise.all([
        supabase
          .from("lesson_completions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("course_id", courseId),
        supabase
          .from("lessons")
          .select("*", { count: "exact", head: true })
          .eq("course_id", courseId)
          .eq("is_published", true),
      ]);

      const progressPct =
        totalCount && totalCount > 0
          ? Math.round(((completedCount ?? 0) / totalCount) * 100)
          : 0;

      await supabase
        .from("enrollments")
        .update({ progress_pct: progressPct })
        .eq("course_id", courseId)
        .eq("user_id", user.id);
    }
  }

  // Update streak
  await supabase.rpc("update_streak", { p_user_id: user.id });

  // Notification
  await supabase.from("notifications").insert({
    user_id: user.id,
    type: "quiz_completed",
    title: passed ? `✅ Quiz superato: ${scorePct}%` : `Quiz completato: ${scorePct}%`,
    body: passed
      ? `Ottimo lavoro! Hai risposto correttamente a ${correctCount}/${totalQuestions} domande. +${xpGained} XP`
      : `Hai risposto a ${correctCount}/${totalQuestions} domande. Puoi riprovare per migliorare!`,
    data: { lesson_id: lessonId, score_pct: scorePct },
  });

  return NextResponse.json({
    success: true,
    score_pct: scorePct,
    correct_count: correctCount,
    total_questions: totalQuestions,
    passed,
    xp_gained: xpGained,
    new_xp: xpResult?.new_xp,
    new_level: xpResult?.new_level,
    leveled_up: xpResult?.leveled_up ?? false,
  });
}
