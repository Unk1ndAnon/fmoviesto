import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { Film, Tv, FileText, Home } from "lucide-react";

const Sitemap = () => {
  const { data: trendingMovies } = useQuery({
    queryKey: ["trending-movies"],
    queryFn: () => tmdb.getTrending(),
  });

  const { data: popularMovies } = useQuery({
    queryKey: ["popular-movies"],
    queryFn: () => tmdb.getPopular(),
  });

  const { data: trendingTV } = useQuery({
    queryKey: ["trending-tv"],
    queryFn: () => tmdb.getTrendingTV(),
  });

  const { data: popularTV } = useQuery({
    queryKey: ["popular-tv"],
    queryFn: () => tmdb.getPopularTV(),
  });

  const { data: movieGenres } = useQuery({
    queryKey: ["movie-genres"],
    queryFn: () => tmdb.getMovieGenres(),
  });

  const { data: tvGenres } = useQuery({
    queryKey: ["tv-genres"],
    queryFn: () => tmdb.getTVGenres(),
  });

  const staticPages = [
    { path: "/", name: "Home" },
    { path: "/movies", name: "Movies" },
    { path: "/tv", name: "TV Shows" },
    { path: "/search", name: "Search" },
    { path: "/privacy", name: "Privacy Policy" },
    { path: "/terms", name: "Terms of Service" },
    { path: "/dmca", name: "DMCA" },
  ];

  const allMovies = [...(trendingMovies?.results || []), ...(popularMovies?.results || [])];
  const uniqueMovies = allMovies.filter((movie, index, self) => 
    index === self.findIndex(m => m.id === movie.id)
  ).slice(0, 50);

  const allTV = [...(trendingTV?.results || []), ...(popularTV?.results || [])];
  const uniqueTV = allTV.filter((show, index, self) => 
    index === self.findIndex(s => s.id === show.id)
  ).slice(0, 50);

  return (
    <>
      <SEOHead
        title="Sitemap - Fmovies"
        description="Browse all pages, movies, and TV shows available on Fmovies. Complete sitemap for easy navigation."
      />
      <Navbar />
      <main className="min-h-screen bg-background pt-20 pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-foreground mb-8">Sitemap</h1>

          {/* Static Pages */}
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Home className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Main Pages</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {staticPages.map((page) => (
                <Link
                  key={page.path}
                  to={page.path}
                  className="text-muted-foreground hover:text-primary transition-colors text-sm py-1"
                >
                  {page.name}
                </Link>
              ))}
            </div>
          </section>

          {/* Movie Genres */}
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Film className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Movie Genres</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {movieGenres?.genres?.map((genre) => (
                <Link
                  key={genre.id}
                  to={`/movies?genre=${genre.id}`}
                  className="text-muted-foreground hover:text-primary transition-colors text-sm py-1"
                >
                  {genre.name}
                </Link>
              ))}
            </div>
          </section>

          {/* TV Genres */}
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Tv className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">TV Show Genres</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {tvGenres?.genres?.map((genre) => (
                <Link
                  key={genre.id}
                  to={`/tv?genre=${genre.id}`}
                  className="text-muted-foreground hover:text-primary transition-colors text-sm py-1"
                >
                  {genre.name}
                </Link>
              ))}
            </div>
          </section>

          {/* Popular Movies */}
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Film className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Popular Movies</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {uniqueMovies.map((movie) => (
                <Link
                  key={movie.id}
                  to={`/movie/${movie.id}`}
                  className="text-muted-foreground hover:text-primary transition-colors text-sm py-1 truncate"
                >
                  {movie.title}
                </Link>
              ))}
            </div>
          </section>

          {/* Popular TV Shows */}
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Tv className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Popular TV Shows</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {uniqueTV.map((show) => (
                <Link
                  key={show.id}
                  to={`/tv/${show.id}`}
                  className="text-muted-foreground hover:text-primary transition-colors text-sm py-1 truncate"
                >
                  {show.name}
                </Link>
              ))}
            </div>
          </section>

          {/* XML Sitemap Link */}
          <section className="border-t border-border pt-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">XML Sitemap</h2>
            </div>
            <p className="text-muted-foreground text-sm">
              For search engines: <a href="/sitemap.xml" className="text-primary hover:underline">/sitemap.xml</a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Sitemap;
