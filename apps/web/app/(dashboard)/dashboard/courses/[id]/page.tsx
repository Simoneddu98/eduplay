import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { CourseEditor } from "@/features/course-creator/components/CourseEditor";

interface Props { params: Promise<{ id: string }> }

/**
 * /dashboard/courses/[id] — Editor corso.
 * Verifica ownership poi rimanda al CourseEditor già costruito.
 * Redirect semantico: /dashboard/courses/[id] → usa CourseEditor identico a /crea-corso/[id].
 */
export default async function DashboardCourseEditorPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: course } = await (supabase as any)
    .from("courses")
    .select("id, title, created_by")
    .eq("id", id)
    .single();

  if (!course) notFound();

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((course as any).created_by !== user.id && !isAdmin) redirect("/dashboard/courses");

  return <CourseEditor courseId={id} />;
}
