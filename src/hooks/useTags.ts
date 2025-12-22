import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Tag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tag_type: string;
  source: string | null;
  movie_count: number;
  is_featured: boolean;
  noindex: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
}

export interface MovieTag {
  id: string;
  tmdb_id: number;
  media_type: string;
  tag_id: string;
  confidence: number;
  source: string;
  created_at: string;
  tag?: Tag;
}

// Fetch tags for a specific movie/TV show
export function useMovieTags(tmdbId: number | undefined, mediaType: string = "movie") {
  return useQuery({
    queryKey: ["movieTags", tmdbId, mediaType],
    queryFn: async () => {
      if (!tmdbId) return [];
      
      const { data, error } = await supabase
        .from("movie_tags")
        .select(`
          id,
          tmdb_id,
          media_type,
          tag_id,
          confidence,
          source,
          created_at,
          tags:tag_id (
            id,
            name,
            slug,
            tag_type,
            movie_count
          )
        `)
        .eq("tmdb_id", tmdbId)
        .eq("media_type", mediaType)
        .order("confidence", { ascending: false });

      if (error) {
        console.error("Error fetching movie tags:", error);
        return [];
      }

      return data.map(mt => ({
        ...mt,
        tag: mt.tags as unknown as Tag
      }));
    },
    enabled: !!tmdbId,
  });
}

// Fetch a single tag by slug
export function useTag(slug: string | undefined) {
  return useQuery({
    queryKey: ["tag", slug],
    queryFn: async () => {
      if (!slug) return null;
      
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) {
        console.error("Error fetching tag:", error);
        return null;
      }

      return data as Tag;
    },
    enabled: !!slug,
  });
}

// Fetch movies by tag with pagination
export function useMoviesByTag(tagId: string | undefined, page: number = 1, pageSize: number = 20) {
  return useQuery({
    queryKey: ["moviesByTag", tagId, page, pageSize],
    queryFn: async () => {
      if (!tagId) return { movies: [], totalCount: 0 };
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from("movie_tags")
        .select("tmdb_id, media_type, confidence", { count: "exact" })
        .eq("tag_id", tagId)
        .order("confidence", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Error fetching movies by tag:", error);
        return { movies: [], totalCount: 0 };
      }

      return { 
        movies: data || [], 
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
    enabled: !!tagId,
  });
}

// Fetch all tags (for browse/discovery pages)
export function useTags(options?: { 
  type?: string; 
  featured?: boolean; 
  limit?: number;
  minMovieCount?: number;
}) {
  return useQuery({
    queryKey: ["tags", options],
    queryFn: async () => {
      let query = supabase
        .from("tags")
        .select("*")
        .order("movie_count", { ascending: false });

      if (options?.type) {
        query = query.eq("tag_type", options.type);
      }

      if (options?.featured) {
        query = query.eq("is_featured", true);
      }

      if (options?.minMovieCount) {
        query = query.gte("movie_count", options.minMovieCount);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching tags:", error);
        return [];
      }

      return data as Tag[];
    },
  });
}

// Fetch popular/trending tags
export function usePopularTags(limit: number = 20) {
  return useQuery({
    queryKey: ["popularTags", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .gte("movie_count", 3)
        .eq("noindex", false)
        .order("movie_count", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching popular tags:", error);
        return [];
      }

      return data as Tag[];
    },
  });
}

// Admin: Trigger batch tagging
export function useBatchTagging() {
  const queryClient = useQueryClient();

  const queueMovies = useMutation({
    mutationFn: async (limit: number = 50) => {
      const { data, error } = await supabase.functions.invoke("batch-tag-movies", {
        body: { action: "queue", limit }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tagJobStats"] });
    }
  });

  const processJobs = useMutation({
    mutationFn: async (limit: number = 5) => {
      const { data, error } = await supabase.functions.invoke("batch-tag-movies", {
        body: { action: "process", limit }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tagJobStats"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    }
  });

  const getStats = useQuery({
    queryKey: ["tagJobStats"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("batch-tag-movies", {
        body: { action: "stats" }
      });

      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // Poll every 5 seconds when on admin page
  });

  return {
    queueMovies,
    processJobs,
    stats: getStats.data,
    isLoading: getStats.isLoading
  };
}

// Get tag type colors for UI
export function getTagTypeColor(type: string): string {
  const colors: Record<string, string> = {
    genre: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    mood: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    theme: "bg-green-500/20 text-green-400 border-green-500/30",
    setting: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    style: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    audience: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    ai: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  };
  return colors[type] || "bg-secondary text-secondary-foreground";
}
