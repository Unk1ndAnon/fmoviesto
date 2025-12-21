import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import { generateSlug } from "@/lib/slug";
import { getMovieGenreSlugFromId, getTVGenreSlugFromId } from "@/lib/genre-descriptions";

// Sanitize string to prevent XSS - only allow safe characters for URLs
const sanitizeUrlPart = (str: string): string => {
  return str.replace(/[^a-zA-Z0-9\-_./]/g, "");
};

interface SitemapUrl {
  loc: string;
  priority: string;
  changefreq: string;
}

export default function SitemapXml() {
  const [episodeUrls, setEpisodeUrls] = useState<SitemapUrl[]>([]);
  const [seasonUrls, setSeasonUrls] = useState<SitemapUrl[]>([]);
  const containerRef = useRef<HTMLPreElement>(null);

  // Fetch more movies for comprehensive sitemap
  const { data: popularMovies } = useQuery({
    queryKey: ["sitemapMovies"],
    queryFn: async () => {
      const pages = await Promise.all([
        tmdb.getPopular(1),
        tmdb.getPopular(2),
        tmdb.getPopular(3),
        tmdb.getPopular(4),
        tmdb.getPopular(5),
        tmdb.getPopular(6),
        tmdb.getPopular(7),
        tmdb.getPopular(8),
        tmdb.getPopular(9),
        tmdb.getPopular(10),
        tmdb.getTopRated(1),
        tmdb.getTopRated(2),
        tmdb.getTopRated(3),
        tmdb.getTopRated(4),
        tmdb.getTopRated(5),
        tmdb.getTrending("day"),
        tmdb.getTrending("week"),
        tmdb.getNowPlaying(1),
      ]);
      const allMovies = pages.flatMap((p) => p.results);
      return [...new Map(allMovies.map((m) => [m.id, m])).values()];
    },
  });

  // Fetch more TV shows
  const { data: popularTV } = useQuery({
    queryKey: ["sitemapTV"],
    queryFn: async () => {
      const pages = await Promise.all([
        tmdb.getPopularTV(1),
        tmdb.getPopularTV(2),
        tmdb.getPopularTV(3),
        tmdb.getPopularTV(4),
        tmdb.getPopularTV(5),
        tmdb.getPopularTV(6),
        tmdb.getPopularTV(7),
        tmdb.getPopularTV(8),
        tmdb.getPopularTV(9),
        tmdb.getPopularTV(10),
        tmdb.getTopRatedTV(1),
        tmdb.getTopRatedTV(2),
        tmdb.getTopRatedTV(3),
        tmdb.getTopRatedTV(4),
        tmdb.getTopRatedTV(5),
        tmdb.getTrendingTV("day"),
        tmdb.getTrendingTV("week"),
        tmdb.getOnTheAirTV(1),
      ]);
      const allShows = pages.flatMap((p) => p.results);
      return [...new Map(allShows.map((s) => [s.id, s])).values()];
    },
  });

  const { data: movieGenres } = useQuery({
    queryKey: ["movieGenres"],
    queryFn: () => tmdb.getMovieGenres(),
  });

  const { data: tvGenres } = useQuery({
    queryKey: ["tvGenres"],
    queryFn: () => tmdb.getTVGenres(),
  });

  // Fetch comprehensive episode data for TV shows
  useEffect(() => {
    if (!popularTV) return;

    const fetchEpisodes = async () => {
      const episodes: SitemapUrl[] = [];
      const seasons: SitemapUrl[] = [];
      
      // Process top 50 shows for comprehensive coverage
      const topShows = popularTV.slice(0, 50);
      
      for (const show of topShows) {
        try {
          const details = await tmdb.getTVDetails(show.id);
          const slug = generateSlug(show.name);
          
          // Add all seasons
          const allSeasons = details.seasons?.filter(s => s.season_number > 0) || [];
          
          for (const season of allSeasons) {
            // Add season URL
            seasons.push({
              loc: sanitizeUrlPart(`/tvshow/${slug}?season=${season.season_number}`),
              priority: "0.7",
              changefreq: "weekly",
            });
            
            try {
              const seasonData = await tmdb.getSeasonDetails(show.id, season.season_number);
              
              for (const episode of seasonData.episodes || []) {
                // Episode watch URL: /watch/{slug}/{season}-{episode}
                episodes.push({
                  loc: sanitizeUrlPart(`/watch/${slug}/${season.season_number}-${episode.episode_number}`),
                  priority: "0.7",
                  changefreq: "weekly",
                });
              }
            } catch (e) {
              // Skip if season details fail
            }
          }
        } catch (e) {
          // Skip if show details fail
        }
      }
      
      setEpisodeUrls(episodes);
      setSeasonUrls(seasons);
    };

    fetchEpisodes();
  }, [popularTV]);

  useEffect(() => {
    if (!popularMovies || !popularTV || !movieGenres || !tvGenres || !containerRef.current) return;

    const baseUrl = "https://fmovies-sigma.vercel.app";
    const today = new Date().toISOString().split("T")[0];

    // Static pages
    const staticPages: SitemapUrl[] = [
      { loc: "/", priority: "1.0", changefreq: "daily" },
      { loc: "/movies", priority: "0.9", changefreq: "daily" },
      { loc: "/tv", priority: "0.9", changefreq: "daily" },
      { loc: "/genres", priority: "0.9", changefreq: "weekly" },
      { loc: "/new-episodes", priority: "0.9", changefreq: "daily" },
      { loc: "/search", priority: "0.8", changefreq: "weekly" },
      { loc: "/people", priority: "0.7", changefreq: "weekly" },
      { loc: "/random", priority: "0.6", changefreq: "weekly" },
      { loc: "/sitemap", priority: "0.5", changefreq: "weekly" },
      { loc: "/privacy", priority: "0.3", changefreq: "monthly" },
      { loc: "/dmca", priority: "0.3", changefreq: "monthly" },
      { loc: "/terms", priority: "0.3", changefreq: "monthly" },
    ];

    // Movie detail pages: /movie/{slug}
    const movieUrls: SitemapUrl[] = popularMovies.map((movie) => ({
      loc: sanitizeUrlPart(`/movie/${generateSlug(movie.title)}`),
      priority: "0.8",
      changefreq: "weekly",
    }));

    // Movie watch pages: /watch/{slug}
    const movieWatchUrls: SitemapUrl[] = popularMovies.map((movie) => ({
      loc: sanitizeUrlPart(`/watch/${generateSlug(movie.title)}`),
      priority: "0.8",
      changefreq: "weekly",
    }));

    // TV show detail pages: /tvshow/{slug}
    const tvUrls: SitemapUrl[] = popularTV.map((show) => ({
      loc: sanitizeUrlPart(`/tvshow/${generateSlug(show.name)}`),
      priority: "0.8",
      changefreq: "weekly",
    }));

    // Dedicated genre pages (SEO-optimized with slugs)
    const dedicatedGenreUrls: SitemapUrl[] = [
      ...movieGenres.genres.map((g) => ({
        loc: sanitizeUrlPart(`/genre/movies/${getMovieGenreSlugFromId(g.id)}`),
        priority: "0.8",
        changefreq: "weekly",
      })),
      ...tvGenres.genres.map((g) => ({
        loc: sanitizeUrlPart(`/genre/tv/${getTVGenreSlugFromId(g.id)}`),
        priority: "0.8",
        changefreq: "weekly",
      })),
    ];

    // Legacy genre filter pages
    const genreUrls: SitemapUrl[] = [
      ...movieGenres.genres.map((g) => ({
        loc: sanitizeUrlPart(`/movies?genre=${g.id}`),
        priority: "0.6",
        changefreq: "weekly",
      })),
      ...tvGenres.genres.map((g) => ({
        loc: sanitizeUrlPart(`/tv?genre=${g.id}`),
        priority: "0.6",
        changefreq: "weekly",
      })),
    ];

    // Year filter pages
    const currentYear = new Date().getFullYear();
    const yearUrls: SitemapUrl[] = [];
    for (let year = currentYear; year >= currentYear - 10; year--) {
      yearUrls.push({
        loc: sanitizeUrlPart(`/movies?year=${year}`),
        priority: "0.5",
        changefreq: "monthly",
      });
      yearUrls.push({
        loc: sanitizeUrlPart(`/tv?year=${year}`),
        priority: "0.5",
        changefreq: "monthly",
      });
    }

    // Combine all URLs
    const allUrls = [
      ...staticPages, 
      ...movieUrls, 
      ...movieWatchUrls, 
      ...tvUrls, 
      ...seasonUrls,
      ...episodeUrls, 
      ...dedicatedGenreUrls,
      ...genreUrls,
      ...yearUrls,
    ];

    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${allUrls
  .map(
    (url) => `  <url>
    <loc>${baseUrl}${url.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

    // Use textContent instead of innerHTML to prevent XSS
    containerRef.current.textContent = xml;
    document.title = "Sitemap XML - fmovies";
  }, [popularMovies, popularTV, movieGenres, tvGenres, episodeUrls, seasonUrls]);

  return (
    <pre 
      ref={containerRef}
      style={{
        whiteSpace: "pre-wrap",
        wordWrap: "break-word",
        fontFamily: "monospace",
        background: "#1a1a1a",
        color: "#00ff00",
        padding: "20px",
        margin: 0,
        minHeight: "100vh"
      }}
    >
      Generating comprehensive sitemap with movies, TV shows, seasons, and episodes...
    </pre>
  );
}
