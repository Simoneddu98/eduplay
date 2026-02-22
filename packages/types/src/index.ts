export type { Database, Json } from "./database";

// ─── Profile Types ─────────────────────────────────────────────────────────
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
export type Enrollment = Database["public"]["Tables"]["enrollments"]["Row"];
export type LessonCompletion = Database["public"]["Tables"]["lesson_completions"]["Row"];
export type Badge = Database["public"]["Tables"]["badges"]["Row"];
export type UserBadge = Database["public"]["Tables"]["user_badges"]["Row"];
export type Mission = Database["public"]["Tables"]["missions"]["Row"];
export type UserMission = Database["public"]["Tables"]["user_missions"]["Row"];
export type XpLog = Database["public"]["Tables"]["xp_logs"]["Row"];
export type QuizAttempt = Database["public"]["Tables"]["quiz_attempts"]["Row"];
export type AiChatSession = Database["public"]["Tables"]["ai_chat_sessions"]["Row"];
export type LeaderboardRow = Database["public"]["Views"]["leaderboard_global"]["Row"];

// ─── Gamification ──────────────────────────────────────────────────────────
export interface LevelInfo {
  level: number;
  name: string;
  minXP: number;
  maxXP: number;
  color: string;
}

export const LEVELS: LevelInfo[] = [
  { level: 1, name: "Novizio",      minXP: 0,     maxXP: 499,   color: "#9CA3AF" },
  { level: 2, name: "Apprendista",  minXP: 500,   maxXP: 1499,  color: "#60A5FA" },
  { level: 3, name: "Praticante",   minXP: 1500,  maxXP: 3499,  color: "#34D399" },
  { level: 4, name: "Esperto",      minXP: 3500,  maxXP: 7499,  color: "#F59E0B" },
  { level: 5, name: "Master",       minXP: 7500,  maxXP: 14999, color: "#8B5CF6" },
  { level: 6, name: "Guru",         minXP: 15000, maxXP: 99999, color: "#EF4444" },
];

// ─── Quiz Types ────────────────────────────────────────────────────────────
export interface QuizQuestion {
  id: string;
  text: string;
  type: "single" | "multiple" | "true_false" | "open";
  options?: { id: string; text: string }[];
  correct_ids?: string[];
  explanation?: string;
  xp_reward?: number;
}

export interface QuizContent {
  questions: QuizQuestion[];
  pass_threshold: number; // 0-100
  time_limit_seconds?: number;
}

// ─── AI Types ──────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

// ─── Course with Relations ─────────────────────────────────────────────────
export interface CourseWithLessons extends Course {
  lessons: Lesson[];
}

export interface EnrollmentWithCourse extends Enrollment {
  course: Course;
}

export interface UserBadgeWithBadge extends UserBadge {
  badge: Badge;
}

export interface UserMissionWithMission extends UserMission {
  mission: Mission;
}
