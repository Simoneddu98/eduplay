import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { CourseEditor } from "@/features/course-creator/components/CourseEditor";

interface Props {
  params: Promise<{ courseId: string }>;
}

/**
 * /crea-corso/[courseId] — The main course editor.
 *
 * Server component: validates auth + ownership, then renders
 * the full-screen CourseEditor client component.
 */
export default async function CourseEditorPage({ params }: Props) {
  const { courseId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify ownership
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, created_by, status")
    .eq("id", courseId)
    .single();

  if (!course) notFound();

  // Allow admin access too
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isOwner = (course as any).created_by === user.id;
  const isAdmin = profile?.role === "admin";

  if (!isOwner && !isAdmin) {
    redirect("/crea-corso");
  }

  // Full-screen editor (no dashboard layout chrome)
  return <CourseEditor courseId={courseId} />;
}

export async function generateMetadata({ params }: Props) {
  const { courseId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("title").eq("id", courseId).single();
  return {
    title: data?.title ? `${data.title} — Editor` : "Editor corso",
  };
}
