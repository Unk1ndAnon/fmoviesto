import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

const FAVORITES_KEY = "fmovies_favorites";
const WATCHLIST_KEY = "fmovies_watchlist";

const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const getStoredList = (key: string, userId: string): ListItem[] => {
  const stored = localStorage.getItem(key);
  if (!stored) return [];
  try {
    const all = JSON.parse(stored) as ListItem[];
    return all.filter(item => item.user_id === userId);
  } catch {
    return [];
  }
};

const saveList = (key: string, items: ListItem[]) => {
  localStorage.setItem(key, JSON.stringify(items));
};

const getAllItems = (key: string): ListItem[] => {
  const stored = localStorage.getItem(key);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as ListItem[];
  } catch {
    return [];
  }
};

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      return getStoredList(FAVORITES_KEY, user.id);
    },
    enabled: !!user,
  });

  const addFavorite = useMutation({
    mutationFn: async (item: AddItemParams) => {
      if (!user) throw new Error("Not authenticated");
      
      const allItems = getAllItems(FAVORITES_KEY);
      
      // Check for duplicates
      const exists = allItems.some(
        f => f.user_id === user.id && f.tmdb_id === item.tmdb_id && f.media_type === item.media_type
      );
      
      if (exists) {
        throw new Error("duplicate");
      }

      const newItem: ListItem = {
        id: generateId(),
        user_id: user.id,
        tmdb_id: item.tmdb_id,
        media_type: item.media_type,
        title: item.title,
        poster_path: item.poster_path || null,
        vote_average: item.vote_average || null,
        release_date: item.release_date || null,
        created_at: new Date().toISOString(),
      };

      allItems.push(newItem);
      saveList(FAVORITES_KEY, allItems);
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
      
      const allItems = getAllItems(FAVORITES_KEY);
      const filtered = allItems.filter(
        f => !(f.user_id === user.id && f.tmdb_id === tmdb_id && f.media_type === media_type)
      );
      saveList(FAVORITES_KEY, filtered);
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
      return getStoredList(WATCHLIST_KEY, user.id);
    },
    enabled: !!user,
  });

  const addToWatchlist = useMutation({
    mutationFn: async (item: AddItemParams) => {
      if (!user) throw new Error("Not authenticated");
      
      const allItems = getAllItems(WATCHLIST_KEY);
      
      // Check for duplicates
      const exists = allItems.some(
        w => w.user_id === user.id && w.tmdb_id === item.tmdb_id && w.media_type === item.media_type
      );
      
      if (exists) {
        throw new Error("duplicate");
      }

      const newItem: ListItem = {
        id: generateId(),
        user_id: user.id,
        tmdb_id: item.tmdb_id,
        media_type: item.media_type,
        title: item.title,
        poster_path: item.poster_path || null,
        vote_average: item.vote_average || null,
        release_date: item.release_date || null,
        created_at: new Date().toISOString(),
      };

      allItems.push(newItem);
      saveList(WATCHLIST_KEY, allItems);
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
      
      const allItems = getAllItems(WATCHLIST_KEY);
      const filtered = allItems.filter(
        w => !(w.user_id === user.id && w.tmdb_id === tmdb_id && w.media_type === media_type)
      );
      saveList(WATCHLIST_KEY, filtered);
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
