export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

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
          gemini_model: string;
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
          gemini_model?: string;
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
          gemini_model?: string;
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
      ai_generations: {
        Row: {
          cache_status: string;
          created_at: string;
          error_code: string | null;
          error_message: string | null;
          generation_type: string;
          id: string;
          input_hash: string;
          project_id: string | null;
          model: string;
          owner_id: string;
          requirement_id: string | null;
          output_json: Json | null;
          prompt_version: string;
          provider: string;
          response_time_ms: number | null;
          status: string;
          token_input: number | null;
          token_output: number | null;
          estimated_cost: number | null;
          updated_at: string;
        };
        Insert: {
          cache_status?: string;
          created_at?: string;
          error_code?: string | null;
          error_message?: string | null;
          generation_type: string;
          id?: string;
          input_hash: string;
          project_id?: string | null;
          model: string;
          owner_id: string;
          requirement_id?: string | null;
          output_json?: Json | null;
          prompt_version: string;
          provider: string;
          response_time_ms?: number | null;
          status: string;
          token_input?: number | null;
          token_output?: number | null;
          estimated_cost?: number | null;
          updated_at?: string;
        };
        Update: {
          cache_status?: string;
          created_at?: string;
          error_code?: string | null;
          error_message?: string | null;
          generation_type?: string;
          id?: string;
          input_hash?: string;
          project_id?: string | null;
          model?: string;
          owner_id?: string;
          requirement_id?: string | null;
          output_json?: Json | null;
          prompt_version?: string;
          provider?: string;
          response_time_ms?: number | null;
          status?: string;
          token_input?: number | null;
          token_output?: number | null;
          estimated_cost?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      test_cases: {
        Row: {
          ai_generation_id: string | null;
          automation_candidate: string | null;
          case_type: string;
          created_at: string;
          description: string | null;
          expected_result: string | null;
          id: string;
          platform: string;
          priority: string;
          preconditions: string | null;
          project_id: string;
          requirement_id: string;
          risk_level: string;
          status: string;
          steps: Json;
          test_data: Json;
          title: string;
          updated_at: string;
        };
        Insert: {
          ai_generation_id?: string | null;
          automation_candidate?: string | null;
          case_type?: string;
          created_at?: string;
          description?: string | null;
          expected_result?: string | null;
          id?: string;
          platform: string;
          priority?: string;
          preconditions?: string | null;
          project_id: string;
          requirement_id: string;
          risk_level: string;
          status?: string;
          steps?: Json;
          test_data?: Json;
          title: string;
          updated_at?: string;
        };
        Update: {
          ai_generation_id?: string | null;
          automation_candidate?: string | null;
          case_type?: string;
          created_at?: string;
          description?: string | null;
          expected_result?: string | null;
          id?: string;
          platform?: string;
          priority?: string;
          preconditions?: string | null;
          project_id?: string;
          requirement_id?: string;
          risk_level?: string;
          status?: string;
          steps?: Json;
          test_data?: Json;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      test_case_versions: {
        Row: {
          created_at: string;
          automation_candidate: string | null;
          case_type: string;
          change_reason: string | null;
          description: string | null;
          expected_result: string | null;
          id: string;
          platform: string;
          priority: string;
          preconditions: string | null;
          risk_level: string;
          status: string;
          steps: Json;
          test_data: Json;
          test_case_id: string;
          title: string;
          version_number: number;
        };
        Insert: {
          automation_candidate?: string | null;
          case_type?: string;
          change_reason?: string | null;
          created_at?: string;
          description?: string | null;
          expected_result?: string | null;
          id?: string;
          platform: string;
          priority?: string;
          preconditions?: string | null;
          risk_level: string;
          status: string;
          steps?: Json;
          test_data?: Json;
          test_case_id: string;
          title: string;
          version_number: number;
        };
        Update: {
          automation_candidate?: string | null;
          case_type?: string;
          change_reason?: string | null;
          created_at?: string;
          description?: string | null;
          expected_result?: string | null;
          id?: string;
          platform?: string;
          priority?: string;
          preconditions?: string | null;
          risk_level?: string;
          status?: string;
          steps?: Json;
          test_data?: Json;
          test_case_id?: string;
          title?: string;
          version_number?: number;
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
