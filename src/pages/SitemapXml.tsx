import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";

export default function SitemapXml() {
  const [episodeUrls, setEpisodeUrls] = useState<Array<{ loc: string; priority: string; changefreq: string }>>([]);

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

  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

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
                episodes.push({
                  loc: `/watch/tv/${show.id}-${slug}?season=${season.season_number}&episode=${episode.episode_number}`,
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
    if (!popularMovies || !popularTV || !movieGenres || !tvGenres) return;

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

    const movieUrls = popularMovies.map((movie) => ({
      loc: `/movie/${movie.id}-${generateSlug(movie.title)}`,
      priority: "0.8",
      changefreq: "weekly",
    }));

    const movieWatchUrls = popularMovies.map((movie) => ({
      loc: `/watch/movie/${movie.id}-${generateSlug(movie.title)}`,
      priority: "0.8",
      changefreq: "weekly",
    }));

    const tvUrls = popularTV.map((show) => ({
      loc: `/tv/${show.id}-${generateSlug(show.name)}`,
      priority: "0.8",
      changefreq: "weekly",
    }));

    const genreUrls = [
      ...movieGenres.genres.map((g) => ({
        loc: `/movies?genre=${g.id}`,
        priority: "0.6",
        changefreq: "weekly",
      })),
      ...tvGenres.genres.map((g) => ({
        loc: `/tv?genre=${g.id}`,
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

    // Set content type and display XML
    document.body.innerHTML = `<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: monospace; background: #1a1a1a; color: #00ff00; padding: 20px; margin: 0; min-height: 100vh;">${xml.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
    document.title = "Sitemap XML - fmovies";
  }, [popularMovies, popularTV, movieGenres, tvGenres, episodeUrls]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Generating sitemap...</p>
    </div>
  );
}
