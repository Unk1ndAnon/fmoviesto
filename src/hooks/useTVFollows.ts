import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TVFollow {
  id: string;
  user_id: string;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  last_season: number;
  last_episode: number;
  last_air_date: string | null;
  created_at: string;
  updated_at: string;
}

interface AddFollowParams {
  tmdb_id: number;
  title: string;
  poster_path?: string | null;
  last_season?: number;
  last_episode?: number;
  last_air_date?: string | null;
}

export function useTVFollows() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: follows = [], isLoading } = useQuery({
    queryKey: ["tv_follows", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("tv_follows")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TVFollow[];
    },
    enabled: !!user,
  });

  const followShow = useMutation({
    mutationFn: async (item: AddFollowParams) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("tv_follows").insert({
        user_id: user.id,
        tmdb_id: item.tmdb_id,
        title: item.title,
        poster_path: item.poster_path,
        last_season: item.last_season || 1,
        last_episode: item.last_episode || 1,
        last_air_date: item.last_air_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tv_follows"] });
      toast.success("Now following this show! You'll be notified of new episodes.");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("Already following this show");
      } else {
        toast.error("Failed to follow show");
      }
    },
  });

  const unfollowShow = useMutation({
    mutationFn: async (tmdb_id: number) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("tv_follows")
        .delete()
        .eq("user_id", user.id)
        .eq("tmdb_id", tmdb_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tv_follows"] });
      toast.success("Unfollowed show");
    },
    onError: () => {
      toast.error("Failed to unfollow show");
    },
  });

  const updateFollow = useMutation({
    mutationFn: async ({ tmdb_id, last_season, last_episode, last_air_date }: { 
      tmdb_id: number; 
      last_season: number; 
      last_episode: number;
      last_air_date?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("tv_follows")
        .update({ 
          last_season, 
          last_episode,
          last_air_date,
        })
        .eq("user_id", user.id)
        .eq("tmdb_id", tmdb_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tv_follows"] });
    },
  });

  const isFollowing = (tmdb_id: number) => {
    return follows.some((f) => f.tmdb_id === tmdb_id);
  };

  const getFollow = (tmdb_id: number) => {
    return follows.find((f) => f.tmdb_id === tmdb_id);
  };

  return { follows, isLoading, followShow, unfollowShow, updateFollow, isFollowing, getFollow };
}
