import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: { lessonId: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { lessonId } = params;
  const body = await req.json().catch(() => ({}));
  const { courseId } = body;

  // Fetch lesson
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("id, course_id, xp_reward, lesson_type, order_index")
    .eq("id", lessonId)
    .single();

  if (lessonError || !lesson) {
    return NextResponse.json({ error: "Lezione non trovata" }, { status: 404 });
  }

  const effectiveCourseId = courseId ?? lesson.course_id;

  // Check enrollment (first lesson is always accessible as preview, others require enrollment)
  if (lesson.order_index > 0) {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("course_id", effectiveCourseId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!enrollment) {
      return NextResponse.json({ error: "Non iscritto al corso" }, { status: 403 });
    }
  }

  // Check already completed
  const { data: existing } = await supabase
    .from("lesson_completions")
    .select("id")
    .eq("lesson_id", lessonId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      already_completed: true,
      xp_gained: 0,
      message: "Lezione già completata",
    });
  }

  // Insert completion
  const { error: completionError } = await supabase
    .from("lesson_completions")
    .insert({
      user_id: user.id,
      lesson_id: lessonId,
      course_id: effectiveCourseId,
      completed_at: new Date().toISOString(),
    });

  if (completionError) {
    console.error("Completion error:", completionError);
    return NextResponse.json(
      { error: "Errore nel salvataggio del completamento" },
      { status: 500 }
    );
  }

  // Award XP
  const xpAmount = lesson.xp_reward ?? 50;
  let xpResult: any = null;
  if (xpAmount > 0) {
    const { data } = await supabase.rpc("award_xp", {
      p_user_id: user.id,
      p_amount: xpAmount,
      p_reason: "lesson_complete",
      p_reference_id: lessonId,
    });
    xpResult = data?.[0] ?? null;
  }

  // Update enrollment progress
  const [{ count: completedCount }, { count: totalCount }] = await Promise.all([
    supabase
      .from("lesson_completions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("course_id", effectiveCourseId),
    supabase
      .from("lessons")
      .select("*", { count: "exact", head: true })
      .eq("course_id", effectiveCourseId)
      .eq("is_published", true),
  ]);

  const progressPct =
    totalCount && totalCount > 0
      ? Math.round(((completedCount ?? 0) / totalCount) * 100)
      : 0;

  const isCourseDone = progressPct === 100;

  await supabase
    .from("enrollments")
    .update({
      progress_pct: progressPct,
      completed_at: isCourseDone ? new Date().toISOString() : null,
    })
    .eq("course_id", effectiveCourseId)
    .eq("user_id", user.id);

  // Award course completion XP bonus
  if (isCourseDone) {
    const { data: courseData } = await supabase
      .from("courses")
      .select("xp_reward, title, coin_reward")
      .eq("id", effectiveCourseId)
      .single();

    if (courseData?.xp_reward) {
      await supabase.rpc("award_xp", {
        p_user_id: user.id,
        p_amount: courseData.xp_reward,
        p_reason: "course_complete",
        p_reference_id: effectiveCourseId,
      });
    }

    // EduCoins reward
    if (courseData?.coin_reward) {
      await supabase
        .from("profiles")
        .update({ edu_coins: supabase.rpc("award_xp" as any, {}) })
        .eq("id", user.id);
      // Simplified: direct update
      await supabase.rpc("award_xp", {
        p_user_id: user.id,
        p_amount: 0,
        p_reason: "noop",
      });
    }

    // Notification: course complete
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "course_completed",
      title: "🎉 Corso completato!",
      body: `Hai completato "${courseData?.title ?? "il corso"}". ${courseData?.xp_reward ? `+${courseData.xp_reward} XP bonus!` : ""}`,
      data: { course_id: effectiveCourseId },
    });
  } else {
    // Update streak
    await supabase.rpc("update_streak", { p_user_id: user.id });
  }

  // Check badges (basic: first_lesson, milestone badges)
  await checkAndAwardBadges(supabase, user.id, effectiveCourseId, completedCount ?? 0);

  return NextResponse.json({
    success: true,
    xp_gained: xpAmount,
    new_xp: xpResult?.new_xp,
    new_level: xpResult?.new_level,
    leveled_up: xpResult?.leveled_up ?? false,
    progress_pct: progressPct,
    course_completed: isCourseDone,
  });
}

// --- Badge checker ---
async function checkAndAwardBadges(
  supabase: any,
  userId: string,
  courseId: string,
  completedLessonsInCourse: number
) {
  // Get all badges the user doesn't have yet
  const [{ data: allBadges }, { data: userBadges }] = await Promise.all([
    supabase.from("badges").select("*").eq("is_active", true),
    supabase.from("user_badges").select("badge_id").eq("user_id", userId),
  ]);

  const ownedIds = new Set((userBadges ?? []).map((b: any) => b.badge_id));
  const { data: profile } = await supabase
    .from("profiles")
    .select("xp_total, level")
    .eq("id", userId)
    .single();

  const { count: totalCompletions } = await supabase
    .from("lesson_completions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const { count: coursesCompleted } = await supabase
    .from("enrollments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("progress_pct", 100);

  const newBadges: string[] = [];

  for (const badge of allBadges ?? []) {
    if (ownedIds.has(badge.id)) continue;

    let earned = false;
    const type = badge.badge_type as string;
    const cond = badge.condition_value ?? 0;

    if (type === "lesson_count" && (totalCompletions ?? 0) >= cond) earned = true;
    if (type === "course_count" && (coursesCompleted ?? 0) >= cond) earned = true;
    if (type === "xp_milestone" && (profile?.xp_total ?? 0) >= cond) earned = true;
    if (type === "level_reached" && (profile?.level ?? 1) >= cond) earned = true;
    if (type === "first_lesson" && (totalCompletions ?? 0) >= 1) earned = true;
    if (type === "first_course" && (coursesCompleted ?? 0) >= 1) earned = true;

    if (earned) {
      await supabase.from("user_badges").insert({
        user_id: userId,
        badge_id: badge.id,
        earned_at: new Date().toISOString(),
      });
      newBadges.push(badge.name);

      await supabase.from("notifications").insert({
        user_id: userId,
        type: "badge_earned",
        title: `🏆 Badge sbloccato: ${badge.name}`,
        body: badge.description ?? "Hai ottenuto un nuovo badge!",
        data: { badge_id: badge.id },
      });
    }
  }

  return newBadges;
}
