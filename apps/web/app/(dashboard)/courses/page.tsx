import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { BookOpen, Clock, Star, Users } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  "digital-marketing": "bg-blue-100 text-blue-700",
  "ai": "bg-purple-100 text-purple-700",
  "sales": "bg-green-100 text-green-700",
};

const CATEGORY_LABELS: Record<string, string> = {
  "digital-marketing": "Digital Marketing",
  "ai": "Intelligenza Artificiale",
  "sales": "Vendite",
};

const LEVEL_COLORS: Record<string, string> = {
  base: "bg-gray-100 text-gray-600",
  intermediate: "bg-yellow-100 text-yellow-700",
  advanced: "bg-red-100 text-red-700",
};

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: courses }, { data: enrollments }] = await Promise.all([
    supabase
      .from("courses")
      .select("*")
      .eq("is_published", true)
      .order("category", { ascending: true }),
    user
      ? supabase
          .from("enrollments")
          .select("course_id, progress_pct")
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const enrolledMap = new Map(
    (enrollments ?? []).map((e: any) => [e.course_id, e.progress_pct])
  );

  const grouped = (courses ?? []).reduce((acc: any, course: any) => {
    const cat = course.category ?? "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(course);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Catalogo Corsi</h1>
        <p className="text-gray-500 mt-1">7 corsi su Digital Marketing, AI e Sales</p>
      </div>

      {/* Categories */}
      {Object.entries(grouped).map(([category, categoryCourses]) => (
        <section key={category}>
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${CATEGORY_COLORS[category] ?? "bg-gray-100 text-gray-600"}`}>
              {CATEGORY_LABELS[category] ?? category}
            </span>
            <span className="text-sm text-gray-400">{(categoryCourses as any[]).length} corsi</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(categoryCourses as any[]).map((course: any) => {
              const progress = enrolledMap.get(course.id);
              const isEnrolled = progress !== undefined;

              return (
                <div key={course.id} className="card card-hover flex flex-col">
                  {/* Cover */}
                  <div className="h-40 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl mb-4 overflow-hidden flex items-center justify-center">
                    {course.cover_url ? (
                      <img src={course.cover_url} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="w-12 h-12 text-primary/30" />
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${LEVEL_COLORS[course.level] ?? "bg-gray-100 text-gray-600"}`}>
                      {course.level === "base" ? "Base" : course.level === "intermediate" ? "Intermedio" : "Avanzato"}
                    </span>
                    {course.xp_reward && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">
                        +{course.xp_reward} XP
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-gray-900 text-lg mb-1">{course.title}</h3>
                  <p className="text-sm text-gray-500 flex-1 line-clamp-2">{course.description}</p>

                  {/* Meta */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                    {course.duration_hours && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {course.duration_hours}h
                      </span>
                    )}
                    {course.lessons_count && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {course.lessons_count} lezioni
                      </span>
                    )}
                  </div>

                  {/* Progress (if enrolled) */}
                  {isEnrolled && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progresso</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="mt-4">
                    <Link
                      href={`/courses/${course.id}`}
                      className={isEnrolled ? "btn-primary w-full text-center" : "btn-outline w-full text-center"}
                    >
                      {isEnrolled ? "Continua" : "Scopri il corso"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Empty state */}
      {(!courses || courses.length === 0) && (
        <div className="text-center py-20">
          <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500">Nessun corso disponibile al momento.</p>
        </div>
      )}
    </div>
  );
}
