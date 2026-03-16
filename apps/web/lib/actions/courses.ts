"use server";

/**
 * Server Actions — Course CRUD
 *
 * Why Server Actions over API routes?
 * - Accesso diretto ai cookies Supabase senza fetch()
 * - TypeScript end-to-end: il client ottiene il tipo di ritorno
 * - Revalidazione automatica della cache Next.js
 * - Nessun endpoint HTTP da gestire
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ─── Result type per error handling uniforme ─────────────────
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ─── Helpers ─────────────────────────────────────────────────

async function requireTrainer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autenticato");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["trainer", "admin"].includes(profile.role ?? "")) {
    throw new Error("Accesso riservato ai trainer");
  }

  return { supabase, user };
}

// ─── CREATE ──────────────────────────────────────────────────

export async function createCourseAction(formData: {
  title: string;
  description?: string;
  category: string;
  level: string;
  learning_objectives?: string[];
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, user } = await requireTrainer();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("courses")
      .insert({
        title: formData.title,
        description: formData.description ?? null,
        category: formData.category,
        level: formData.level,
        learning_objectives: formData.learning_objectives ?? [],
        created_by: user.id,
        status: "draft",
        is_published: false,
        xp_reward: 100,
        coin_reward: 50,
        passing_score: 70,
        lessons_count: 0,
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };

    revalidatePath("/dashboard/courses");
    revalidatePath("/crea-corso");
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Errore imprevisto" };
  }
}

// ─── UPDATE ──────────────────────────────────────────────────

export async function updateCourseAction(
  courseId: string,
  updates: {
    title?: string;
    description?: string;
    category?: string;
    level?: string;
    cover_url?: string;
    learning_objectives?: string[];
    passing_score?: number;
    certificate_on_completion?: boolean;
    estimated_duration_minutes?: number;
    xp_reward?: number;
    coin_reward?: number;
  }
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireTrainer();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("courses")
      .update(updates)
      .eq("id", courseId)
      .eq("created_by", user.id);

    if (error) return { ok: false, error: error.message };

    revalidatePath(`/dashboard/courses/${courseId}`);
    revalidatePath("/dashboard/courses");
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Errore imprevisto" };
  }
}

// ─── PUBLISH / UNPUBLISH ──────────────────────────────────────

export async function publishCourseAction(courseId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireTrainer();

    // Check has at least one lesson
    const { count } = await supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId);

    if (!count || count === 0) {
      return { ok: false, error: "Aggiungi almeno una lezione prima di pubblicare" };
    }

    const { error } = await supabase
      .from("courses")
      .update({ status: "published", is_published: true })
      .eq("id", courseId)
      .eq("created_by", user.id);

    if (error) return { ok: false, error: error.message };

    revalidatePath(`/dashboard/courses/${courseId}`);
    revalidatePath("/dashboard/courses");
    revalidatePath("/courses");
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Errore imprevisto" };
  }
}

export async function unpublishCourseAction(courseId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireTrainer();

    const { error } = await supabase
      .from("courses")
      .update({ status: "draft", is_published: false })
      .eq("id", courseId)
      .eq("created_by", user.id);

    if (error) return { ok: false, error: error.message };

    revalidatePath(`/dashboard/courses/${courseId}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Errore imprevisto" };
  }
}

// ─── DELETE ──────────────────────────────────────────────────

export async function deleteCourseAction(courseId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireTrainer();

    // Only drafts can be deleted
    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("id", courseId)
      .eq("created_by", user.id)
      .eq("status", "draft");

    if (error) return { ok: false, error: error.message };

    revalidatePath("/dashboard/courses");
    revalidatePath("/crea-corso");
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Errore imprevisto" };
  }
}

// ─── DUPLICATE ───────────────────────────────────────────────

export async function duplicateCourseAction(courseId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, user } = await requireTrainer();

    const { data: source } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();

    if (!source) return { ok: false, error: "Corso non trovato" };

    const { data: copy, error } = await supabase
      .from("courses")
      .insert({
        ...source,
        id: undefined,
        title: `${source.title} (copia)`,
        status: "draft",
        is_published: false,
        created_by: user.id,
        lessons_count: 0,
        created_at: undefined,
        updated_at: undefined,
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };

    revalidatePath("/dashboard/courses");
    return { ok: true, data: { id: copy.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Errore imprevisto" };
  }
}

// ─── CATEGORY SUGGESTIONS ─────────────────────────────────────

/**
 * Restituisce le categorie già usate dal trainer (e dal sistema) per
 * alimentare l'autocomplete di CategoryInput. Nessuna lista hardcoded.
 */
export async function getCategorySuggestionsAction(): Promise<ActionResult<string[]>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: true, data: [] };

    // Fetch distinct categories from all published + trainer's own courses
    const { data } = await supabase
      .from("courses")
      .select("category")
      .not("category", "is", null)
      .order("updated_at", { ascending: false });

    const unique = [
      ...new Set((data ?? []).map((r) => r.category).filter(Boolean) as string[]),
    ];
    return { ok: true, data: unique.slice(0, 20) };
  } catch {
    return { ok: true, data: [] };
  }
}
