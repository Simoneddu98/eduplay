import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CourseCreatorDashboard } from "@/features/course-creator/components/CourseCreatorDashboard";

/**
 * /crea-corso — Trainer's course management dashboard.
 *
 * Server component: checks auth + trainer role, then hands off to
 * the client-side CourseCreatorDashboard for all data fetching.
 */
export default async function CreaCorsoPage() {
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

  return <CourseCreatorDashboard userId={user.id} />;
}

export const metadata = {
  title: "Crea Corso — Agenfor Lab",
  description: "Crea e gestisci i tuoi corsi e-learning con assistenza AI",
};
