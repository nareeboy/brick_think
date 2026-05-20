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
      model_imports: {
        Row: {
          id: string
          imported_at: string
          profile_id: string | null
          source_model_id: string | null
          target_model_id: string
        }
        Insert: {
          id?: string
          imported_at?: string
          profile_id?: string | null
          source_model_id?: string | null
          target_model_id: string
        }
        Update: {
          id?: string
          imported_at?: string
          profile_id?: string | null
          source_model_id?: string | null
          target_model_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_imports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_imports_source_model_id_fkey"
            columns: ["source_model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_imports_target_model_id_fkey"
            columns: ["target_model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
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
      model_tags: {
        Row: {
          created_at: string
          model_id: string
          tag: string
        }
        Insert: {
          created_at?: string
          model_id: string
          tag: string
        }
        Update: {
          created_at?: string
          model_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_tags_model_id_fkey"
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
          created_by: string | null
          id: string
          label: string | null
          model_id: string
        }
        Insert: {
          canvas_state: Json
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          model_id: string
        }
        Update: {
          canvas_state?: Json
          created_at?: string
          created_by?: string | null
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
          org_id: string | null
          owner_profile_id: string
          room_id: string | null
          session_id: string | null
          stage_id: string | null
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
          org_id?: string | null
          owner_profile_id: string
          room_id?: string | null
          session_id?: string | null
          stage_id?: string | null
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
          org_id?: string | null
          owner_profile_id?: string
          room_id?: string | null
          session_id?: string | null
          stage_id?: string | null
          thumbnail_path?: string | null
          thumbnail_updated_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "models_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "models_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "models_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "stage_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "models_stage_session_fk"
            columns: ["stage_id", "session_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id", "session_id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_profile_id: string | null
          body: string | null
          created_at: string
          id: string
          kind: string
          link_url: string | null
          org_id: string | null
          read_at: string | null
          recipient_profile_id: string
          session_id: string | null
          title: string
        }
        Insert: {
          actor_profile_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link_url?: string | null
          org_id?: string | null
          read_at?: string | null
          recipient_profile_id: string
          session_id?: string | null
          title: string
        }
        Update: {
          actor_profile_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link_url?: string | null
          org_id?: string | null
          read_at?: string | null
          recipient_profile_id?: string
          session_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invitations: {
        Row: {
          claimed_at: string | null
          claimed_by_profile_id: string | null
          email: string
          id: string
          invited_at: string
          invited_by: string | null
          org_id: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by_profile_id?: string | null
          email: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          org_id: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by_profile_id?: string | null
          email?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invitations_claimed_by_profile_id_fkey"
            columns: ["claimed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
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
          slug: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          slug: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
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
        ]
      }
      profiles: {
        Row: {
          a11y_preferences: Json
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          a11y_preferences?: Json
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          a11y_preferences?: Json
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      scenarios: {
        Row: {
          body: string
          created_at: string
          duration_minutes: number
          id: string
          is_template: boolean
          org_id: string | null
          stage_type: Database["public"]["Enums"]["stage_type"]
          tags: string[]
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          duration_minutes: number
          id?: string
          is_template?: boolean
          org_id?: string | null
          stage_type: Database["public"]["Enums"]["stage_type"]
          tags?: string[]
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          is_template?: boolean
          org_id?: string | null
          stage_type?: Database["public"]["Enums"]["stage_type"]
          tags?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          current_stage: Database["public"]["Enums"]["stage_type"] | null
          current_stage_id: string | null
          facilitator_id: string | null
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
          current_stage_id?: string | null
          facilitator_id?: string | null
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
          current_stage_id?: string | null
          facilitator_id?: string | null
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
            foreignKeyName: "sessions_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
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
      stage_events: {
        Row: {
          actor_profile_id: string | null
          created_at: string
          id: string
          metadata: Json
          session_id: string
          stage_id: string
          verb: string
        }
        Insert: {
          actor_profile_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          session_id: string
          stage_id: string
          verb: string
        }
        Update: {
          actor_profile_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          session_id?: string
          stage_id?: string
          verb?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_events_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_room_members: {
        Row: {
          created_at: string
          profile_id: string
          room_id: string
          stage_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          room_id: string
          stage_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          room_id?: string
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_room_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_room_members_room_id_stage_id_fkey"
            columns: ["room_id", "stage_id"]
            isOneToOne: false
            referencedRelation: "stage_rooms"
            referencedColumns: ["id", "stage_id"]
          },
        ]
      }
      stage_room_sources: {
        Row: {
          created_at: string
          room_id: string
          source_room_id: string
        }
        Insert: {
          created_at?: string
          room_id: string
          source_room_id: string
        }
        Update: {
          created_at?: string
          room_id?: string
          source_room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_room_sources_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "stage_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_room_sources_source_room_id_fkey"
            columns: ["source_room_id"]
            isOneToOne: false
            referencedRelation: "stage_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_rooms: {
        Row: {
          created_at: string
          id: string
          position: number
          stage_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          position: number
          stage_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          stage_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_rooms_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          created_at: string
          description: string | null
          duration_seconds: number | null
          ended_at: string | null
          extended_seconds: number
          id: string
          paused_at: string | null
          position: number
          session_id: string
          stage_type: Database["public"]["Enums"]["stage_type"]
          started_at: string | null
          status: Database["public"]["Enums"]["stage_status"]
          title: string | null
          total_paused_ms: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          extended_seconds?: number
          id?: string
          paused_at?: string | null
          position: number
          session_id: string
          stage_type: Database["public"]["Enums"]["stage_type"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["stage_status"]
          title?: string | null
          total_paused_ms?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          extended_seconds?: number
          id?: string
          paused_at?: string | null
          position?: number
          session_id?: string
          stage_type?: Database["public"]["Enums"]["stage_type"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["stage_status"]
          title?: string | null
          total_paused_ms?: number
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
      can_edit_room: {
        Args: { p_model_id: string; p_profile_id: string }
        Returns: boolean
      }
      can_read_model: {
        Args: { p_model_id: string; p_profile_id: string }
        Returns: boolean
      }
      is_org_admin: { Args: { p_org_id: string }; Returns: boolean }
      is_org_member: { Args: { p_org_id: string }; Returns: boolean }
      is_org_member_for: {
        Args: { p_org_id: string; p_profile_id: string }
        Returns: boolean
      }
      purge_dead_share_links: { Args: never; Returns: undefined }
      purge_expired_trashed_models: { Args: never; Returns: undefined }
    }
    Enums: {
      org_role: "owner" | "admin" | "facilitator" | "member"
      session_mode: "sync" | "async" | "hybrid"
      session_status: "draft" | "scheduled" | "live" | "completed" | "archived"
      stage_status: "pending" | "active" | "paused" | "completed"
      stage_type:
        | "skill_building"
        | "individual_model"
        | "shared_model"
        | "system_model"
        | "guiding_principles"
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
      session_mode: ["sync", "async", "hybrid"],
      session_status: ["draft", "scheduled", "live", "completed", "archived"],
      stage_status: ["pending", "active", "paused", "completed"],
      stage_type: [
        "skill_building",
        "individual_model",
        "shared_model",
        "system_model",
        "guiding_principles",
      ],
    },
  },
} as const
