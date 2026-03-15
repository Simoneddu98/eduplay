"use client";

/**
 * useCourse — Supabase data layer for course authoring.
 *
 * Separates server state (Supabase) from local UI state so the
 * editor can stay responsive while changes queue up for autosave.
 */

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { AuthoringCourse, CourseModule, AuthoringLesson } from "../types";

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── Fetch ──────────────────────────────────────────────────

export function useCourse(courseId: string | null) {
  const [course, setCourse] = useState<AuthoringCourse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCourse = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = getClient();

      // Fetch course + modules + lessons in parallel
      const [courseRes, modulesRes, lessonsRes] = await Promise.all([
        supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .single(),
        supabase
          .from("course_modules")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index"),
        supabase
          .from("lessons")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index"),
      ]);

      if (courseRes.error) throw new Error(courseRes.error.message);

      const modules: CourseModule[] = (modulesRes.data ?? []).map((m) => ({
        ...m,
        lessons: (lessonsRes.data ?? []).filter((l) => l.module_id === m.id),
      }));

      const flatLessons: AuthoringLesson[] = (lessonsRes.data ?? []).filter(
        (l) => l.module_id === null
      );

      setCourse({
        ...courseRes.data,
        learning_objectives: courseRes.data.learning_objectives ?? [],
        status: courseRes.data.status ?? "draft",
        modules,
        lessons: flatLessons,
      } as AuthoringCourse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore caricamento corso");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  // ─── Mutations ───────────────────────────────────────────

  const updateCourse = useCallback(
    async (updates: Partial<AuthoringCourse>) => {
      if (!courseId) return { error: "No course ID" };
      const supabase = getClient();

      // Optimistic update
      setCourse((prev) => (prev ? { ...prev, ...updates } : prev));

      const { error } = await supabase
        .from("courses")
        .update(updates as Record<string, unknown>)
        .eq("id", courseId);

      if (error) {
        // Rollback on error
        fetchCourse();
        return { error: error.message };
      }
      return { error: null };
    },
    [courseId, fetchCourse]
  );

  const publishCourse = useCallback(async () => {
    if (!courseId) return { error: "No course ID" };
    const supabase = getClient();

    const { error } = await supabase
      .from("courses")
      .update({ status: "published", is_published: true })
      .eq("id", courseId);

    if (!error) {
      setCourse((prev) => prev ? { ...prev, status: "published", is_published: true } : prev);
    }

    return { error: error?.message ?? null };
  }, [courseId]);

  const unpublishCourse = useCallback(async () => {
    if (!courseId) return { error: "No course ID" };
    const supabase = getClient();

    const { error } = await supabase
      .from("courses")
      .update({ status: "draft", is_published: false })
      .eq("id", courseId);

    if (!error) {
      setCourse((prev) => prev ? { ...prev, status: "draft", is_published: false } : prev);
    }

    return { error: error?.message ?? null };
  }, [courseId]);

  // ─── Module mutations ─────────────────────────────────────

  const createModule = useCallback(
    async (title: string) => {
      if (!courseId) return { data: null, error: "No course ID" };
      const supabase = getClient();

      const maxOrder = course?.modules.reduce(
        (max, m) => Math.max(max, m.order_index),
        -1
      ) ?? -1;

      const { data, error } = await supabase
        .from("course_modules")
        .insert({ course_id: courseId, title, order_index: maxOrder + 1 })
        .select()
        .single();

      if (!error && data) {
        setCourse((prev) =>
          prev
            ? { ...prev, modules: [...prev.modules, { ...data, lessons: [] }] }
            : prev
        );
      }

      return { data, error: error?.message ?? null };
    },
    [courseId, course]
  );

  const deleteModule = useCallback(
    async (moduleId: string) => {
      const supabase = getClient();
      const { error } = await supabase
        .from("course_modules")
        .delete()
        .eq("id", moduleId);

      if (!error) {
        setCourse((prev) =>
          prev
            ? { ...prev, modules: prev.modules.filter((m) => m.id !== moduleId) }
            : prev
        );
      }

      return { error: error?.message ?? null };
    },
    []
  );

  return {
    course,
    loading,
    error,
    refetch: fetchCourse,
    updateCourse,
    publishCourse,
    unpublishCourse,
    createModule,
    deleteModule,
    // Expose local setter for optimistic updates from child components
    setCourse,
  };
}

// ─── Create course (used in wizard) ─────────────────────────

export async function createCourse(data: {
  title: string;
  description: string;
  category: string;
  level: string;
  cover_url?: string;
  learning_objectives?: string[];
  created_by: string;
}) {
  const supabase = getClient();

  const { data: course, error } = await supabase
    .from("courses")
    .insert({
      title: data.title,
      description: data.description,
      category: data.category,
      level: data.level,
      cover_url: data.cover_url ?? null,
      learning_objectives: data.learning_objectives ?? [],
      created_by: data.created_by,
      status: "draft",
      is_published: false,
      xp_reward: 100,
      coin_reward: 50,
      passing_score: 70,
      lessons_count: 0,
    })
    .select()
    .single();

  return { data: course, error: error?.message ?? null };
}

// ─── Fetch trainer's course list ─────────────────────────────

export function useTrainerCourses() {
  const [courses, setCourses] = useState<AuthoringCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    const supabase = getClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Non autenticato");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("created_by", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setCourses(
        (data ?? []).map((c) => ({
          ...c,
          modules: [],
          lessons: [],
          learning_objectives: c.learning_objectives ?? [],
          status: c.status ?? "draft",
        })) as AuthoringCourse[]
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const deleteCourse = useCallback(async (courseId: string) => {
    const supabase = getClient();
    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("id", courseId);

    if (!error) {
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    }
    return { error: error?.message ?? null };
  }, []);

  return { courses, loading, error, refetch: fetchCourses, deleteCourse };
}
