import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { courseId } = params;

  // Check course exists and is published
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, price_eur, title")
    .eq("id", courseId)
    .eq("is_published", true)
    .single();

  if (courseError || !course) {
    return NextResponse.json({ error: "Corso non trovato" }, { status: 404 });
  }

  // Check not already enrolled
  const { data: existing } = await supabase
    .from("enrollments")
    .select("id")
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Already enrolled → redirect to course page
    return NextResponse.redirect(
      new URL(`/courses/${courseId}`, req.url),
      { status: 302 }
    );
  }

  // For paid courses (when Stripe is integrated) — for now allow free enrollment
  if (course.price_eur && course.price_eur > 0) {
    // TODO: integrate Stripe checkout
    // For now, allow enrollment anyway (dev mode)
  }

  // Create enrollment
  const { error: enrollError } = await supabase.from("enrollments").insert({
    user_id: user.id,
    course_id: courseId,
    enrolled_at: new Date().toISOString(),
    progress_pct: 0,
  });

  if (enrollError) {
    console.error("Enroll error:", enrollError);
    return NextResponse.json(
      { error: "Errore durante l'iscrizione" },
      { status: 500 }
    );
  }

  // Award 10 XP for enrolling
  await supabase.rpc("award_xp", {
    p_user_id: user.id,
    p_amount: 10,
    p_reason: "course_enroll",
    p_reference_id: courseId,
  });

  // Create notification
  await supabase.from("notifications").insert({
    user_id: user.id,
    type: "course_enrolled",
    title: "Iscrizione completata!",
    body: `Sei iscritto a "${course.title}". Inizia subito la prima lezione!`,
    data: { course_id: courseId },
  });

  // Redirect to the course page
  return NextResponse.redirect(
    new URL(`/courses/${courseId}`, req.url),
    { status: 302 }
  );
}
