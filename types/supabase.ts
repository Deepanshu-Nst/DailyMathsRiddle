/**
 * Supabase Database type definitions — Phase 1 + Phase 2.
 *
 * Generate fresh types any time with:
 *   npx supabase gen types typescript --project-id <project-id> > types/supabase.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      // ── Phase 1 ──────────────────────────────────────────────
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: 'user' | 'moderator' | 'admin';
          streak_count: number;
          xp: number;
          created_at: string;
          updated_at: string;
          username: string | null;
          username_updated_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'user' | 'moderator' | 'admin';
          streak_count?: number;
          xp?: number;
          created_at?: string;
          updated_at?: string;
          username?: string | null;
          username_updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'user' | 'moderator' | 'admin';
          streak_count?: number;
          xp?: number;
          created_at?: string;
          updated_at?: string;
          username?: string | null;
          username_updated_at?: string | null;
        };
      };

      // ── Phase 2 ──────────────────────────────────────────────
      riddles: {
        Row: {
          id: string;
          slug: string;
          question: string;
          answer: string;
          answer_variants: string[];
          hint1: string;
          hint2: string;
          explanation: string;
          difficulty: 'easy' | 'medium' | 'hard';
          category: string;
          source_type: 'ai' | 'admin';
          is_daily: boolean;
          daily_date: string | null;
          status: 'draft' | 'published';
          created_by: string | null;
          validation_score: number | null;
          generator_model: string | null;
          generation_mode: string | null;
          template_family: string | null;
          created_at: string;
          is_invalid: boolean;
        };
        Insert: {
          id?: string;
          slug: string;
          question: string;
          answer: string;
          answer_variants?: string[];
          hint1?: string;
          hint2?: string;
          explanation: string;
          difficulty: 'easy' | 'medium' | 'hard';
          category?: string;
          source_type?: 'ai' | 'admin';
          is_daily?: boolean;
          daily_date?: string | null;
          status?: 'draft' | 'published';
          created_by?: string | null;
          validation_score?: number | null;
          generator_model?: string | null;
          generation_mode?: string | null;
          template_family?: string | null;
          created_at?: string;
          is_invalid?: boolean;
        };
        Update: {
          id?: string;
          slug?: string;
          question?: string;
          answer?: string;
          answer_variants?: string[];
          hint1?: string;
          hint2?: string;
          explanation?: string;
          difficulty?: 'easy' | 'medium' | 'hard';
          category?: string;
          source_type?: 'ai' | 'admin';
          is_daily?: boolean;
          daily_date?: string | null;
          status?: 'draft' | 'published';
          created_by?: string | null;
          validation_score?: number | null;
          generator_model?: string | null;
          generation_mode?: string | null;
          template_family?: string | null;
          created_at?: string;
          is_invalid?: boolean;
        };
      };

      challenge_submissions: {
        Row: {
          id: string;
          user_id: string | null;
          riddle_id: string;
          proposed_answer: string;
          reasoning: string;
          proof_text: string | null;
          status: 'pending' | 'approved' | 'rejected' | 'rewarded';
          admin_notes: string | null;
          reviewed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          riddle_id: string;
          proposed_answer: string;
          reasoning: string;
          proof_text?: string | null;
          status?: 'pending' | 'approved' | 'rejected' | 'rewarded';
          admin_notes?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          riddle_id?: string;
          proposed_answer?: string;
          reasoning?: string;
          proof_text?: string | null;
          status?: 'pending' | 'approved' | 'rejected' | 'rewarded';
          admin_notes?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
        };
      };

      user_attempts: {
        Row: {
          id: string;
          user_id: string | null;
          riddle_id: string;
          submitted_answer: string;
          is_correct: boolean;
          status: 'solved' | 'wrong' | 'gave_up' | 'challenged';
          attempted_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          riddle_id: string;
          submitted_answer: string;
          is_correct: boolean;
          status?: 'solved' | 'wrong' | 'gave_up' | 'challenged';
          attempted_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          riddle_id?: string;
          submitted_answer?: string;
          is_correct?: boolean;
          status?: 'solved' | 'wrong' | 'gave_up' | 'challenged';
          attempted_at?: string;
        };
      };

      generation_logs: {
        Row: {
          id: string;
          user_id: string | null;
          session_id: string | null;
          generated_riddle_id: string | null;
          difficulty: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          session_id?: string | null;
          generated_riddle_id?: string | null;
          difficulty: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          session_id?: string | null;
          generated_riddle_id?: string | null;
          difficulty?: string;
          created_at?: string;
        };
      };

      // ── Phase 3.2 ───────────────────────────────────────
      user_stats: {
        Row: {
          user_id: string;
          total_xp: number;
          current_streak: number;
          best_streak: number;
          riddles_solved: number;
          easy_solved: number;
          medium_solved: number;
          hard_solved: number;
          total_attempts: number;
          correct_attempts: number;
          last_solved_date: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          total_xp?: number;
          current_streak?: number;
          best_streak?: number;
          riddles_solved?: number;
          easy_solved?: number;
          medium_solved?: number;
          hard_solved?: number;
          total_attempts?: number;
          correct_attempts?: number;
          last_solved_date?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          total_xp?: number;
          current_streak?: number;
          best_streak?: number;
          riddles_solved?: number;
          easy_solved?: number;
          medium_solved?: number;
          hard_solved?: number;
          total_attempts?: number;
          correct_attempts?: number;
          last_solved_date?: string | null;
          updated_at?: string;
        };
      };

      streak_events: {
        Row: {
          id: string;
          user_id: string;
          event_type: 'increment' | 'reset' | 'restore';
          streak_value: number;
          solved_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: 'increment' | 'reset' | 'restore';
          streak_value: number;
          solved_date: string;
          created_at?: string;
        };
        Update: never;
      };

      xp_events: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          reason: string;
          riddle_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          reason: string;
          riddle_id?: string | null;
          created_at?: string;
        };
        Update: never;
      };

      // ── Phase 3.3 ───────────────────────────────────────
      achievements: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon: string;
          requirement_type: string;
          threshold: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          icon: string;
          requirement_type: string;
          threshold: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          icon?: string;
          requirement_type?: string;
          threshold?: number;
          created_at?: string;
        };
      };

      user_achievements: {
        Row: {
          user_id: string;
          achievement_id: string;
          unlocked_at: string;
        };
        Insert: {
          user_id: string;
          achievement_id: string;
          unlocked_at?: string;
        };
        Update: {
          user_id?: string;
          achievement_id?: string;
          unlocked_at?: string;
        };
      };

      scheduled_riddles: {
        Row: {
          id: string;
          publish_date: string;
          difficulty: 'easy' | 'medium' | 'hard';
          question: string;
          answer: string;
          explanation: string;
          source: string | null;
          status: 'draft' | 'scheduled' | 'published' | 'archived';
          created_by: string | null;
          approved_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          publish_date: string;
          difficulty: 'easy' | 'medium' | 'hard';
          question: string;
          answer: string;
          explanation: string;
          source?: string | null;
          status?: 'draft' | 'scheduled' | 'published' | 'archived';
          created_by?: string | null;
          approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          publish_date?: string;
          difficulty?: 'easy' | 'medium' | 'hard';
          question?: string;
          answer?: string;
          explanation?: string;
          source?: string | null;
          status?: 'draft' | 'scheduled' | 'published' | 'archived';
          created_by?: string | null;
          approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };

    Views: Record<string, never>;

    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };

    Enums: Record<string, never>;
  };
};

// ── Convenience row types ─────────────────────────────────────────
export type DbRiddle = Database['public']['Tables']['riddles']['Row'];
export type DbRiddleInsert = Database['public']['Tables']['riddles']['Insert'];
export type DbUserAttempt = Database['public']['Tables']['user_attempts']['Row'];
export type DbGenerationLog = Database['public']['Tables']['generation_logs']['Row'];
export type DbProfile = Database['public']['Tables']['profiles']['Row'];
