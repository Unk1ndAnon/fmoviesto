import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";

export default function SitemapXml() {
  const { data: popularMovies } = useQuery({
    queryKey: ["sitemapMovies"],
    queryFn: async () => {
      const pages = await Promise.all([
        tmdb.getPopular(1),
        tmdb.getPopular(2),
        tmdb.getPopular(3),
        tmdb.getTopRated(1),
        tmdb.getTopRated(2),
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
        tmdb.getTopRatedTV(1),
        tmdb.getTopRatedTV(2),
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

  useEffect(() => {
    if (!popularMovies || !popularTV || !movieGenres || !tvGenres) return;

    const baseUrl = window.location.origin;
    const today = new Date().toISOString().split("T")[0];

    const generateSlug = (title: string) =>
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const staticPages = [
      { loc: "/", priority: "1.0", changefreq: "daily" },
      { loc: "/movies", priority: "0.9", changefreq: "daily" },
      { loc: "/tv", priority: "0.9", changefreq: "daily" },
      { loc: "/search", priority: "0.7", changefreq: "weekly" },
      { loc: "/privacy", priority: "0.3", changefreq: "monthly" },
      { loc: "/dmca", priority: "0.3", changefreq: "monthly" },
      { loc: "/terms", priority: "0.3", changefreq: "monthly" },
    ];

    const movieUrls = popularMovies.map((movie) => ({
      loc: `/movie/${movie.id}-${generateSlug(movie.title)}`,
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

    const allUrls = [...staticPages, ...movieUrls, ...tvUrls, ...genreUrls];

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
  }, [popularMovies, popularTV, movieGenres, tvGenres]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Generating sitemap...</p>
    </div>
  );
}
