import { useQuery } from "@tanstack/react-query";

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
      const params = new URLSearchParams();
      if (imdbId) params.set("imdbId", imdbId);
      if (title) params.set("title", title);
      if (year) params.set("year", year);

      const response = await fetch(`/api/omdb-ratings?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        console.error("OMDB API error:", response.statusText);
        return null;
      }

      return response.json() as Promise<OMDBData>;
    },
    enabled: !!(imdbId || title),
    staleTime: 1000 * 60 * 60, // 1 hour cache
    retry: false,
  });
}
