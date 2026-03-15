"use client";

/**
 * useLessons — Lesson CRUD for the course editor.
 *
 * Keeps lesson list in sync with Supabase.
 * Reordering is done optimistically then confirmed server-side.
 */

import { useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { nanoid } from "nanoid";
import type { AuthoringLesson, LessonContent } from "../types";

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const DEFAULT_CONTENT: LessonContent = {
  version: 2,
  blocks: [],
};

export function useLessons(courseId: string) {
  const [saving, setSaving] = useState(false);

  // ─── Create lesson ─────────────────────────────────────────
  const createLesson = useCallback(
    async (opts: {
      title: string;
      moduleId?: string | null;
      existingLessons: AuthoringLesson[];
    }) => {
      const supabase = getClient();
      const maxOrder = opts.existingLessons.reduce(
        (max, l) => Math.max(max, l.order_index),
        -1
      );

      const { data, error } = await supabase
        .from("lessons")
        .insert({
          course_id: courseId,
          module_id: opts.moduleId ?? null,
          title: opts.title,
          content_type: "text",
          content_json: DEFAULT_CONTENT,
          order_index: maxOrder + 1,
          xp_reward: 50,
          is_published: false,
        })
        .select()
        .single();

      if (!error) {
        // Bump lessons_count on course
        await supabase.rpc("execute_sql" as never, {
          sql: `UPDATE courses SET lessons_count = lessons_count + 1 WHERE id = '${courseId}'`,
        }).then(() => {
          // Alternative: direct update
          supabase
            .from("courses")
            .select("lessons_count")
            .eq("id", courseId)
            .single()
            .then(({ data: cd }) => {
              if (cd) {
                supabase
                  .from("courses")
                  .update({ lessons_count: (cd.lessons_count ?? 0) + 1 })
                  .eq("id", courseId);
              }
            });
        });
      }

      return { data: data as AuthoringLesson | null, error: error?.message ?? null };
    },
    [courseId]
  );

  // ─── Update lesson metadata ────────────────────────────────
  const updateLesson = useCallback(
    async (lessonId: string, updates: Partial<AuthoringLesson>) => {
      setSaving(true);
      const supabase = getClient();

      const { error } = await supabase
        .from("lessons")
        .update(updates as Record<string, unknown>)
        .eq("id", lessonId);

      setSaving(false);
      return { error: error?.message ?? null };
    },
    []
  );

  // ─── Save content blocks ───────────────────────────────────
  const saveLessonContent = useCallback(
    async (lessonId: string, content: LessonContent) => {
      const supabase = getClient();
      const { error } = await supabase
        .from("lessons")
        .update({ content_json: content })
        .eq("id", lessonId);

      return { error: error?.message ?? null };
    },
    []
  );

  // ─── Delete lesson ─────────────────────────────────────────
  const deleteLesson = useCallback(async (lessonId: string) => {
    const supabase = getClient();
    const { error } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lessonId);

    if (!error) {
      // Decrement lessons_count
      const { data: cd } = await supabase
        .from("courses")
        .select("lessons_count")
        .eq("id", courseId)
        .single();
      if (cd) {
        await supabase
          .from("courses")
          .update({ lessons_count: Math.max(0, (cd.lessons_count ?? 1) - 1) })
          .eq("id", courseId);
      }
    }

    return { error: error?.message ?? null };
  }, [courseId]);

  // ─── Reorder lessons (move up/down) ───────────────────────
  // We use simple index swap rather than a full DnD library for MVP.
  // This returns the updated lesson array for optimistic UI.
  const reorderLessons = useCallback(
    async (lessons: AuthoringLesson[], fromIndex: number, toIndex: number) => {
      const updated = [...lessons];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);

      // Reassign order_index based on array position
      const reindexed = updated.map((l, i) => ({ ...l, order_index: i }));

      // Persist all order changes in parallel
      const supabase = getClient();
      await Promise.all(
        reindexed.map((l) =>
          supabase
            .from("lessons")
            .update({ order_index: l.order_index })
            .eq("id", l.id)
        )
      );

      return reindexed;
    },
    []
  );

  // ─── Publish/unpublish lesson ──────────────────────────────
  const toggleLessonPublished = useCallback(
    async (lessonId: string, currentState: boolean) => {
      const supabase = getClient();
      const { error } = await supabase
        .from("lessons")
        .update({ is_published: !currentState })
        .eq("id", lessonId);
      return { error: error?.message ?? null };
    },
    []
  );

  return {
    saving,
    createLesson,
    updateLesson,
    saveLessonContent,
    deleteLesson,
    reorderLessons,
    toggleLessonPublished,
  };
}

// ─── Block helpers (pure functions, no hooks) ─────────────────

export function createDefaultBlock(type: string): import("../types").ContentBlock {
  const id = nanoid(8);
  const base = { id, order: 0 };

  switch (type) {
    case "text":
      return { ...base, type: "text", content: { html: "<p>Inizia a scrivere...</p>", plain: "Inizia a scrivere..." } };
    case "image":
      return { ...base, type: "image", content: { url: "", alt: "", width: "full" } };
    case "video":
      return { ...base, type: "video", content: { url: "", provider: "youtube", title: "" } };
    case "quiz":
      return {
        ...base,
        type: "quiz",
        content: {
          questions: [],
          pass_threshold: 70,
          show_correct_answers: true,
          randomize_order: false,
        },
      };
    case "flip_card":
      return { ...base, type: "flip_card", content: { cards: [{ id: nanoid(6), front: "Fronte", back: "Retro" }], layout: "grid" } };
    case "steps":
      return { ...base, type: "steps", content: { steps: [{ id: nanoid(6), title: "Passo 1", description: "" }], numbered: true } };
    case "file":
      return { ...base, type: "file", content: { url: "", filename: "" } };
    default:
      return { ...base, type: "text", content: { html: "", plain: "" } };
  }
}
