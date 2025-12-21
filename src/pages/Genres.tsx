import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { tmdb } from "@/lib/tmdb";
import { getMovieGenreInfo, getTVGenreInfo, getDefaultGenreInfo, getMovieGenreSlugFromId, getTVGenreSlugFromId } from "@/lib/genre-descriptions";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { Breadcrumbs, QuickLinks } from "@/components/seo/InternalLinks";
import { Film, Tv, ChevronRight } from "lucide-react";

export default function Genres() {
  const { data: movieGenres, isLoading: loadingMovies } = useQuery({
    queryKey: ["movieGenres"],
    queryFn: () => tmdb.getMovieGenres(),
  });

  const { data: tvGenres, isLoading: loadingTV } = useQuery({
    queryKey: ["tvGenres"],
    queryFn: () => tmdb.getTVGenres(),
  });

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Genres" },
  ];

  const isLoading = loadingMovies || loadingTV;

  return (
    <>
      <SEOHead
        title="Browse by Genre - Movies & TV Shows"
        description="Explore our complete collection of movies and TV shows organized by genre. From action-packed blockbusters to heartwarming comedies, find your perfect entertainment by category."
        keywords="movie genres, TV genres, action movies, comedy films, drama series, horror movies, sci-fi shows, romance films, thriller TV"
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 container mx-auto px-4 pt-24 pb-8">
          {/* Breadcrumbs */}
          <Breadcrumbs items={breadcrumbs} />

          {/* Header */}
          <header className="py-8 text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Browse by Genre
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover movies and TV shows organized by genre. Click on any genre to explore curated content with detailed descriptions and top-rated titles.
            </p>
          </header>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-24 bg-card animate-pulse rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              {/* Movie Genres */}
              <section className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Film className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Movie Genres</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {movieGenres?.genres.map((genre) => {
                    const info = getMovieGenreInfo(genre.id) || getDefaultGenreInfo(genre.id, genre.name, "movie");
                    const slug = getMovieGenreSlugFromId(genre.id);
                    return (
                      <Link
                        key={genre.id}
                        to={`/genre/movies/${slug}`}
                        className="group relative p-5 rounded-xl bg-card border border-border/50 hover:border-primary/50 hover:bg-card/80 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {genre.name}
                          </h3>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {info.description.slice(0, 80)}...
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* TV Genres */}
              <section className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Tv className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">TV Show Genres</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {tvGenres?.genres.map((genre) => {
                    const info = getTVGenreInfo(genre.id) || getDefaultGenreInfo(genre.id, genre.name, "tv");
                    const slug = getTVGenreSlugFromId(genre.id);
                    return (
                      <Link
                        key={genre.id}
                        to={`/genre/tv/${slug}`}
                        className="group relative p-5 rounded-xl bg-card border border-border/50 hover:border-primary/50 hover:bg-card/80 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {genre.name}
                          </h3>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {info.description.slice(0, 80)}...
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {/* Quick Links */}
          <QuickLinks currentType="movie" />
        </main>

        <Footer />
      </div>
    </>
  );
}
