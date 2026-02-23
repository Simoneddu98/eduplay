import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  TrendingUp,
  Sparkles,
  Megaphone,
  Bot,
  ShoppingCart,
  Search,
} from "lucide-react";

const CATEGORY_CONFIG: Record<string, { label: string; gradient: string; icon: string; chip: string }> = {
  "digital-marketing": {
    label: "Digital Marketing",
    gradient: "from-blue-600 to-blue-400",
    icon: "megaphone",
    chip: "bg-blue-100 text-blue-700 border-blue-200",
  },
  ai: {
    label: "Intelligenza Artificiale",
    gradient: "from-purple-600 to-violet-400",
    icon: "bot",
    chip: "bg-purple-100 text-purple-700 border-purple-200",
  },
  sales: {
    label: "Vendite",
    gradient: "from-green-600 to-emerald-400",
    icon: "cart",
    chip: "bg-green-100 text-green-700 border-green-200",
  },
};

const LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
  base: { label: "Base", color: "bg-blue-100 text-blue-700" },
  intermediate: { label: "Intermedio", color: "bg-amber-100 text-amber-700" },
  advanced: { label: "Avanzato", color: "bg-red-100 text-red-700" },
};

function CategoryIcon({ category, className }: { category: string; className?: string }) {
  switch (category) {
    case "digital-marketing":
      return <Megaphone className={className} />;
    case "ai":
      return <Bot className={className} />;
    case "sales":
      return <ShoppingCart className={className} />;
    default:
      return <BookOpen className={className} />;
  }
}

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
          .select("*")
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const enrolledMap = new Map(
    (enrollments ?? []).map((e: any) => [e.course_id, e.progress_pct])
  );

  const allCourses = courses ?? [];
  const categories = [...new Set(allCourses.map((c: any) => c.category ?? "other"))];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="glass-card p-6 md:p-8 animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-blue-900">
              Catalogo Corsi
            </h1>
            <p className="text-slate-500 mt-1">
              {allCourses.length} corsi su Digital Marketing, AI e Sales
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-semibold text-blue-900">
              Guadagna XP completando i corsi
            </span>
          </div>
        </div>

        {/* Category filter chips */}
        <div className="flex flex-wrap gap-2 mt-5">
          <span className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-800 text-white cursor-pointer transition-all duration-200">
            Tutti
          </span>
          {categories.map((cat) => {
            const config = CATEGORY_CONFIG[cat] ?? { label: cat, chip: "bg-gray-100 text-gray-700 border-gray-200" };
            return (
              <span
                key={cat}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border cursor-pointer transition-all duration-200 hover:shadow-sm ${config.chip}`}
              >
                {config.label}
              </span>
            );
          })}
        </div>

        {/* Difficulty filter */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-xs text-slate-400 font-medium mr-1">Difficolta:</span>
          {Object.entries(LEVEL_CONFIG).map(([key, val]) => (
            <span
              key={key}
              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all duration-200 ${val.color}`}
            >
              {val.label}
            </span>
          ))}
        </div>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allCourses.map((course: any, idx: number) => {
          const progress = enrolledMap.get(course.id);
          const isEnrolled = progress !== undefined;
          const catConfig = CATEGORY_CONFIG[course.category] ?? {
            label: course.category,
            gradient: "from-gray-600 to-gray-400",
            icon: "book",
            chip: "bg-gray-100 text-gray-700",
          };
          const levelConfig = LEVEL_CONFIG[course.level] ?? { label: course.level, color: "bg-gray-100 text-gray-600" };

          return (
            <div
              key={course.id}
              className="card-hover flex flex-col overflow-hidden animate-fade-in-up"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              {/* Category header gradient */}
              <div className={`h-32 bg-gradient-to-br ${catConfig.gradient} p-5 flex items-end justify-between`}>
                <CategoryIcon category={course.category} className="w-8 h-8 text-white/80" />
                {course.xp_reward && (
                  <span className="badge-xp">
                    <TrendingUp className="w-3 h-3" />
                    +{course.xp_reward} XP
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col flex-1">
                {/* Badges row */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${levelConfig.color}`}>
                    {levelConfig.label}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${catConfig.chip}`}>
                    {catConfig.label}
                  </span>
                </div>

                <h3 className="font-bold text-blue-900 text-lg mb-1 line-clamp-2">{course.title}</h3>
                <p className="text-sm text-slate-500 flex-1 line-clamp-2 mb-3">{course.description}</p>

                {/* Meta row */}
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  {course.duration_hours && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {course.duration_hours}h
                    </span>
                  )}
                  {course.lessons_count && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      {course.lessons_count} lezioni
                    </span>
                  )}
                </div>

                {/* Progress bar (if enrolled) */}
                {isEnrolled && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-500 font-medium">Progresso</span>
                      <span className="text-blue-800 font-bold">{progress}%</span>
                    </div>
                    <div className="xp-bar">
                      <div
                        className="xp-bar-fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* CTA */}
                <div className="mt-4">
                  <Link
                    href={`/courses/${course.id}`}
                    className={`${isEnrolled ? "btn-primary" : "btn-cta"} w-full text-center block`}
                  >
                    {isEnrolled ? "Continua" : "Inizia Gratis"}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {allCourses.length === 0 && (
        <div className="glass-card p-12 text-center animate-fade-in-up">
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <Search className="w-10 h-10 text-blue-300" />
          </div>
          <h3 className="text-lg font-bold text-blue-900 mb-1">Nessun corso disponibile</h3>
          <p className="text-slate-500">Nuovi corsi in arrivo. Torna presto!</p>
        </div>
      )}
    </div>
  );
}
