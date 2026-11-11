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
      projects: {
        Row: { id: string; user_id: string; name: string; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; name: string; created_at?: string; updated_at?: string };
        Update: { name?: string; updated_at?: string };
        Relationships: [];
      };
      saved_works: {
        Row: { id: string; user_id: string; project_id: string; openalex_id: string; work: Json; note: string; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; project_id: string; openalex_id: string; work: Json; note?: string; created_at?: string; updated_at?: string };
        Update: { note?: string; updated_at?: string };
        Relationships: [];
      };
      search_history: {
        Row: { id: string; user_id: string; query: string; mode: "basic" | "ai"; filters: Json; ai_explanation: Json | null; result_count: number; created_at: string };
        Insert: { id?: string; user_id: string; query: string; mode: "basic" | "ai"; filters?: Json; ai_explanation?: Json | null; result_count: number; created_at?: string };
        Update: never;
        Relationships: [];
      };
      ai_daily_usage: {
        Row: { user_id: string; usage_date: string; used_count: number };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      consume_ai_quota: {
        Args: { daily_limit?: number };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
