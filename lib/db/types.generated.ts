export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      model_share_links: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          model_id: string
          revoked_at: string | null
          token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          model_id: string
          revoked_at?: string | null
          token: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          model_id?: string
          revoked_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_share_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_share_links_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_versions: {
        Row: {
          canvas_state: Json
          created_at: string
          created_by: string
          id: string
          label: string | null
          model_id: string
        }
        Insert: {
          canvas_state: Json
          created_at?: string
          created_by: string
          id?: string
          label?: string | null
          model_id: string
        }
        Update: {
          canvas_state?: Json
          created_at?: string
          created_by?: string
          id?: string
          label?: string | null
          model_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_versions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          canvas_state: Json
          created_at: string
          deleted_at: string | null
          id: string
          owner_profile_id: string
          thumbnail_path: string | null
          thumbnail_updated_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          canvas_state?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          owner_profile_id: string
          thumbnail_path?: string | null
          thumbnail_updated_at?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          canvas_state?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          owner_profile_id?: string
          thumbnail_path?: string | null
          thumbnail_updated_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "models_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_memberships: {
        Row: {
          created_at: string
          org_id: string
          profile_id: string
          role: Database["public"]["Enums"]["org_role"]
        }
        Insert: {
          created_at?: string
          org_id: string
          profile_id: string
          role?: Database["public"]["Enums"]["org_role"]
        }
        Update: {
          created_at?: string
          org_id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["org_role"]
        }
        Relationships: [
          {
            foreignKeyName: "org_memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          plan_id: string | null
          slug: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          plan_id?: string | null
          slug: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          plan_id?: string | null
          slug?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          display_name: string
          features: Json
          id: string
          max_facilitators: number
          max_participants_per_session: number
          monthly_price_pence: number | null
          retention_days: number
          sort_order: number
          storage_gb: number
          tier: Database["public"]["Enums"]["plan_tier"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name: string
          features?: Json
          id?: string
          max_facilitators: number
          max_participants_per_session: number
          monthly_price_pence?: number | null
          retention_days: number
          sort_order?: number
          storage_gb: number
          tier: Database["public"]["Enums"]["plan_tier"]
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string
          features?: Json
          id?: string
          max_facilitators?: number
          max_participants_per_session?: number
          monthly_price_pence?: number | null
          retention_days?: number
          sort_order?: number
          storage_gb?: number
          tier?: Database["public"]["Enums"]["plan_tier"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          current_stage: Database["public"]["Enums"]["stage_type"] | null
          facilitator_id: string
          id: string
          mode: Database["public"]["Enums"]["session_mode"]
          org_id: string
          scheduled_for: string | null
          status: Database["public"]["Enums"]["session_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_stage?: Database["public"]["Enums"]["stage_type"] | null
          facilitator_id: string
          id?: string
          mode?: Database["public"]["Enums"]["session_mode"]
          org_id: string
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_stage?: Database["public"]["Enums"]["stage_type"] | null
          facilitator_id?: string
          id?: string
          mode?: Database["public"]["Enums"]["session_mode"]
          org_id?: string
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_facilitator_id_fkey"
            columns: ["facilitator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          position: number
          session_id: string
          stage_type: Database["public"]["Enums"]["stage_type"]
          started_at: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          position: number
          session_id: string
          stage_type: Database["public"]["Enums"]["stage_type"]
          started_at?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          position?: number
          session_id?: string
          stage_type?: Database["public"]["Enums"]["stage_type"]
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_customers: {
        Row: {
          created_at: string
          org_id: string
          stripe_customer_id: string
        }
        Insert: {
          created_at?: string
          org_id: string
          stripe_customer_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          stripe_customer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_customers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          org_id: string
          plan_id: string | null
          raw: Json | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_price_id: string
          stripe_subscription_id: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id: string
          plan_id?: string | null
          raw?: Json | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_price_id: string
          stripe_subscription_id: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id?: string
          plan_id?: string | null
          raw?: Json | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_price_id?: string
          stripe_subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      yjs_documents: {
        Row: {
          bytes: number | null
          name: string
          state: string
          updated_at: string
        }
        Insert: {
          bytes?: number | null
          name: string
          state: string
          updated_at?: string
        }
        Update: {
          bytes?: number | null
          name?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_org_admin: { Args: { p_org_id: string }; Returns: boolean }
      is_org_member: { Args: { p_org_id: string }; Returns: boolean }
      purge_expired_trashed_models: { Args: never; Returns: undefined }
    }
    Enums: {
      org_role: "owner" | "admin" | "facilitator" | "member"
      plan_tier: "free" | "pro" | "team" | "enterprise"
      session_mode: "sync" | "async" | "hybrid"
      session_status: "draft" | "scheduled" | "live" | "completed" | "archived"
      stage_type:
        | "skill_building"
        | "individual_model"
        | "shared_model"
        | "system_model"
        | "guiding_principles"
      subscription_status:
        | "incomplete"
        | "incomplete_expired"
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "paused"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      org_role: ["owner", "admin", "facilitator", "member"],
      plan_tier: ["free", "pro", "team", "enterprise"],
      session_mode: ["sync", "async", "hybrid"],
      session_status: ["draft", "scheduled", "live", "completed", "archived"],
      stage_type: [
        "skill_building",
        "individual_model",
        "shared_model",
        "system_model",
        "guiding_principles",
      ],
      subscription_status: [
        "incomplete",
        "incomplete_expired",
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "paused",
      ],
    },
  },
} as const

