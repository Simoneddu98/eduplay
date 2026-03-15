/**
 * Course Creator Types
 *
 * Content blocks are the atomic unit of lesson content.
 * They live as JSONB in lessons.content_json, giving us full
 * flexibility to add new types without DB migrations.
 *
 * Design principle: each block is self-contained — it carries
 * all the data needed to render AND edit itself.
 */

// ─── Content Block Types ────────────────────────────────────

export type ContentBlockType =
  | "text"
  | "image"
  | "video"
  | "quiz"
  | "flip_card"
  | "steps"
  | "file";

export interface BaseBlock {
  id: string;
  type: ContentBlockType;
  order: number;
}

export interface TextBlock extends BaseBlock {
  type: "text";
  content: {
    html: string;    // stored as HTML for rich display
    plain: string;   // used for AI context / search
  };
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  content: {
    url: string;
    alt: string;
    caption?: string;
    storage_path?: string; // Supabase Storage path for deletion
    width?: "full" | "half" | "third";
  };
}

export interface VideoBlock extends BaseBlock {
  type: "video";
  content: {
    url: string;
    embed_url?: string; // computed: youtube nocookie URL etc.
    provider: "youtube" | "vimeo" | "direct";
    title?: string;
    thumbnail?: string;
  };
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  type: "single" | "multiple" | "true_false";
  options: QuizOption[];
  correct_ids: string[];
  explanation?: string;
}

export interface QuizBlock extends BaseBlock {
  type: "quiz";
  content: {
    questions: QuizQuestion[];
    pass_threshold: number;       // 0-100
    show_correct_answers: boolean;
    randomize_order: boolean;
  };
}

export interface FlipCard {
  id: string;
  front: string;
  back: string;
}

export interface FlipCardBlock extends BaseBlock {
  type: "flip_card";
  content: {
    cards: FlipCard[];
    layout: "grid" | "stack";
  };
}

export interface Step {
  id: string;
  title: string;
  description: string;
  image_url?: string;
}

export interface StepsBlock extends BaseBlock {
  type: "steps";
  content: {
    steps: Step[];
    numbered: boolean;
  };
}

export interface FileBlock extends BaseBlock {
  type: "file";
  content: {
    url: string;
    filename: string;
    size_bytes?: number;
    mime_type?: string;
    storage_path?: string;
  };
}

// Discriminated union — TypeScript narrows type by block.type
export type ContentBlock =
  | TextBlock
  | ImageBlock
  | VideoBlock
  | QuizBlock
  | FlipCardBlock
  | StepsBlock
  | FileBlock;

// ─── Lesson Content Container ───────────────────────────────

export interface LessonContent {
  version: 2;
  blocks: ContentBlock[];
}

// ─── Course Module ──────────────────────────────────────────

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  lessons?: AuthoringLesson[];
}

// ─── Lesson (authoring perspective) ────────────────────────

export interface AuthoringLesson {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  content_type: "video" | "text" | "quiz" | "interactive";
  content_json: LessonContent | null;
  youtube_url: string | null;
  xp_reward: number;
  order_index: number;
  duration_minutes: number | null;
  is_published: boolean;
  updated_at: string | null;
}

// ─── Course (authoring perspective) ────────────────────────

export interface AuthoringCourse {
  id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  category: string;
  level: string;
  cover_url: string | null;
  learning_objectives: string[];
  passing_score: number;
  certificate_on_completion: boolean;
  status: "draft" | "review" | "published" | "archived";
  estimated_duration_minutes: number | null;
  xp_reward: number;
  coin_reward: number;
  ai_generated_outline: AIOutline | null;
  is_published: boolean;
  lessons_count: number;
  created_at: string;
  updated_at: string | null;
  modules: CourseModule[];
  lessons: AuthoringLesson[]; // flat list (lessons not in any module)
}

// ─── Wizard ─────────────────────────────────────────────────

export type WizardStep = "info" | "ai_assist" | "structure" | "ready";

export interface CourseWizardData {
  title: string;
  description: string;
  category: "digital-marketing" | "ai" | "sales" | string;
  level: "base" | "intermediate" | "advanced";
  cover_url: string;
  learning_objectives: string[];
  // AI context fields
  ai_topic: string;
  ai_audience: string;
  ai_duration_hours: number;
}

// ─── AI Types ───────────────────────────────────────────────

export interface AIOutlineModule {
  title: string;
  description: string;
  lessons: Array<{
    title: string;
    description: string;
    content_type: "video" | "text" | "quiz" | "interactive";
    duration_minutes: number;
    key_points: string[];
  }>;
}

export interface AIOutline {
  course_title: string;
  course_description: string;
  learning_objectives: string[];
  total_duration_hours: number;
  modules: AIOutlineModule[];
}

// ─── Autosave ───────────────────────────────────────────────

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline";

export interface PendingChange {
  type: "course" | "lesson";
  id: string;
  data: Record<string, unknown>;
  timestamp: number;
}

// ─── UI State ───────────────────────────────────────────────

export interface EditorUIState {
  selectedLessonId: string | null;
  isSettingsOpen: boolean;
  isAIPanelOpen: boolean;
  activeBlockId: string | null;
  isDragging: boolean;
}

// ─── Block metadata (for the block picker UI) ───────────────

export interface BlockMeta {
  type: ContentBlockType;
  label: string;
  labelIt: string;      // Italian label
  description: string;
  icon: string;         // Lucide icon name
  color: string;        // Tailwind bg color class
  defaultContent: ContentBlock["content"];
}
