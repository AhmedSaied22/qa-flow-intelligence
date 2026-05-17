export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          owner_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          owner_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          owner_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      requirements: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          owner_id: string;
          project_id: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          owner_id: string;
          project_id: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          owner_id?: string;
          project_id?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "requirements_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "requirements_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      requirement_versions: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          requirement_id: string;
          status: string;
          title: string;
          version_number: number;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          requirement_id: string;
          status: string;
          title: string;
          version_number: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          requirement_id?: string;
          status?: string;
          title?: string;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "requirement_versions_requirement_id_fkey";
            columns: ["requirement_id"];
            isOneToOne: false;
            referencedRelation: "requirements";
            referencedColumns: ["id"];
          }
        ];
      };
      ai_provider_settings: {
        Row: {
          created_at: string;
          gemini_api_key: string | null;
          gemini_free_quota_limit: number;
          gemini_free_quota_used: number;
          id: string;
          owner_id: string;
          provider: string;
          updated_at: string;
          use_byok: boolean;
        };
        Insert: {
          created_at?: string;
          gemini_api_key?: string | null;
          gemini_free_quota_limit?: number;
          gemini_free_quota_used?: number;
          id?: string;
          owner_id: string;
          provider?: string;
          updated_at?: string;
          use_byok?: boolean;
        };
        Update: {
          created_at?: string;
          gemini_api_key?: string | null;
          gemini_free_quota_limit?: number;
          gemini_free_quota_used?: number;
          id?: string;
          owner_id?: string;
          provider?: string;
          updated_at?: string;
          use_byok?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "ai_provider_settings_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      ai_usage_events: {
        Row: {
          ai_generation_id: string | null;
          cache_hit: boolean;
          created_at: string;
          id: string;
          model: string;
          owner_id: string;
          provider: string;
          प्रतिक्रिया?: never;
          response_time_ms: number | null;
          source: string;
          tokens_in: number;
          tokens_out: number;
        };
        Insert: {
          ai_generation_id?: string | null;
          cache_hit?: boolean;
          created_at?: string;
          id?: string;
          model: string;
          owner_id: string;
          provider: string;
          response_time_ms?: number | null;
          source?: string;
          tokens_in?: number;
          tokens_out?: number;
        };
        Update: {
          ai_generation_id?: string | null;
          cache_hit?: boolean;
          created_at?: string;
          id?: string;
          model?: string;
          owner_id?: string;
          provider?: string;
          response_time_ms?: number | null;
          source?: string;
          tokens_in?: number;
          tokens_out?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
