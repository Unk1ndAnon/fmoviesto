import { supabase } from "@/integrations/supabase/client";
import { getCachedData, setCachedData, generateCacheKey, isCacheFresh, isCacheStale } from "@/lib/apiCache";
import { isVercelDeployment } from "@/lib/api-config";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

// In-flight request deduplication
const pendingRequests = new Map<string, Promise<unknown>>();

export interface Movie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  genres?: Genre[];
  runtime?: number;
  tagline?: string;
  status?: string;
  budget?: number;
  revenue?: number;
  production_companies?: ProductionCompany[];
  spoken_languages?: SpokenLanguage[];
  videos?: { results: Video[] };
  credits?: { cast: Cast[]; crew: Crew[] };
  similar?: { results: Movie[] };
  recommendations?: { results: Movie[] };
}

export interface NextEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  air_date: string;
  still_path: string | null;
  runtime: number | null;
}

export interface Network {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface TVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  genres?: Genre[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
  status?: string;
  tagline?: string;
  created_by?: Creator[];
  seasons?: Season[];
  videos?: { results: Video[] };
  credits?: { cast: Cast[]; crew: Crew[] };
  similar?: { results: TVShow[] };
  next_episode_to_air?: NextEpisode | null;
  last_episode_to_air?: NextEpisode | null;
  networks?: Network[];
  origin_country?: string[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface ProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
}

export interface SpokenLanguage {
  iso_639_1: string;
  name: string;
  english_name: string;
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface Cast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface Crew {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface Creator {
  id: number;
  name: string;
  profile_path: string | null;
}

export interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date: string;
  poster_path: string | null;
  overview: string;
}

export interface Episode {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  air_date: string;
  overview: string;
  still_path: string | null;
  vote_average: number;
  runtime: number;
}

export interface SearchResult {
  page: number;
  results: (Movie | TVShow)[];
  total_pages: number;
  total_results: number;
}

export const getImageUrl = (path: string | null, size: string = "w780"): string => {
  if (!path) return "/placeholder.svg";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

export const getBackdropUrl = (path: string | null, size: string = "original"): string => {
  if (!path) return "";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

// High-quality poster for detail pages
export const getPosterUrl = (path: string | null, size: "w342" | "w500" | "w780" | "original" = "w780"): string => {
  if (!path) return "/placeholder.svg";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

async function fetchTMDBViaVercel<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const response = await fetch('/api/tmdb-proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ endpoint, params }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error: ${response.status}`);
  }

  return response.json();
}

async function fetchTMDBViaSupabase<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('tmdb-proxy', {
    body: { endpoint, params }
  });

  if (error) {
    console.error('TMDB proxy error:', error);
    throw new Error(`TMDB API error: ${error.message}`);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as T;
}

async function fetchTMDB<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const cacheKey = generateCacheKey(endpoint, params);
  
  // Check for cached data first
  const cached = getCachedData<T>(cacheKey);
  
  // If cache is fresh, return immediately
  if (cached && isCacheFresh(cacheKey)) {
    return cached;
  }
  
  // If cache is stale but valid, return it immediately and revalidate in background
  if (cached && isCacheStale(cacheKey)) {
    // Revalidate in background without blocking
    revalidateInBackground(endpoint, params, cacheKey);
    return cached;
  }
  
  // Check for pending request (deduplication)
  const pendingKey = cacheKey;
  if (pendingRequests.has(pendingKey)) {
    return pendingRequests.get(pendingKey) as Promise<T>;
  }
  
  // Create new request
  const requestPromise = (async (): Promise<T> => {
    try {
      let data: T;
      
      if (isVercelDeployment()) {
        data = await fetchTMDBViaVercel<T>(endpoint, params);
      } else {
        data = await fetchTMDBViaSupabase<T>(endpoint, params);
      }

      setCachedData(cacheKey, data);
      return data;
    } catch (e) {
      // Network error - try cache fallback
      if (cached) {
        console.log('Using cached data as fallback for:', endpoint);
        return cached;
      }
      throw e;
    } finally {
      pendingRequests.delete(pendingKey);
    }
  })();
  
  pendingRequests.set(pendingKey, requestPromise);
  return requestPromise;
}

// Background revalidation for stale-while-revalidate pattern
function revalidateInBackground(endpoint: string, params: Record<string, string>, cacheKey: string): void {
  (async () => {
    try {
      let data;
      if (isVercelDeployment()) {
        data = await fetchTMDBViaVercel(endpoint, params);
      } else {
        data = await fetchTMDBViaSupabase(endpoint, params);
      }
      setCachedData(cacheKey, data);
    } catch {
      // Silently fail background revalidation
    }
  })();
}

export const tmdb = {
  // Movies
  getTrending: (timeWindow: "day" | "week" = "week") =>
    fetchTMDB<{ results: Movie[] }>(`/trending/movie/${timeWindow}`),

  getPopular: (page: number = 1) =>
    fetchTMDB<{ results: Movie[]; total_pages: number }>("/movie/popular", { page: String(page) }),

  getTopRated: (page: number = 1) =>
    fetchTMDB<{ results: Movie[]; total_pages: number }>("/movie/top_rated", { page: String(page) }),

  getNowPlaying: (page: number = 1) =>
    fetchTMDB<{ results: Movie[]; total_pages: number }>("/movie/now_playing", { page: String(page) }),

  getUpcoming: (page: number = 1) =>
    fetchTMDB<{ results: Movie[]; total_pages: number }>("/movie/upcoming", { page: String(page) }),

  getMovieDetails: (id: number) =>
    fetchTMDB<Movie>(`/movie/${id}`, { append_to_response: "videos,credits,similar,recommendations" }),

  getMoviesByGenre: (genreId: number, page: number = 1) =>
    fetchTMDB<{ results: Movie[]; total_pages: number }>("/discover/movie", {
      with_genres: String(genreId),
      page: String(page),
      sort_by: "popularity.desc",
    }),

  discoverMovies: (params: Record<string, string>) =>
    fetchTMDB<{ results: Movie[]; total_pages: number }>("/discover/movie", params),

  // TV Shows
  getTrendingTV: (timeWindow: "day" | "week" = "week") =>
    fetchTMDB<{ results: TVShow[] }>(`/trending/tv/${timeWindow}`),

  getPopularTV: (page: number = 1) =>
    fetchTMDB<{ results: TVShow[]; total_pages: number }>("/tv/popular", { page: String(page) }),

  getTopRatedTV: (page: number = 1) =>
    fetchTMDB<{ results: TVShow[]; total_pages: number }>("/tv/top_rated", { page: String(page) }),

  getOnTheAirTV: (page: number = 1) =>
    fetchTMDB<{ results: TVShow[]; total_pages: number }>("/tv/on_the_air", { page: String(page) }),

  getAiringTodayTV: (page: number = 1) =>
    fetchTMDB<{ results: TVShow[]; total_pages: number }>("/tv/airing_today", { page: String(page) }),

  getTVDetails: (id: number) =>
    fetchTMDB<TVShow>(`/tv/${id}`, { append_to_response: "videos,credits,similar" }),

  getSeasonDetails: (tvId: number, seasonNumber: number) =>
    fetchTMDB<{ episodes: Episode[] }>(`/tv/${tvId}/season/${seasonNumber}`),

  discoverTV: (params: Record<string, string>) =>
    fetchTMDB<{ results: TVShow[]; total_pages: number }>("/discover/tv", params),

  // Search
  searchMulti: (query: string, page: number = 1) =>
    fetchTMDB<SearchResult>("/search/multi", { query, page: String(page) }),

  searchMovies: (query: string, page: number = 1) =>
    fetchTMDB<{ results: Movie[]; total_pages: number }>("/search/movie", { query, page: String(page) }),

  searchTV: (query: string, page: number = 1) =>
    fetchTMDB<{ results: TVShow[]; total_pages: number }>("/search/tv", { query, page: String(page) }),

  // Search and get best matching result (for slug-based routing)
  searchMovieByTitle: async (title: string): Promise<Movie | null> => {
    // First try standard search
    let result = await fetchTMDB<{ results: Movie[] }>("/search/movie", { query: title });
    
    // If no results and title might have been mangled, try variations
    if (!result.results || result.results.length === 0) {
      // Try adding common letter variations (e.g., "b hubali" -> "bahubali")
      const altTitle = title.replace(/^b\s+/i, "ba").replace(/^bah\s+/i, "bahu");
      result = await fetchTMDB<{ results: Movie[] }>("/search/movie", { query: altTitle });
    }
    
    // Still no results? Try recent years (2024-2025)
    if (!result.results || result.results.length === 0) {
      result = await fetchTMDB<{ results: Movie[] }>("/search/movie", { 
        query: title, 
        primary_release_year: "2025" 
      });
    }
    
    if (!result.results || result.results.length === 0) return null;
    
    // Normalize title for comparison
    const normalizedSearch = title.toLowerCase().trim();
    
    // Try to find exact match first
    const exactMatch = result.results.find(movie => 
      movie.title.toLowerCase().trim() === normalizedSearch
    );
    if (exactMatch) return exactMatch;
    
    // If no exact match, find the closest match that doesn't have extra numbers/sequels
    const searchWithoutYear = normalizedSearch.replace(/\(\d{4}\)$/, '').trim();
    const closeMatch = result.results.find(movie => {
      const movieTitle = movie.title.toLowerCase().trim();
      // Avoid sequels (titles with numbers like "2", "3", "II", "III", etc.)
      const isSequel = /\s(2|3|4|5|ii|iii|iv|v|part\s*\d)$/i.test(movieTitle) || 
                       /:\s*(part|chapter|episode)\s*\d/i.test(movieTitle);
      return movieTitle === searchWithoutYear && !isSequel;
    });
    if (closeMatch) return closeMatch;
    
    // Return first result as fallback
    return result.results[0];
  },

  searchTVByTitle: async (title: string): Promise<TVShow | null> => {
    const result = await fetchTMDB<{ results: TVShow[] }>("/search/tv", { query: title });
    return result.results[0] || null;
  },

  // Genres
  getMovieGenres: () => fetchTMDB<{ genres: Genre[] }>("/genre/movie/list"),
  getTVGenres: () => fetchTMDB<{ genres: Genre[] }>("/genre/tv/list"),

  // Person
  getPersonDetails: (id: number) =>
    fetchTMDB<{ id: number; name: string; biography: string; profile_path: string | null; known_for_department: string }>(`/person/${id}`),
  
  getPersonFull: (id: number) =>
    fetchTMDB<{ 
      id: number; 
      name: string; 
      biography: string; 
      profile_path: string | null; 
      known_for_department: string;
      birthday: string | null;
      deathday: string | null;
      place_of_birth: string | null;
      also_known_as: string[];
    }>(`/person/${id}`),
  
  getPersonCredits: (id: number) =>
    fetchTMDB<{ cast: Array<{ id: number; title?: string; name?: string; poster_path: string | null; vote_average: number; release_date?: string; first_air_date?: string; media_type: string }> }>(`/person/${id}/combined_credits`),

  getPopularPeople: (page: number = 1) =>
    fetchTMDB<{ results: Array<{ id: number; name: string; profile_path: string | null; known_for_department: string; known_for: Array<{ title?: string; name?: string }> }> }>("/person/popular", { page: String(page) }),

  searchPerson: async (query: string): Promise<{ id: number; name: string; profile_path: string | null } | null> => {
    const result = await fetchTMDB<{ results: Array<{ id: number; name: string; profile_path: string | null }> }>("/search/person", { query });
    return result.results[0] || null;
  },
};

export const EMBED_SOURCES = [
  { name: "Fmov", disabled: true, getUrl: (id: number, type: "movie" | "tv", season?: number, episode?: number) =>
    type === "tv" ? `https://fmov.online/embed/tv/${id}/${season}/${episode}` : `https://fmov.online/embed/movie/${id}` },
  { name: "Vidify", getUrl: (id: number, type: "movie" | "tv", season?: number, episode?: number) =>
    type === "tv" ? `https://player.vidify.top/embed/tv/${id}/${season}/${episode}` : `https://player.vidify.top/embed/movie/${id}` },
  { name: "Videasy", getUrl: (id: number, type: "movie" | "tv", season?: number, episode?: number) => 
    type === "tv" ? `https://player.videasy.net/tv/${id}/${season}/${episode}` : `https://player.videasy.net/movie/${id}` },
  { name: "FMovies4U", getUrl: (id: number, type: "movie" | "tv", season?: number, episode?: number) => 
    type === "tv" ? `https://fmovies4u.com/embed/tmdb-tv-${id}/${season}/${episode}` : `https://fmovies4u.com/embed/tmdb-movie-${id}` },
  { name: "Vidzee", getUrl: (id: number, type: "movie" | "tv", season?: number, episode?: number) => 
    type === "tv" ? `https://player.vidzee.wtf/embed/tv/${id}/${season}/${episode}` : `https://player.vidzee.wtf/embed/movie/${id}` },
  { name: "VidLink", getUrl: (id: number, type: "movie" | "tv", season?: number, episode?: number) => 
    type === "tv" ? `https://vidlink.pro/tv/${id}/${season}/${episode}` : `https://vidlink.pro/movie/${id}` },
  { name: "VidFast", getUrl: (id: number, type: "movie" | "tv", season?: number, episode?: number) => 
    type === "tv" ? `https://vidfast.pro/tv/${id}/${season}/${episode}` : `https://vidfast.pro/movie/${id}` },
  { name: "MoviesAPI", getUrl: (id: number, type: "movie" | "tv", season?: number, episode?: number) => 
    type === "tv" ? `https://moviesapi.to/tv/${id}-${season}-${episode}` : `https://moviesapi.to/movie/${id}` },
  { name: "NontonGo", getUrl: (id: number, type: "movie" | "tv", season?: number, episode?: number) => 
    type === "tv" ? `https://www.nontongo.win/embed/tv/${id}/${season}/${episode}` : `https://www.nontongo.win/embed/movie/${id}` },
  { name: "VidSrc", getUrl: (id: number, type: "movie" | "tv", season?: number, episode?: number) => 
    type === "tv" ? `https://vidsrc-embed.ru/embed/tv/${id}/${season}-${episode}` : `https://vidsrc-embed.ru/embed/${id}` },
  { name: "SuperEmbed", getUrl: (id: number, type: "movie" | "tv", season?: number, episode?: number) => 
    type === "tv" ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}` : `https://multiembed.mov/?video_id=${id}&tmdb=1` },
];

export const getEmbedUrl = (id: number, type: "movie" | "tv", sourceIndex: number = 0, season?: number, episode?: number): string => {
  const source = EMBED_SOURCES[sourceIndex] || EMBED_SOURCES[0];
  return source.getUrl(id, type, season, episode);
};
