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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      advertisements: {
        Row: {
          active: boolean
          created_at: string
          end_date: string | null
          id: string
          image_url: string
          link_url: string
          placement: string
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string
          link_url?: string
          placement?: string
          start_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string
          link_url?: string
          placement?: string
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_bootstrap: {
        Row: {
          admin_granted: boolean
          created_at: string
          id: boolean
        }
        Insert: {
          admin_granted?: boolean
          created_at?: string
          id?: boolean
        }
        Update: {
          admin_granted?: boolean
          created_at?: string
          id?: boolean
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      joined_players: {
        Row: {
          id: string
          joined_at: string
          kills: number
          player_game_name: string
          player_game_uid: string
          points: number
          rank: number
          tournament_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          id?: string
          joined_at?: string
          kills?: number
          player_game_name?: string
          player_game_uid?: string
          points?: number
          rank?: number
          tournament_id: string
          user_id: string
          user_name?: string
        }
        Update: {
          id?: string
          joined_at?: string
          kills?: number
          player_game_name?: string
          player_game_uid?: string
          points?: number
          rank?: number
          tournament_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "joined_players_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboards: {
        Row: {
          avatar_url: string
          id: string
          matches_played: number
          total_kills: number
          total_points: number
          user_id: string
          user_name: string
          wins: number
        }
        Insert: {
          avatar_url?: string
          id?: string
          matches_played?: number
          total_kills?: number
          total_points?: number
          user_id: string
          user_name?: string
          wins?: number
        }
        Update: {
          avatar_url?: string
          id?: string
          matches_played?: number
          total_kills?: number
          total_points?: number
          user_id?: string
          user_name?: string
          wins?: number
        }
        Relationships: []
      }
      money_requests: {
        Row: {
          account_ref: string
          amount: number
          created_at: string
          handled_at: string | null
          id: string
          kind: string
          method: string
          proof_url: string
          status: string
          user_id: string
          user_name: string
          utr: string
        }
        Insert: {
          account_ref?: string
          amount?: number
          created_at?: string
          handled_at?: string | null
          id?: string
          kind: string
          method?: string
          proof_url?: string
          status?: string
          user_id: string
          user_name?: string
          utr?: string
        }
        Update: {
          account_ref?: string
          amount?: number
          created_at?: string
          handled_at?: string | null
          id?: string
          kind?: string
          method?: string
          proof_url?: string
          status?: string
          user_id?: string
          user_name?: string
          utr?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          target_audience: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string
          target_audience?: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          target_audience?: string
          title?: string
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          created_at: string
          deposits_enabled: boolean
          id: string
          max_deposit: number
          min_deposit: number
          note: string
          payee_name: string
          qr_url: string
          singleton: boolean
          updated_at: string
          upi_id: string
        }
        Insert: {
          created_at?: string
          deposits_enabled?: boolean
          id?: string
          max_deposit?: number
          min_deposit?: number
          note?: string
          payee_name?: string
          qr_url?: string
          singleton?: boolean
          updated_at?: string
          upi_id?: string
        }
        Update: {
          created_at?: string
          deposits_enabled?: boolean
          id?: string
          max_deposit?: number
          min_deposit?: number
          note?: string
          payee_name?: string
          qr_url?: string
          singleton?: boolean
          updated_at?: string
          upi_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string
          banned: boolean
          deposit_balance: number
          email: string
          game_name: string
          game_uid: string
          id: string
          joined_at: string
          name: string
          notify_matches: boolean
          notify_promos: boolean
          phone: string
          profile_complete: boolean
          referral_code: string
          referred_by: string | null
          win_balance: number
        }
        Insert: {
          avatar_url?: string
          banned?: boolean
          deposit_balance?: number
          email?: string
          game_name?: string
          game_uid?: string
          id: string
          joined_at?: string
          name?: string
          notify_matches?: boolean
          notify_promos?: boolean
          phone?: string
          profile_complete?: boolean
          referral_code: string
          referred_by?: string | null
          win_balance?: number
        }
        Update: {
          avatar_url?: string
          banned?: boolean
          deposit_balance?: number
          email?: string
          game_name?: string
          game_uid?: string
          id?: string
          joined_at?: string
          name?: string
          notify_matches?: boolean
          notify_promos?: boolean
          phone?: string
          profile_complete?: boolean
          referral_code?: string
          referred_by?: string | null
          win_balance?: number
        }
        Relationships: []
      }
      rooms: {
        Row: {
          is_unlocked: boolean
          room_id: string
          room_password: string
          tournament_id: string
          unlock_time: string | null
        }
        Insert: {
          is_unlocked?: boolean
          room_id?: string
          room_password?: string
          tournament_id: string
          unlock_time?: string | null
        }
        Update: {
          is_unlocked?: boolean
          room_id?: string
          room_password?: string
          tournament_id?: string
          unlock_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: true
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          banner_url: string
          category: string
          created_at: string
          entry_fee: number
          featured: boolean
          game_name: string
          id: string
          joined_slots: number
          map: string
          per_kill: number
          prize_pool: number
          rules: string[]
          start_time: string
          status: string
          title: string
          total_slots: number
        }
        Insert: {
          banner_url?: string
          category?: string
          created_at?: string
          entry_fee?: number
          featured?: boolean
          game_name?: string
          id?: string
          joined_slots?: number
          map?: string
          per_kill?: number
          prize_pool?: number
          rules?: string[]
          start_time?: string
          status?: string
          title: string
          total_slots?: number
        }
        Update: {
          banner_url?: string
          category?: string
          created_at?: string
          entry_fee?: number
          featured?: boolean
          game_name?: string
          id?: string
          joined_slots?: number
          map?: string
          per_kill?: number
          prize_pool?: number
          rules?: string[]
          start_time?: string
          status?: string
          title?: string
          total_slots?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          note: string
          type: string
          user_id: string
          wallet: string
        }
        Insert: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          note?: string
          type: string
          user_id: string
          wallet: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          note?: string
          type?: string
          user_id?: string
          wallet?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_users: {
        Args: never
        Returns: {
          avatar_url: string
          banned: boolean
          deposit_balance: number
          email: string
          game_name: string
          game_uid: string
          id: string
          joined_at: string
          name: string
          notify_matches: boolean
          notify_promos: boolean
          phone: string
          profile_complete: boolean
          referral_code: string
          referred_by: string | null
          win_balance: number
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_user_ids: {
        Args: never
        Returns: {
          user_id: string
        }[]
      }
      apply_referral: { Args: { p_code: string }; Returns: undefined }
      ensure_profile: {
        Args: { p_avatar: string; p_email: string; p_name: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      join_tournament: { Args: { p_tournament_id: string }; Returns: undefined }
      resolve_request: {
        Args: { p_approve: boolean; p_request_id: string }
        Returns: undefined
      }
      set_user_role: {
        Args: { p_admin: boolean; p_user_id: string }
        Returns: undefined
      }
      submit_result: {
        Args: {
          p_join_id: string
          p_kills: number
          p_points: number
          p_prize: number
          p_rank: number
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
