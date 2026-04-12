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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          badge_color: string | null
          category: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          required_points: number | null
        }
        Insert: {
          badge_color?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          required_points?: number | null
        }
        Update: {
          badge_color?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          required_points?: number | null
        }
        Relationships: []
      }
      availability: {
        Row: {
          created_at: string
          date: string
          day_part: string
          id: string
          is_available: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          day_part: string
          id?: string
          is_available?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          day_part?: string
          id?: string
          is_available?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          created_at: string
          expiry_date: string | null
          file_name: string | null
          file_url: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expiry_date?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expiry_date?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_challenges: {
        Row: {
          active: boolean
          challenge_type: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          points: number
          title: string
        }
        Insert: {
          active?: boolean
          challenge_type?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          points?: number
          title: string
        }
        Update: {
          active?: boolean
          challenge_type?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          points?: number
          title?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          applied_at: string
          id: string
          job_id: string
          motivation: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          id?: string
          job_id: string
          motivation?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          id?: string
          job_id?: string
          motivation?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          certifications_required: string[] | null
          city: string | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          hourly_rate: number | null
          hours_per_week: number | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          specialization_required: string[] | null
          start_date: string | null
          status: string
          title: string
        }
        Insert: {
          certifications_required?: string[] | null
          city?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          hourly_rate?: number | null
          hours_per_week?: number | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          specialization_required?: string[] | null
          start_date?: string | null
          status?: string
          title: string
        }
        Update: {
          certifications_required?: string[] | null
          city?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          hourly_rate?: number | null
          hours_per_week?: number | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          specialization_required?: string[] | null
          start_date?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      leaderboard_scores: {
        Row: {
          challenges_completed: number
          current_streak: number
          id: string
          level: number
          longest_streak: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          challenges_completed?: number
          current_streak?: number
          id?: string
          level?: number
          longest_streak?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          challenges_completed?: number
          current_streak?: number
          id?: string
          level?: number
          longest_streak?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          approved_referrals: number | null
          avatar_url: string | null
          bio: string | null
          bonus_per_referral: number | null
          bsn: string | null
          city: string | null
          completeness_updated_at: string | null
          created_at: string
          date_of_birth: string | null
          equipment_description: string | null
          first_name: string | null
          full_name: string | null
          has_own_equipment: boolean | null
          hourly_rate: number | null
          iban: string | null
          id: string
          kvk_number: string | null
          last_name: string | null
          onboarding_completed: boolean | null
          phone: string | null
          postal_code: string | null
          preferred_language: string | null
          profile_completeness: number | null
          referral_code: string | null
          referral_code_used: string | null
          specialization: string | null
          specializations: string[] | null
          status: string
          total_earned: number | null
          total_referrals: number | null
          transport_type: string | null
          updated_at: string
          user_id: string
          wizard_step: number | null
        }
        Insert: {
          address?: string | null
          approved_referrals?: number | null
          avatar_url?: string | null
          bio?: string | null
          bonus_per_referral?: number | null
          bsn?: string | null
          city?: string | null
          completeness_updated_at?: string | null
          created_at?: string
          date_of_birth?: string | null
          equipment_description?: string | null
          first_name?: string | null
          full_name?: string | null
          has_own_equipment?: boolean | null
          hourly_rate?: number | null
          iban?: string | null
          id?: string
          kvk_number?: string | null
          last_name?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          postal_code?: string | null
          preferred_language?: string | null
          profile_completeness?: number | null
          referral_code?: string | null
          referral_code_used?: string | null
          specialization?: string | null
          specializations?: string[] | null
          status?: string
          total_earned?: number | null
          total_referrals?: number | null
          transport_type?: string | null
          updated_at?: string
          user_id: string
          wizard_step?: number | null
        }
        Update: {
          address?: string | null
          approved_referrals?: number | null
          avatar_url?: string | null
          bio?: string | null
          bonus_per_referral?: number | null
          bsn?: string | null
          city?: string | null
          completeness_updated_at?: string | null
          created_at?: string
          date_of_birth?: string | null
          equipment_description?: string | null
          first_name?: string | null
          full_name?: string | null
          has_own_equipment?: boolean | null
          hourly_rate?: number | null
          iban?: string | null
          id?: string
          kvk_number?: string | null
          last_name?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          postal_code?: string | null
          preferred_language?: string | null
          profile_completeness?: number | null
          referral_code?: string | null
          referral_code_used?: string | null
          specialization?: string | null
          specializations?: string[] | null
          status?: string
          total_earned?: number | null
          total_referrals?: number | null
          transport_type?: string | null
          updated_at?: string
          user_id?: string
          wizard_step?: number | null
        }
        Relationships: []
      }
      referral_invites: {
        Row: {
          approved_at: string | null
          bonus_amount: number | null
          bonus_paid: boolean | null
          id: string
          invited_at: string
          invited_email: string | null
          invited_name: string | null
          referrer_id: string
          registered_at: string | null
          status: string
        }
        Insert: {
          approved_at?: string | null
          bonus_amount?: number | null
          bonus_paid?: boolean | null
          id?: string
          invited_at?: string
          invited_email?: string | null
          invited_name?: string | null
          referrer_id: string
          registered_at?: string | null
          status?: string
        }
        Update: {
          approved_at?: string | null
          bonus_amount?: number | null
          bonus_paid?: boolean | null
          id?: string
          invited_at?: string
          invited_email?: string | null
          invited_name?: string | null
          referrer_id?: string
          registered_at?: string | null
          status?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          date: string
          description: string | null
          hourly_rate: number | null
          hours_worked: number
          id: string
          job_id: string | null
          status: string
          submitted_at: string | null
          total_earned: number | null
          user_id: string
          week_number: number | null
          year: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          date: string
          description?: string | null
          hourly_rate?: number | null
          hours_worked: number
          id?: string
          job_id?: string | null
          status?: string
          submitted_at?: string | null
          total_earned?: number | null
          user_id: string
          week_number?: number | null
          year?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          date?: string
          description?: string | null
          hourly_rate?: number | null
          hours_worked?: number
          id?: string
          job_id?: string | null
          status?: string
          submitted_at?: string | null
          total_earned?: number | null
          user_id?: string
          week_number?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenge_completions: {
        Row: {
          challenge_id: string
          completed_date: string
          created_at: string
          id: string
          points_earned: number
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_date?: string
          created_at?: string
          id?: string
          points_earned?: number
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_date?: string
          created_at?: string
          id?: string
          points_earned?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_completions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_spins: {
        Row: {
          available_spins: number | null
          id: string
          last_daily_spin: string | null
          last_spin_reset: string | null
          total_spins_used: number | null
          user_id: string
        }
        Insert: {
          available_spins?: number | null
          id?: string
          last_daily_spin?: string | null
          last_spin_reset?: string | null
          total_spins_used?: number | null
          user_id: string
        }
        Update: {
          available_spins?: number | null
          id?: string
          last_daily_spin?: string | null
          last_spin_reset?: string | null
          total_spins_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      wheel_prizes: {
        Row: {
          bonus_amount: number | null
          color: string
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          label: string
          label_translations: Json | null
          points_value: number | null
          prize_type: string
          probability: number
          value: string | null
        }
        Insert: {
          bonus_amount?: number | null
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          label_translations?: Json | null
          points_value?: number | null
          prize_type?: string
          probability?: number
          value?: string | null
        }
        Update: {
          bonus_amount?: number | null
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          label_translations?: Json | null
          points_value?: number | null
          prize_type?: string
          probability?: number
          value?: string | null
        }
        Relationships: []
      }
      wheel_spins: {
        Row: {
          bonus_earned: number | null
          id: string
          points_earned: number | null
          prize_id: string | null
          prize_label: string | null
          prize_type: string | null
          spin_source: string | null
          spun_at: string
          user_id: string
        }
        Insert: {
          bonus_earned?: number | null
          id?: string
          points_earned?: number | null
          prize_id?: string | null
          prize_label?: string | null
          prize_type?: string | null
          spin_source?: string | null
          spun_at?: string
          user_id: string
        }
        Update: {
          bonus_earned?: number | null
          id?: string
          points_earned?: number | null
          prize_id?: string | null
          prize_label?: string | null
          prize_type?: string | null
          spin_source?: string | null
          spun_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wheel_spins_prize_id_fkey"
            columns: ["prize_id"]
            isOneToOne: false
            referencedRelation: "wheel_prizes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "zzper" | "admin"
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
  public: {
    Enums: {
      app_role: ["zzper", "admin"],
    },
  },
} as const
