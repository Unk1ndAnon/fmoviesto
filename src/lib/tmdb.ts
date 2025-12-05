const TMDB_API_KEY = "1e61d290e56866f3b6c22d63a28c6e69";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

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

export const getImageUrl = (path: string | null, size: string = "w500"): string => {
  if (!path) return "/placeholder.svg";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

export const getBackdropUrl = (path: string | null, size: string = "original"): string => {
  if (!path) return "";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

async function fetchTMDB<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }
  return response.json();
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

  // TV Shows
  getTrendingTV: (timeWindow: "day" | "week" = "week") =>
    fetchTMDB<{ results: TVShow[] }>(`/trending/tv/${timeWindow}`),

  getPopularTV: (page: number = 1) =>
    fetchTMDB<{ results: TVShow[]; total_pages: number }>("/tv/popular", { page: String(page) }),

  getTopRatedTV: (page: number = 1) =>
    fetchTMDB<{ results: TVShow[]; total_pages: number }>("/tv/top_rated", { page: String(page) }),

  getTVDetails: (id: number) =>
    fetchTMDB<TVShow>(`/tv/${id}`, { append_to_response: "videos,credits,similar" }),

  getSeasonDetails: (tvId: number, seasonNumber: number) =>
    fetchTMDB<{ episodes: Episode[] }>(`/tv/${tvId}/season/${seasonNumber}`),

  // Search
  searchMulti: (query: string, page: number = 1) =>
    fetchTMDB<SearchResult>("/search/multi", { query, page: String(page) }),

  searchMovies: (query: string, page: number = 1) =>
    fetchTMDB<{ results: Movie[]; total_pages: number }>("/search/movie", { query, page: String(page) }),

  searchTV: (query: string, page: number = 1) =>
    fetchTMDB<{ results: TVShow[]; total_pages: number }>("/search/tv", { query, page: String(page) }),

  // Genres
  getMovieGenres: () => fetchTMDB<{ genres: Genre[] }>("/genre/movie/list"),
  getTVGenres: () => fetchTMDB<{ genres: Genre[] }>("/genre/tv/list"),
};

export const EMBED_SOURCES = [
  { name: "VidSrc", url: (id: number, type: "movie" | "tv") => `https://vidsrc.xyz/embed/${type}/${id}` },
  { name: "VidSrc.me", url: (id: number, type: "movie" | "tv") => `https://vidsrc.net/embed/${type}/?tmdb=${id}` },
  { name: "2Embed", url: (id: number, type: "movie" | "tv") => `https://www.2embed.cc/embed/${id}` },
  { name: "SuperEmbed", url: (id: number, type: "movie" | "tv") => `https://multiembed.mov/?video_id=${id}&tmdb=1` },
  { name: "NontonGo", url: (id: number, type: "movie" | "tv") => `https://www.NontonGo.win/embed/${type}/${id}` },
];

export const getEmbedUrl = (id: number, type: "movie" | "tv", sourceIndex: number = 0, season?: number, episode?: number): string => {
  const source = EMBED_SOURCES[sourceIndex] || EMBED_SOURCES[0];
  let url = source.url(id, type);
  
  if (type === "tv" && season !== undefined && episode !== undefined) {
    if (sourceIndex === 0) {
      url = `https://vidsrc.xyz/embed/tv/${id}/${season}/${episode}`;
    } else if (sourceIndex === 1) {
      url = `https://vidsrc.net/embed/tv/?tmdb=${id}&season=${season}&episode=${episode}`;
    } else if (sourceIndex === 3) {
      url = `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}`;
    }
  }
  
  return url;
};
