import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import { generateSlug } from "@/lib/slug";

// Sanitize string to prevent XSS - only allow safe characters for URLs
const sanitizeUrlPart = (str: string): string => {
  return str.replace(/[^a-zA-Z0-9\-_./]/g, "");
};

export default function SitemapXml() {
  const [episodeUrls, setEpisodeUrls] = useState<Array<{ loc: string; priority: string; changefreq: string }>>([]);
  const containerRef = useRef<HTMLPreElement>(null);

  const { data: popularMovies } = useQuery({
    queryKey: ["sitemapMovies"],
    queryFn: async () => {
      const pages = await Promise.all([
        tmdb.getPopular(1),
        tmdb.getPopular(2),
        tmdb.getPopular(3),
        tmdb.getPopular(4),
        tmdb.getPopular(5),
        tmdb.getTopRated(1),
        tmdb.getTopRated(2),
        tmdb.getTopRated(3),
      ]);
      const allMovies = pages.flatMap((p) => p.results);
      return [...new Map(allMovies.map((m) => [m.id, m])).values()];
    },
  });

  const { data: popularTV } = useQuery({
    queryKey: ["sitemapTV"],
    queryFn: async () => {
      const pages = await Promise.all([
        tmdb.getPopularTV(1),
        tmdb.getPopularTV(2),
        tmdb.getPopularTV(3),
        tmdb.getPopularTV(4),
        tmdb.getPopularTV(5),
        tmdb.getTopRatedTV(1),
        tmdb.getTopRatedTV(2),
        tmdb.getTopRatedTV(3),
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

  // Fetch episode data for TV shows
  useEffect(() => {
    if (!popularTV) return;

    const fetchEpisodes = async () => {
      const episodes: Array<{ loc: string; priority: string; changefreq: string }> = [];
      
      // Limit to top 30 shows to avoid too many API calls
      const topShows = popularTV.slice(0, 30);
      
      for (const show of topShows) {
        try {
          const details = await tmdb.getTVDetails(show.id);
          const slug = generateSlug(show.name);
          
          // Add episodes for each season (limit to first 3 seasons for performance)
          const seasonsToProcess = details.seasons
            .filter(s => s.season_number > 0)
            .slice(0, 3);
          
          for (const season of seasonsToProcess) {
            try {
              const seasonData = await tmdb.getSeasonDetails(show.id, season.season_number);
              
              for (const episode of seasonData.episodes || []) {
                // New URL format: /watch/{slug}/{season}-{episode}
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
    };

    fetchEpisodes();
  }, [popularTV]);

  useEffect(() => {
    if (!popularMovies || !popularTV || !movieGenres || !tvGenres || !containerRef.current) return;

    const baseUrl = window.location.origin;
    const today = new Date().toISOString().split("T")[0];

    const staticPages = [
      { loc: "/", priority: "1.0", changefreq: "daily" },
      { loc: "/movies", priority: "0.9", changefreq: "daily" },
      { loc: "/tv", priority: "0.9", changefreq: "daily" },
      { loc: "/search", priority: "0.7", changefreq: "weekly" },
      { loc: "/sitemap", priority: "0.5", changefreq: "weekly" },
      { loc: "/privacy", priority: "0.3", changefreq: "monthly" },
      { loc: "/dmca", priority: "0.3", changefreq: "monthly" },
      { loc: "/terms", priority: "0.3", changefreq: "monthly" },
    ];

    // Movie detail pages: /movie/{slug}
    const movieUrls = popularMovies.map((movie) => ({
      loc: sanitizeUrlPart(`/movie/${generateSlug(movie.title)}`),
      priority: "0.8",
      changefreq: "weekly",
    }));

    // Movie watch pages: /watch/{slug}
    const movieWatchUrls = popularMovies.map((movie) => ({
      loc: sanitizeUrlPart(`/watch/${generateSlug(movie.title)}`),
      priority: "0.8",
      changefreq: "weekly",
    }));

    // TV show detail pages: /tvshow/{slug}
    const tvUrls = popularTV.map((show) => ({
      loc: sanitizeUrlPart(`/tvshow/${generateSlug(show.name)}`),
      priority: "0.8",
      changefreq: "weekly",
    }));

    const genreUrls = [
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

    const allUrls = [...staticPages, ...movieUrls, ...movieWatchUrls, ...tvUrls, ...episodeUrls, ...genreUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
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
  }, [popularMovies, popularTV, movieGenres, tvGenres, episodeUrls]);

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
      Generating sitemap...
    </pre>
  );
}
