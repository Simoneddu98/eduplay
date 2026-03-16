import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { CourseSettingsPageClient } from "./CourseSettingsPageClient";

interface Props { params: Promise<{ id: string }> }

export default async function CourseSettingsPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["trainer", "admin"].includes(profile?.role ?? "")) {
    redirect("/dashboard");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: course } = await (supabase as any)
    .from("courses")
    .select(`
      id, title, description, category, level, status, is_published,
      cover_url, xp_reward, coin_reward, passing_score, certificate_on_completion,
      estimated_duration_minutes, learning_objectives, created_by, lessons_count
    `)
    .eq("id", id)
    .single();

  if (!course) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isOwner = (course as any).created_by === user.id;
  const isAdmin = profile?.role === "admin";
  if (!isOwner && !isAdmin) redirect("/dashboard/courses");

  return (
    <CourseSettingsPageClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      course={course as any}
      editorHref={`/dashboard/courses/${id}`}
      analyticsHref={`/dashboard/courses/${id}/analytics`}
    />
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return { title: `Impostazioni corso — EduPlay` };
}
