export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      daos: {
        Row: {
          description: string | null
          governor: string | null
          id: string
          logo_url: string | null
          name: string
          platform: string | null
        }
        Insert: {
          description?: string | null
          governor?: string | null
          id: string
          logo_url?: string | null
          name: string
          platform?: string | null
        }
        Update: {
          description?: string | null
          governor?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          platform?: string | null
        }
        Relationships: []
      }
      decisions: {
        Row: {
          confidence: number | null
          cons: string[] | null
          created_at: string
          id: string
          impact_score: number | null
          llm_trace: string | null
          persona_match: number | null
          proposal_id: string
          pros: string[] | null
          status: string | null
          summary: string | null
          user_id: string
          vote: string | null
        }
        Insert: {
          confidence?: number | null
          cons?: string[] | null
          created_at?: string
          id?: string
          impact_score?: number | null
          llm_trace?: string | null
          persona_match?: number | null
          proposal_id: string
          pros?: string[] | null
          status?: string | null
          summary?: string | null
          user_id: string
          vote?: string | null
        }
        Update: {
          confidence?: number | null
          cons?: string[] | null
          created_at?: string
          id?: string
          impact_score?: number | null
          llm_trace?: string | null
          persona_match?: number | null
          proposal_id?: string
          pros?: string[] | null
          status?: string | null
          summary?: string | null
          user_id?: string
          vote?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decisions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      delegated_daos: {
        Row: {
          created_at: string
          dao_id: string
          id: string
          is_delegated: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dao_id: string
          id?: string
          is_delegated?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dao_id?: string
          id?: string
          is_delegated?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delegated_daos_dao_id_fkey"
            columns: ["dao_id"]
            isOneToOne: false
            referencedRelation: "daos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegated_daos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      persona: {
        Row: {
          esg: number | null
          freq_limit: number | null
          horizon: string | null
          risk: number | null
          summary: string | null
          treasury: number | null
          user_id: string
        }
        Insert: {
          esg?: number | null
          freq_limit?: number | null
          horizon?: string | null
          risk?: number | null
          summary?: string | null
          treasury?: number | null
          user_id: string
        }
        Update: {
          esg?: number | null
          freq_limit?: number | null
          horizon?: string | null
          risk?: number | null
          summary?: string | null
          treasury?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "persona_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          calldata: string | null
          dao_id: string
          end_time: string | null
          id: string
          start_time: string | null
          status: string | null
          title: string
        }
        Insert: {
          calldata?: string | null
          dao_id: string
          end_time?: string | null
          id: string
          start_time?: string | null
          status?: string | null
          title: string
        }
        Update: {
          calldata?: string | null
          dao_id?: string
          end_time?: string | null
          id?: string
          start_time?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_dao_id_fkey"
            columns: ["dao_id"]
            isOneToOne: false
            referencedRelation: "daos"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          ens: string | null
          id: string
          pro: boolean | null
          wallet: string
        }
        Insert: {
          created_at?: string
          ens?: string | null
          id: string
          pro?: boolean | null
          wallet: string
        }
        Update: {
          created_at?: string
          ens?: string | null
          id?: string
          pro?: boolean | null
          wallet?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          cast_at: string | null
          id: string
          proposal_id: string
          tx_hash: string | null
          user_id: string
          vote: string
        }
        Insert: {
          cast_at?: string | null
          id?: string
          proposal_id: string
          tx_hash?: string | null
          user_id: string
          vote: string
        }
        Update: {
          cast_at?: string | null
          id?: string
          proposal_id?: string
          tx_hash?: string | null
          user_id?: string
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
