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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_movies: {
        Row: {
          created_at: string
          custom_backdrop: string | null
          custom_description: string | null
          custom_poster: string | null
          custom_title: string | null
          featured: boolean | null
          hidden: boolean | null
          id: string
          media_type: string
          original_title: string | null
          tmdb_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_backdrop?: string | null
          custom_description?: string | null
          custom_poster?: string | null
          custom_title?: string | null
          featured?: boolean | null
          hidden?: boolean | null
          id?: string
          media_type: string
          original_title?: string | null
          tmdb_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_backdrop?: string | null
          custom_description?: string | null
          custom_poster?: string | null
          custom_title?: string | null
          featured?: boolean | null
          hidden?: boolean | null
          id?: string
          media_type?: string
          original_title?: string | null
          tmdb_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      collection_movies: {
        Row: {
          collection_id: string
          created_at: string | null
          display_order: number | null
          id: string
          is_featured: boolean | null
          media_type: string
          tmdb_id: number
        }
        Insert: {
          collection_id: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_featured?: boolean | null
          media_type?: string
          tmdb_id: number
        }
        Update: {
          collection_id?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_featured?: boolean | null
          media_type?: string
          tmdb_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_movies_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_tags: {
        Row: {
          collection_id: string
          created_at: string | null
          display_order: number | null
          id: string
          tag_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          tag_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_tags_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          cover_image: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_published: boolean | null
          name: string
          noindex: boolean | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_published?: boolean | null
          name: string
          noindex?: boolean | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_published?: boolean | null
          name?: string
          noindex?: boolean | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      custom_embeds: {
        Row: {
          admin_movie_id: string
          created_at: string
          id: string
          language: string | null
          name: string
          quality: string | null
          url: string
        }
        Insert: {
          admin_movie_id: string
          created_at?: string
          id?: string
          language?: string | null
          name: string
          quality?: string | null
          url: string
        }
        Update: {
          admin_movie_id?: string
          created_at?: string
          id?: string
          language?: string | null
          name?: string
          quality?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_embeds_admin_movie_id_fkey"
            columns: ["admin_movie_id"]
            isOneToOne: false
            referencedRelation: "admin_movies"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          media_type: string
          poster_path: string | null
          release_date: string | null
          title: string
          tmdb_id: number
          user_id: string
          vote_average: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          media_type: string
          poster_path?: string | null
          release_date?: string | null
          title: string
          tmdb_id: number
          user_id: string
          vote_average?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          media_type?: string
          poster_path?: string | null
          release_date?: string | null
          title?: string
          tmdb_id?: number
          user_id?: string
          vote_average?: number | null
        }
        Relationships: []
      }
      movie_meta: {
        Row: {
          created_at: string | null
          id: string
          last_fetch_at: string | null
          media_type: string
          tag_count: number | null
          tagged_at: string | null
          tmdb_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_fetch_at?: string | null
          media_type?: string
          tag_count?: number | null
          tagged_at?: string | null
          tmdb_id: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_fetch_at?: string | null
          media_type?: string
          tag_count?: number | null
          tagged_at?: string | null
          tmdb_id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      movie_tags: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          media_type: string
          source: string
          tag_id: string
          tmdb_id: number
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          media_type?: string
          source?: string
          tag_id: string
          tmdb_id: number
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          media_type?: string
          source?: string
          tag_id?: string
          tmdb_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "movie_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_notifications: boolean
          id: string
          new_episodes: boolean
          recommendations: boolean
          show_updates: boolean
          system_updates: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          new_episodes?: boolean
          recommendations?: boolean
          show_updates?: boolean
          system_updates?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          new_episodes?: boolean
          recommendations?: boolean
          show_updates?: boolean
          system_updates?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          episode_number: number | null
          id: string
          is_read: boolean
          media_type: string | null
          message: string
          poster_path: string | null
          season_number: number | null
          title: string
          tmdb_id: number | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          episode_number?: number | null
          id?: string
          is_read?: boolean
          media_type?: string | null
          message: string
          poster_path?: string | null
          season_number?: number | null
          title: string
          tmdb_id?: number | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          episode_number?: number | null
          id?: string
          is_read?: boolean
          media_type?: string | null
          message?: string
          poster_path?: string | null
          season_number?: number | null
          title?: string
          tmdb_id?: number | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      share_stats: {
        Row: {
          id: string
          total_shares: number
          updated_at: string
        }
        Insert: {
          id?: string
          total_shares?: number
          updated_at?: string
        }
        Update: {
          id?: string
          total_shares?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_visits: {
        Row: {
          country: string | null
          id: string
          language: string | null
          media_type: string | null
          page_path: string
          referrer_domain: string | null
          referrer_path: string | null
          referrer_url: string | null
          screen_height: number | null
          screen_width: number | null
          session_id: string
          source_type: string
          tmdb_id: number | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visited_at: string
        }
        Insert: {
          country?: string | null
          id?: string
          language?: string | null
          media_type?: string | null
          page_path: string
          referrer_domain?: string | null
          referrer_path?: string | null
          referrer_url?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id: string
          source_type?: string
          tmdb_id?: number | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visited_at?: string
        }
        Update: {
          country?: string | null
          id?: string
          language?: string | null
          media_type?: string | null
          page_path?: string
          referrer_domain?: string | null
          referrer_path?: string | null
          referrer_url?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id?: string
          source_type?: string
          tmdb_id?: number | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visited_at?: string
        }
        Relationships: []
      }
      tag_jobs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          input_data: Json | null
          media_type: string
          output_tags: Json | null
          processed_at: string | null
          retries: number | null
          status: string
          tmdb_id: number
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          media_type?: string
          output_tags?: Json | null
          processed_at?: string | null
          retries?: number | null
          status?: string
          tmdb_id: number
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          media_type?: string
          output_tags?: Json | null
          processed_at?: string | null
          retries?: number | null
          status?: string
          tmdb_id?: number
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_featured: boolean | null
          movie_count: number | null
          name: string
          noindex: boolean | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          source: string | null
          tag_type: string
          tmdb_id: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          movie_count?: number | null
          name: string
          noindex?: boolean | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          source?: string | null
          tag_type?: string
          tmdb_id?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          movie_count?: number | null
          name?: string
          noindex?: boolean | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          source?: string | null
          tag_type?: string
          tmdb_id?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tv_follows: {
        Row: {
          created_at: string
          id: string
          last_air_date: string | null
          last_episode: number | null
          last_season: number | null
          poster_path: string | null
          title: string
          tmdb_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_air_date?: string | null
          last_episode?: number | null
          last_season?: number | null
          poster_path?: string | null
          title: string
          tmdb_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_air_date?: string | null
          last_episode?: number | null
          last_season?: number | null
          poster_path?: string | null
          title?: string
          tmdb_id?: number
          updated_at?: string
          user_id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      watch_events: {
        Row: {
          episode: number | null
          id: string
          last_ping: string
          media_type: string
          season: number | null
          session_id: string
          started_at: string
          tmdb_id: number
        }
        Insert: {
          episode?: number | null
          id?: string
          last_ping?: string
          media_type: string
          season?: number | null
          session_id: string
          started_at?: string
          tmdb_id: number
        }
        Update: {
          episode?: number | null
          id?: string
          last_ping?: string
          media_type?: string
          season?: number | null
          session_id?: string
          started_at?: string
          tmdb_id?: number
        }
        Relationships: []
      }
      watch_party_members: {
        Row: {
          display_name: string
          id: string
          is_host: boolean
          joined_at: string
          last_ping: string
          room_id: string
          session_id: string
        }
        Insert: {
          display_name?: string
          id?: string
          is_host?: boolean
          joined_at?: string
          last_ping?: string
          room_id: string
          session_id: string
        }
        Update: {
          display_name?: string
          id?: string
          is_host?: boolean
          joined_at?: string
          last_ping?: string
          room_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_party_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "watch_party_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_party_messages: {
        Row: {
          created_at: string
          display_name: string
          id: string
          message: string
          message_type: string
          room_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id?: string
          message: string
          message_type?: string
          room_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          message?: string
          message_type?: string
          room_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_party_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "watch_party_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_party_rooms: {
        Row: {
          created_at: string
          episode: number | null
          host_session_id: string
          id: string
          is_playing: boolean
          is_public: boolean
          last_activity_at: string
          max_members: number
          media_type: string
          playback_time: number
          room_code: string | null
          room_name: string | null
          season: number | null
          tmdb_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          episode?: number | null
          host_session_id: string
          id?: string
          is_playing?: boolean
          is_public?: boolean
          last_activity_at?: string
          max_members?: number
          media_type?: string
          playback_time?: number
          room_code?: string | null
          room_name?: string | null
          season?: number | null
          tmdb_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          episode?: number | null
          host_session_id?: string
          id?: string
          is_playing?: boolean
          is_public?: boolean
          last_activity_at?: string
          max_members?: number
          media_type?: string
          playback_time?: number
          room_code?: string | null
          room_name?: string | null
          season?: number | null
          tmdb_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          created_at: string | null
          id: string
          media_type: string
          poster_path: string | null
          release_date: string | null
          title: string
          tmdb_id: number
          user_id: string
          vote_average: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          media_type: string
          poster_path?: string | null
          release_date?: string | null
          title: string
          tmdb_id: number
          user_id: string
          vote_average?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          media_type?: string
          poster_path?: string | null
          release_date?: string | null
          title?: string
          tmdb_id?: number
          user_id?: string
          vote_average?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_site_visits: { Args: never; Returns: number }
      cleanup_old_watch_events: { Args: never; Returns: number }
      generate_room_code: { Args: never; Returns: string }
      get_all_watching_now: {
        Args: { p_limit?: number }
        Returns: {
          media_type: string
          tmdb_id: number
          viewer_count: number
        }[]
      }
      get_geo_distribution: {
        Args: { p_days?: number }
        Returns: {
          country: string
          percentage: number
          unique_sessions: number
          visit_count: number
        }[]
      }
      get_most_watched: {
        Args: { p_hours: number; p_limit?: number }
        Returns: {
          media_type: string
          tmdb_id: number
          view_count: number
        }[]
      }
      get_realtime_site_stats: {
        Args: never
        Returns: {
          active_visitors: number
          top_countries: Json
          top_pages: Json
          visitors_last_hour: number
          visitors_today: number
        }[]
      }
      get_referrer_watch_stats: {
        Args: { p_days?: number; p_limit?: number }
        Returns: {
          avg_pages_per_session: number
          referrer_domain: string
          unique_sessions: number
          visit_count: number
          watch_events: number
        }[]
      }
      get_source_distribution: {
        Args: { p_days?: number }
        Returns: {
          percentage: number
          source_type: string
          visit_count: number
        }[]
      }
      get_top_referrers: {
        Args: { p_days?: number; p_limit?: number }
        Returns: {
          referrer_domain: string
          source_type: string
          unique_sessions: number
          visit_count: number
        }[]
      }
      get_watching_now: {
        Args: { p_media_type: string; p_tmdb_id: number }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_share_count: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
