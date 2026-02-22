export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: "student" | "admin";
          xp_total: number;
          level: number;
          edu_coins: number;
          streak_current: number;
          streak_longest: number;
          last_activity_at: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "student" | "admin";
          xp_total?: number;
          level?: number;
          edu_coins?: number;
          streak_current?: number;
          streak_longest?: number;
          last_activity_at?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "student" | "admin";
          xp_total?: number;
          level?: number;
          edu_coins?: number;
          streak_current?: number;
          streak_longest?: number;
          last_activity_at?: string | null;
          bio?: string | null;
          updated_at?: string;
        };
      };

      courses: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          category: "digital-marketing" | "ai" | "sales";
          level: "base" | "intermediate" | "advanced";
          cover_url: string | null;
          price_cents: number;
          xp_reward: number;
          coin_reward: number;
          duration_hours: number | null;
          lessons_count: number;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          category: "digital-marketing" | "ai" | "sales";
          level: "base" | "intermediate" | "advanced";
          cover_url?: string | null;
          price_cents?: number;
          xp_reward?: number;
          coin_reward?: number;
          duration_hours?: number | null;
          lessons_count?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          category?: "digital-marketing" | "ai" | "sales";
          level?: "base" | "intermediate" | "advanced";
          cover_url?: string | null;
          price_cents?: number;
          xp_reward?: number;
          coin_reward?: number;
          duration_hours?: number | null;
          lessons_count?: number;
          is_published?: boolean;
          updated_at?: string;
        };
      };

      lessons: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          content_type: "video" | "text" | "quiz" | "interactive";
          youtube_url: string | null;
          content_json: Json | null;
          xp_reward: number;
          order_index: number;
          duration_minutes: number | null;
          is_published: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          description?: string | null;
          content_type: "video" | "text" | "quiz" | "interactive";
          youtube_url?: string | null;
          content_json?: Json | null;
          xp_reward?: number;
          order_index: number;
          duration_minutes?: number | null;
          is_published?: boolean;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          content_type?: "video" | "text" | "quiz" | "interactive";
          youtube_url?: string | null;
          content_json?: Json | null;
          xp_reward?: number;
          order_index?: number;
          duration_minutes?: number | null;
          is_published?: boolean;
        };
      };

      enrollments: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          progress_pct: number;
          completed_at: string | null;
          enrolled_at: string;
          stripe_payment_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          progress_pct?: number;
          completed_at?: string | null;
          enrolled_at?: string;
          stripe_payment_id?: string | null;
        };
        Update: {
          progress_pct?: number;
          completed_at?: string | null;
        };
      };

      lesson_completions: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          course_id: string;
          score: number | null;
          xp_earned: number;
          completed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          course_id: string;
          score?: number | null;
          xp_earned: number;
          completed_at?: string;
        };
        Update: {
          score?: number | null;
          xp_earned?: number;
        };
      };

      xp_logs: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          reason: string;
          reference_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          reason: string;
          reference_id?: string | null;
          created_at?: string;
        };
        Update: never;
      };

      badges: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon_url: string | null;
          category: string;
          xp_reward: number;
          coin_reward: number;
          condition_type: string;
          condition_value: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          icon_url?: string | null;
          category: string;
          xp_reward?: number;
          coin_reward?: number;
          condition_type: string;
          condition_value: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
          icon_url?: string | null;
          xp_reward?: number;
          coin_reward?: number;
        };
      };

      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          earned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_id: string;
          earned_at?: string;
        };
        Update: never;
      };

      missions: {
        Row: {
          id: string;
          title: string;
          description: string;
          type: "daily" | "weekly" | "special";
          xp_reward: number;
          coin_reward: number;
          condition_type: string;
          condition_value: number;
          is_active: boolean;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          type: "daily" | "weekly" | "special";
          xp_reward?: number;
          coin_reward?: number;
          condition_type: string;
          condition_value: number;
          is_active?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          xp_reward?: number;
          coin_reward?: number;
          is_active?: boolean;
          expires_at?: string | null;
        };
      };

      user_missions: {
        Row: {
          id: string;
          user_id: string;
          mission_id: string;
          progress: number;
          completed_at: string | null;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mission_id: string;
          progress?: number;
          completed_at?: string | null;
          assigned_at?: string;
        };
        Update: {
          progress?: number;
          completed_at?: string | null;
        };
      };

      quiz_attempts: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          answers: Json;
          score: number;
          passed: boolean;
          time_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          answers: Json;
          score: number;
          passed: boolean;
          time_seconds?: number | null;
          created_at?: string;
        };
        Update: never;
      };

      ai_chat_sessions: {
        Row: {
          id: string;
          user_id: string;
          course_id: string | null;
          messages: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id?: string | null;
          messages?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          messages?: Json;
          updated_at?: string;
        };
      };
    };

    Views: {
      leaderboard_global: {
        Row: {
          rank: number;
          user_id: string;
          full_name: string | null;
          avatar_url: string | null;
          level: number;
          xp_total: number;
        };
      };
    };

    Functions: {
      award_xp: {
        Args: { p_user_id: string; p_amount: number; p_reason: string; p_reference_id?: string };
        Returns: { new_xp: number; new_level: number; leveled_up: boolean };
      };
      check_and_award_badges: {
        Args: { p_user_id: string };
        Returns: { badge_id: string; badge_name: string }[];
      };
    };

    Enums: {
      user_role: "student" | "admin";
      course_category: "digital-marketing" | "ai" | "sales";
      course_level: "base" | "intermediate" | "advanced";
      content_type: "video" | "text" | "quiz" | "interactive";
      mission_type: "daily" | "weekly" | "special";
    };
  };
}
