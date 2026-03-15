import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CourseListClient } from "./CourseListClient";

/**
 * /dashboard/courses — Lista corsi del trainer.
 * Server Component: fetch iniziale, poi passa dati al client per search/filter live.
 */
export default async function TrainerCoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["trainer", "admin"].includes(profile.role ?? "")) {
    redirect("/dashboard");
  }

  // Server-side initial fetch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: courses } = await (supabase as any)
    .from("courses")
    .select("id, title, description, category, level, cover_url, status, is_published, lessons_count, created_at, updated_at")
    .eq("created_by", user.id)
    .order("updated_at", { ascending: false });

  return <CourseListClient initialCourses={courses ?? []} userId={user.id} />;
}

export const metadata = {
  title: "I miei corsi — Agenfor Lab",
};
