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
      availability_slots: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          profile_id: string
          starts_at: string
          updated_at: string
          weekday: number
          work_mode: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          profile_id: string
          starts_at: string
          updated_at?: string
          weekday: number
          work_mode?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          profile_id?: string
          starts_at?: string
          updated_at?: string
          weekday?: number
          work_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          auth_user_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          status: Database["public"]["Enums"]["invitation_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          auth_user_id?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          status?: Database["public"]["Enums"]["invitation_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          auth_user_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          status?: Database["public"]["Enums"]["invitation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_settings: {
        Row: {
          acronym: string | null
          created_at: string
          created_by: string | null
          id: boolean
          name: string | null
          setup_completed_at: string | null
          timezone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          acronym?: string | null
          created_at?: string
          created_by?: string | null
          id?: boolean
          name?: string | null
          setup_completed_at?: string | null
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          acronym?: string | null
          created_at?: string
          created_by?: string | null
          id?: boolean
          name?: string | null
          setup_completed_at?: string | null
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_blocks: {
        Row: {
          created_at: string
          created_by: string
          ends_at: string
          id: string
          notes: string | null
          printer_id: string
          reason: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ends_at: string
          id?: string
          notes?: string | null
          printer_id: string
          reason: string
          starts_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ends_at?: string
          id?: string
          notes?: string | null
          printer_id?: string
          reason?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_blocks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_blocks_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      printer_bookings: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          ends_at: string
          estimated_duration_minutes: number
          id: string
          material_id: string
          notes: string | null
          printer_id: string
          profile_id: string
          project_name: string
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          ends_at: string
          estimated_duration_minutes: number
          id?: string
          material_id: string
          notes?: string | null
          printer_id: string
          profile_id: string
          project_name: string
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          ends_at?: string
          estimated_duration_minutes?: number
          id?: string
          material_id?: string
          notes?: string | null
          printer_id?: string
          profile_id?: string
          project_name?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "printer_bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printer_bookings_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printer_bookings_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printer_bookings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      printer_materials: {
        Row: {
          created_at: string
          material_id: string
          printer_id: string
        }
        Insert: {
          created_at?: string
          material_id: string
          printer_id: string
        }
        Update: {
          created_at?: string
          material_id?: string
          printer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "printer_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printer_materials_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
        ]
      }
      printers: {
        Row: {
          created_at: string
          id: string
          location: string | null
          model: string | null
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["printer_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          model?: string | null
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["printer_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["printer_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profile_private_data: {
        Row: {
          address_complement: string | null
          address_number: string | null
          birth_date: string | null
          city: string | null
          country: string | null
          cpf: string | null
          created_at: string
          neighborhood: string | null
          postal_code: string | null
          profile_id: string
          rg: string | null
          state: string | null
          street: string | null
          updated_at: string
        }
        Insert: {
          address_complement?: string | null
          address_number?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          cpf?: string | null
          created_at?: string
          neighborhood?: string | null
          postal_code?: string | null
          profile_id: string
          rg?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
        }
        Update: {
          address_complement?: string | null
          address_number?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          cpf?: string | null
          created_at?: string
          neighborhood?: string | null
          postal_code?: string | null
          profile_id?: string
          rg?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_private_data_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_skills: {
        Row: {
          created_at: string
          profile_id: string
          skill_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          skill_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_skills_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          academic_affiliation:
            | Database["public"]["Enums"]["academic_affiliation"]
            | null
          bio: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_scholarship_holder: boolean
          lattes_url: string | null
          nationality_country_code: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          weekly_workload_hours: number | null
        }
        Insert: {
          academic_affiliation?:
            | Database["public"]["Enums"]["academic_affiliation"]
            | null
          bio?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          is_scholarship_holder?: boolean
          lattes_url?: string | null
          nationality_country_code?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          weekly_workload_hours?: number | null
        }
        Update: {
          academic_affiliation?:
            | Database["public"]["Enums"]["academic_affiliation"]
            | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_scholarship_holder?: boolean
          lattes_url?: string | null
          nationality_country_code?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          weekly_workload_hours?: number | null
        }
        Relationships: []
      }
      skills: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_printer_booking: {
        Args: { p_booking_id: string }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          ends_at: string
          estimated_duration_minutes: number
          id: string
          material_id: string
          notes: string | null
          printer_id: string
          profile_id: string
          project_name: string
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "printer_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_lab_installation: {
        Args: {
          p_acronym: string
          p_materials?: Json
          p_name: string
          p_printers?: Json
          p_timezone: string
        }
        Returns: {
          acronym: string | null
          created_at: string
          created_by: string | null
          id: boolean
          name: string | null
          setup_completed_at: string | null
          timezone: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "lab_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_maintenance_block: {
        Args: {
          p_ends_at: string
          p_notes?: string
          p_printer_id: string
          p_reason: string
          p_starts_at: string
        }
        Returns: {
          created_at: string
          created_by: string
          ends_at: string
          id: string
          notes: string | null
          printer_id: string
          reason: string
          starts_at: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "maintenance_blocks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_printer_booking: {
        Args: {
          p_estimated_duration_minutes: number
          p_material_id: string
          p_notes?: string
          p_printer_id: string
          p_project_name: string
          p_starts_at: string
        }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          ends_at: string
          estimated_duration_minutes: number
          id: string
          material_id: string
          notes: string | null
          printer_id: string
          profile_id: string
          project_name: string
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "printer_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_profile: {
        Args: {
          p_academic_affiliation?: Database["public"]["Enums"]["academic_affiliation"]
          p_address_complement?: string
          p_address_number?: string
          p_bio?: string
          p_birth_date?: string
          p_city?: string
          p_country?: string
          p_cpf?: string
          p_full_name: string
          p_is_scholarship_holder?: boolean
          p_lattes_url?: string
          p_nationality_country_code?: string
          p_neighborhood?: string
          p_phone?: string
          p_postal_code?: string
          p_rg?: string
          p_state?: string
          p_street?: string
          p_weekly_workload_hours?: number
        }
        Returns: {
          academic_affiliation:
            | Database["public"]["Enums"]["academic_affiliation"]
            | null
          bio: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_scholarship_holder: boolean
          lattes_url: string | null
          nationality_country_code: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          weekly_workload_hours: number | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_maintenance_block: {
        Args: { p_block_id: string }
        Returns: undefined
      }
      replace_printer_materials: {
        Args: { p_material_ids: string[]; p_printer_id: string }
        Returns: {
          created_at: string
          material_id: string
          printer_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "printer_materials"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      replace_profile_availability: {
        Args: { p_profile_id: string; p_slots: Json }
        Returns: {
          created_at: string
          ends_at: string
          id: string
          profile_id: string
          starts_at: string
          updated_at: string
          weekday: number
          work_mode: string
        }[]
        SetofOptions: {
          from: "*"
          to: "availability_slots"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_lab_settings: {
        Args: { p_acronym: string; p_name: string; p_timezone: string }
        Returns: {
          acronym: string | null
          created_at: string
          created_by: string | null
          id: boolean
          name: string | null
          setup_completed_at: string | null
          timezone: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "lab_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_my_profile: {
        Args: {
          p_academic_affiliation?: Database["public"]["Enums"]["academic_affiliation"]
          p_address_complement?: string
          p_address_number?: string
          p_bio?: string
          p_birth_date?: string
          p_city?: string
          p_country?: string
          p_cpf?: string
          p_full_name: string
          p_is_scholarship_holder?: boolean
          p_lattes_url?: string
          p_nationality_country_code?: string
          p_neighborhood?: string
          p_phone?: string
          p_postal_code?: string
          p_rg?: string
          p_state?: string
          p_street?: string
          p_weekly_workload_hours?: number
        }
        Returns: {
          academic_affiliation:
            | Database["public"]["Enums"]["academic_affiliation"]
            | null
          bio: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_scholarship_holder: boolean
          lattes_url: string | null
          nationality_country_code: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          weekly_workload_hours: number | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      academic_affiliation:
        | "ic"
        | "extension"
        | "intern"
        | "tcc"
        | "masters"
        | "phd"
        | "postdoc"
        | "visitor"
        | "technician"
        | "faculty"
        | "other"
      booking_status:
        | "pending"
        | "approved"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "failed"
      invitation_status: "pending" | "accepted" | "expired" | "revoked"
      printer_status: "active" | "maintenance" | "unavailable" | "disabled"
      user_role: "coordinator" | "researcher"
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
      academic_affiliation: [
        "ic",
        "extension",
        "intern",
        "tcc",
        "masters",
        "phd",
        "postdoc",
        "visitor",
        "technician",
        "faculty",
        "other",
      ],
      booking_status: [
        "pending",
        "approved",
        "in_progress",
        "completed",
        "cancelled",
        "failed",
      ],
      invitation_status: ["pending", "accepted", "expired", "revoked"],
      printer_status: ["active", "maintenance", "unavailable", "disabled"],
      user_role: ["coordinator", "researcher"],
    },
  },
} as const
