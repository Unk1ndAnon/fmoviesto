import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Feature flag - set to true to enable Christmas movies database queries
const CHRISTMAS_MOVIES_DB_ENABLED = false;

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  seo_title: string | null;
  seo_description: string | null;
  is_published: boolean;
  noindex: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionMovie {
  id: string;
  collection_id: string;
  tmdb_id: number;
  media_type: string;
  display_order: number;
  is_featured: boolean;
  created_at: string;
}

export function useCollection(slug: string | undefined) {
  return useQuery({
    queryKey: ["collection", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      return data as Collection | null;
    },
    enabled: !!slug,
  });
}

export function useCollectionMovies(collectionId: string | undefined) {
  return useQuery({
    queryKey: ["collection-movies", collectionId],
    queryFn: async () => {
      if (!collectionId) return [];
      const { data, error } = await supabase
        .from("collection_movies")
        .select("*")
        .eq("collection_id", collectionId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return (data || []) as CollectionMovie[];
    },
    enabled: !!collectionId,
  });
}

export function useCollections(options?: { publishedOnly?: boolean }) {
  return useQuery({
    queryKey: ["collections", options],
    queryFn: async () => {
      let query = supabase
        .from("collections")
        .select("*")
        .order("display_order", { ascending: true });

      if (options?.publishedOnly) {
        query = query.eq("is_published", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Collection[];
    },
  });
}

export function useChristmasMovies(limit: number = 12) {
  return useQuery({
    queryKey: ["christmas-movies", limit],
    queryFn: async () => {
      // Feature disabled - skip database query
      if (!CHRISTMAS_MOVIES_DB_ENABLED) {
        return [];
      }
      
      // Get the Christmas Movies collection
      const { data: collection, error: collectionError } = await supabase
        .from("collections")
        .select("id")
        .eq("slug", "christmas-movies")
        .eq("is_published", true)
        .maybeSingle();

      if (collectionError) throw collectionError;
      if (!collection) return [];

      // Get movies from the collection
      const { data: movies, error: moviesError } = await supabase
        .from("collection_movies")
        .select("tmdb_id, media_type, is_featured")
        .eq("collection_id", collection.id)
        .order("is_featured", { ascending: false })
        .order("display_order", { ascending: true })
        .limit(limit);

      if (moviesError) throw moviesError;
      return movies || [];
    },
    enabled: CHRISTMAS_MOVIES_DB_ENABLED,
  });
}
