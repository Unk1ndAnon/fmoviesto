import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ListItem {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  vote_average: number | null;
  release_date: string | null;
  created_at: string;
}

interface AddItemParams {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path?: string | null;
  vote_average?: number | null;
  release_date?: string | null;
}

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ListItem[];
    },
    enabled: !!user,
  });

  const addFavorite = useMutation({
    mutationFn: async (item: AddItemParams) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("favorites").insert({
        user_id: user.id,
        tmdb_id: item.tmdb_id,
        media_type: item.media_type,
        title: item.title,
        poster_path: item.poster_path,
        vote_average: item.vote_average,
        release_date: item.release_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success("Added to favorites");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("Already in favorites");
      } else {
        toast.error("Failed to add to favorites");
      }
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async ({ tmdb_id, media_type }: { tmdb_id: number; media_type: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("tmdb_id", tmdb_id)
        .eq("media_type", media_type);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success("Removed from favorites");
    },
    onError: () => {
      toast.error("Failed to remove from favorites");
    },
  });

  const isFavorite = (tmdb_id: number, media_type: string) => {
    return favorites.some((f) => f.tmdb_id === tmdb_id && f.media_type === media_type);
  };

  return { favorites, isLoading, addFavorite, removeFavorite, isFavorite };
}

export function useWatchlist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: watchlist = [], isLoading } = useQuery({
    queryKey: ["watchlist", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("watchlist")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ListItem[];
    },
    enabled: !!user,
  });

  const addToWatchlist = useMutation({
    mutationFn: async (item: AddItemParams) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("watchlist").insert({
        user_id: user.id,
        tmdb_id: item.tmdb_id,
        media_type: item.media_type,
        title: item.title,
        poster_path: item.poster_path,
        vote_average: item.vote_average,
        release_date: item.release_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      toast.success("Added to watchlist");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("Already in watchlist");
      } else {
        toast.error("Failed to add to watchlist");
      }
    },
  });

  const removeFromWatchlist = useMutation({
    mutationFn: async ({ tmdb_id, media_type }: { tmdb_id: number; media_type: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("watchlist")
        .delete()
        .eq("user_id", user.id)
        .eq("tmdb_id", tmdb_id)
        .eq("media_type", media_type);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      toast.success("Removed from watchlist");
    },
    onError: () => {
      toast.error("Failed to remove from watchlist");
    },
  });

  const isInWatchlist = (tmdb_id: number, media_type: string) => {
    return watchlist.some((w) => w.tmdb_id === tmdb_id && w.media_type === media_type);
  };

  return { watchlist, isLoading, addToWatchlist, removeFromWatchlist, isInWatchlist };
}
