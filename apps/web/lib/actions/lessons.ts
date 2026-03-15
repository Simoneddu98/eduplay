"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./courses";
import type { LessonContent } from "@/features/course-creator/types";

async function requireCourseOwnership(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autenticato");

  const { data: course } = await supabase
    .from("courses")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select("id, created_by" as any)
    .eq("id", courseId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!course || (course as any).created_by !== user.id) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") throw new Error("Accesso negato");
  }

  return { supabase, user };
}

// ─── CREATE LESSON ────────────────────────────────────────────

export async function createLessonAction(
  courseId: string,
  data: { title: string; module_id?: string | null; order_index: number }
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await requireCourseOwnership(courseId);

    const { data: lesson, error } = await supabase
      .from("lessons")
      .insert({
        course_id: courseId,
        module_id: data.module_id ?? null,
        title: data.title,
        content_type: "text",
        content_json: { version: 2, blocks: [] },
        order_index: data.order_index,
        xp_reward: 50,
        is_published: false,
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };

    // Increment lessons_count
    const { data: cd } = await supabase.from("courses").select("lessons_count").eq("id", courseId).single();
    if (cd) await supabase.from("courses").update({ lessons_count: (cd.lessons_count ?? 0) + 1 }).eq("id", courseId);

    revalidatePath(`/dashboard/courses/${courseId}`);
    return { ok: true, data: { id: lesson.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Errore" };
  }
}

// ─── UPDATE LESSON META ───────────────────────────────────────

export async function updateLessonAction(
  lessonId: string,
  courseId: string,
  updates: { title?: string; description?: string; duration_minutes?: number; is_published?: boolean }
): Promise<ActionResult> {
  try {
    const { supabase } = await requireCourseOwnership(courseId);

    const { error } = await supabase
      .from("lessons")
      .update(updates)
      .eq("id", lessonId)
      .eq("course_id", courseId);

    if (error) return { ok: false, error: error.message };

    revalidatePath(`/dashboard/courses/${courseId}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Errore" };
  }
}

// ─── SAVE LESSON CONTENT ──────────────────────────────────────

export async function saveLessonContentAction(
  lessonId: string,
  courseId: string,
  content: LessonContent
): Promise<ActionResult> {
  try {
    const { supabase } = await requireCourseOwnership(courseId);

    const { error } = await supabase
      .from("lessons")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ content_json: content as any })
      .eq("id", lessonId)
      .eq("course_id", courseId);

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Errore" };
  }
}

// ─── DELETE LESSON ────────────────────────────────────────────

export async function deleteLessonAction(lessonId: string, courseId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireCourseOwnership(courseId);

    const { error } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lessonId)
      .eq("course_id", courseId);

    if (error) return { ok: false, error: error.message };

    // Decrement count
    const { data: c } = await supabase.from("courses").select("lessons_count").eq("id", courseId).single();
    if (c) await supabase.from("courses").update({ lessons_count: Math.max(0, (c.lessons_count ?? 1) - 1) }).eq("id", courseId);

    revalidatePath(`/dashboard/courses/${courseId}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Errore" };
  }
}

// ─── REORDER LESSONS (bulk update) ───────────────────────────

export async function reorderLessonsAction(
  courseId: string,
  order: Array<{ id: string; order_index: number }>
): Promise<ActionResult> {
  try {
    const { supabase } = await requireCourseOwnership(courseId);

    await Promise.all(
      order.map(({ id, order_index }) =>
        supabase.from("lessons").update({ order_index }).eq("id", id).eq("course_id", courseId)
      )
    );

    revalidatePath(`/dashboard/courses/${courseId}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Errore" };
  }
}

// ─── CREATE MODULE ────────────────────────────────────────────

export async function createModuleAction(
  courseId: string,
  title: string,
  order_index: number
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await requireCourseOwnership(courseId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("course_modules")
      .insert({ course_id: courseId, title, order_index })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };

    revalidatePath(`/dashboard/courses/${courseId}`);
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Errore" };
  }
}
