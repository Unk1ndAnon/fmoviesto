import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OMDBRatings {
  imdb?: string;
  rottenTomatoes?: string;
  metacritic?: string;
}

interface OMDBData {
  ratings: OMDBRatings;
  imdbId?: string;
  imdbVotes?: string;
  boxOffice?: string;
  awards?: string;
}

export function useOMDBRatings(imdbId?: string, title?: string, year?: string) {
  return useQuery({
    queryKey: ["omdb-ratings", imdbId, title, year],
    queryFn: async (): Promise<OMDBData | null> => {
      const { data, error } = await supabase.functions.invoke("omdb-ratings", {
        body: { imdbId, title, year },
      });

      if (error) {
        console.error("OMDB API error:", error);
        return null;
      }

      return data as OMDBData;
    },
    enabled: !!(imdbId || title),
    staleTime: 1000 * 60 * 60, // 1 hour cache
    retry: false,
  });
}
