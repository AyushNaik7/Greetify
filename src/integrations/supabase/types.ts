export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          business_id: string
          call_id: string | null
          contact_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          date_time: string
          duration: number
          id: string
          notes: string | null
          service: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          call_id?: string | null
          contact_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          date_time: string
          duration: number
          id?: string
          notes?: string | null
          service: string
          status: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          call_id?: string | null
          contact_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          date_time?: string
          duration?: number
          id?: string
          notes?: string | null
          service?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          business_id: string
          close_time: string | null
          day_of_week: number
          id: string
          is_open: boolean | null
          open_time: string | null
        }
        Insert: {
          business_id: string
          close_time?: string | null
          day_of_week: number
          id?: string
          is_open?: boolean | null
          open_time?: string | null
        }
        Update: {
          business_id?: string
          close_time?: string | null
          day_of_week?: number
          id?: string
          is_open?: boolean | null
          open_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          ai_greeting: string | null
          ai_tone: string | null
          booking_enabled: boolean | null
          buffer_minutes: number | null
          business_id: string
          cancellation_enabled: boolean | null
          created_at: string
          id: string
          max_advance_days: number | null
          min_advance_hours: number | null
          updated_at: string
          voice_type: string | null
        }
        Insert: {
          ai_greeting?: string | null
          ai_tone?: string | null
          booking_enabled?: boolean | null
          buffer_minutes?: number | null
          business_id: string
          cancellation_enabled?: boolean | null
          created_at?: string
          id?: string
          max_advance_days?: number | null
          min_advance_hours?: number | null
          updated_at?: string
          voice_type?: string | null
        }
        Update: {
          ai_greeting?: string | null
          ai_tone?: string | null
          booking_enabled?: boolean | null
          buffer_minutes?: number | null
          business_id?: string
          cancellation_enabled?: boolean | null
          created_at?: string
          id?: string
          max_advance_days?: number | null
          min_advance_hours?: number | null
          updated_at?: string
          voice_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          business_type: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_type?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_type?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          ai_handled: boolean | null
          answered_at: string | null
          appointment_created: boolean | null
          business_id: string
          call_sid: string
          callback_requested: boolean | null
          caller_email: string | null
          caller_name: string | null
          conversation: Json
          conversation_summary: string | null
          created_at: string
          direction: string
          duration: number | null
          ended_at: string | null
          from_number: string
          id: string
          notes: string | null
          parent_call_sid: string | null
          recording_duration: number | null
          recording_url: string | null
          started_at: string | null
          status: string
          to_number: string
          tools_used: string[] | null
          transcription: string | null
          transferred_to_human: boolean | null
          updated_at: string
        }
        Insert: {
          ai_handled?: boolean | null
          answered_at?: string | null
          appointment_created?: boolean | null
          business_id: string
          call_sid: string
          callback_requested?: boolean | null
          caller_email?: string | null
          caller_name?: string | null
          conversation?: Json
          conversation_summary?: string | null
          created_at?: string
          direction: string
          duration?: number | null
          ended_at?: string | null
          from_number: string
          id?: string
          notes?: string | null
          parent_call_sid?: string | null
          recording_duration?: number | null
          recording_url?: string | null
          started_at?: string | null
          status?: string
          to_number: string
          tools_used?: string[] | null
          transcription?: string | null
          transferred_to_human?: boolean | null
          updated_at?: string
        }
        Update: {
          ai_handled?: boolean | null
          answered_at?: string | null
          appointment_created?: boolean | null
          business_id?: string
          call_sid?: string
          callback_requested?: boolean | null
          caller_email?: string | null
          caller_name?: string | null
          conversation?: Json
          conversation_summary?: string | null
          created_at?: string
          direction?: string
          duration?: number | null
          ended_at?: string | null
          from_number?: string
          id?: string
          notes?: string | null
          parent_call_sid?: string | null
          recording_duration?: number | null
          recording_url?: string | null
          started_at?: string | null
          status?: string
          to_number?: string
          tools_used?: string[] | null
          transcription?: string | null
          transferred_to_human?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          business_id: string
          contact_id: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string
          duration: number | null
          id: string
          outcome: string | null
          recording_url: string | null
          status: string
          summary: string | null
          transcript: string | null
          twilio_call_sid: string | null
        }
        Insert: {
          business_id: string
          contact_id?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone: string
          duration?: number | null
          id?: string
          outcome?: string | null
          recording_url?: string | null
          status: string
          summary?: string | null
          transcript?: string | null
          twilio_call_sid?: string | null
        }
        Update: {
          business_id?: string
          contact_id?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string
          duration?: number | null
          id?: string
          outcome?: string | null
          recording_url?: string | null
          status?: string
          summary?: string | null
          transcript?: string | null
          twilio_call_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          business_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_entries: {
        Row: {
          answer: string
          business_id: string
          category: string | null
          created_at: string
          enabled: boolean | null
          id: string
          question: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          answer: string
          business_id: string
          category?: string | null
          created_at?: string
          enabled?: boolean | null
          id?: string
          question: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          answer?: string
          business_id?: string
          category?: string | null
          created_at?: string
          enabled?: boolean | null
          id?: string
          question?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_entries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_memberships: {
        Row: {
          business_id: string
          id: string
          original_user_id: string
          role: string
        }
        Insert: {
          business_id: string
          id?: string
          original_user_id: string
          role: string
        }
        Update: {
          business_id?: string
          id?: string
          original_user_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "legacy_memberships_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legacy_memberships_original_user_id_fkey"
            columns: ["original_user_id"]
            isOneToOne: false
            referencedRelation: "legacy_user_map"
            referencedColumns: ["original_user_id"]
          },
        ]
      }
      legacy_user_map: {
        Row: {
          auth_user_id: string | null
          email: string
          linked_at: string | null
          original_user_id: string
        }
        Insert: {
          auth_user_id?: string | null
          email: string
          linked_at?: string | null
          original_user_id: string
        }
        Update: {
          auth_user_id?: string | null
          email?: string
          linked_at?: string | null
          original_user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          business_id: string
          call_id: string | null
          contact_id: string | null
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          message: string
          priority: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          call_id?: string | null
          contact_id?: string | null
          created_at?: string
          customer_name: string
          customer_phone: string
          id?: string
          message: string
          priority?: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          call_id?: string | null
          contact_id?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          message?: string
          priority?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
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
      services: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          duration: number
          enabled: boolean | null
          id: string
          name: string
          price_range: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          duration: number
          enabled?: boolean | null
          id?: string
          name: string
          price_range?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          duration?: number
          enabled?: boolean | null
          id?: string
          name?: string
          price_range?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_business: {
        Args: {
          _address: string
          _business_type: string
          _email: string
          _hours: Json
          _name: string
          _phone: string
          _timezone: string
        }
        Returns: string
      }
      is_business_admin: { Args: { _business_id: string }; Returns: boolean }
      is_business_member: { Args: { _business_id: string }; Returns: boolean }
      link_legacy_user: {
        Args: { _auth_id: string; _email: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
