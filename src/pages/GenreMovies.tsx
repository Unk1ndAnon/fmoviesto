import { useState } from "react";
import { useParams, useSearchParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import { getMovieGenreInfo, getDefaultGenreInfo, getMovieGenreIdFromSlug, getMovieGenreSlugFromId } from "@/lib/genre-descriptions";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MovieGrid } from "@/components/movie/MovieGrid";
import { SEOHead } from "@/components/seo/SEOHead";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs, QuickLinks } from "@/components/seo/InternalLinks";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Film, SlidersHorizontal } from "lucide-react";

const years = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);

const sortOptions = [
  { value: "popularity.desc", label: "Most Popular" },
  { value: "vote_average.desc", label: "Highest Rated" },
  { value: "release_date.desc", label: "Newest First" },
  { value: "release_date.asc", label: "Oldest First" },
  { value: "revenue.desc", label: "Highest Revenue" },
];

export default function GenreMovies() {
  const { genreSlug } = useParams<{ genreSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  // Convert slug to ID
  const genreIdNum = getMovieGenreIdFromSlug(genreSlug || "");
  const page = parseInt(searchParams.get("page") || "1");
  const year = searchParams.get("year") || "";
  const sortBy = searchParams.get("sort") || "popularity.desc";
  const minRating = searchParams.get("rating") || "";

  // Radix SelectItem doesn't allow empty string values
  const yearSelectValue = year || "all";
  const ratingSelectValue = minRating || "all";

  // Fetch genre list to get the genre name
  const { data: genres, isLoading: genresLoading } = useQuery({
    queryKey: ["movieGenres"],
    queryFn: () => tmdb.getMovieGenres(),
  });

  // Redirect to genres page if invalid slug
  if (!genreSlug || (genreIdNum === null && !genresLoading)) {
    return <Navigate to="/genres" replace />;
  }

  const validGenreId = genreIdNum || 0;
  const genreName = genres?.genres.find(g => g.id === validGenreId)?.name || "Genre";
  const genreInfo = getMovieGenreInfo(validGenreId) || getDefaultGenreInfo(validGenreId, genreName, "movie");

  // Fetch movies for this genre
  const { data: movies, isLoading } = useQuery({
    queryKey: ["genreMovies", validGenreId, page, year, sortBy, minRating],
    queryFn: () => {
      const params: Record<string, string> = {
        with_genres: String(validGenreId),
        page: String(page),
        sort_by: sortBy,
      };
      if (year) params.primary_release_year = year;
      if (minRating) params["vote_average.gte"] = minRating;
      return tmdb.discoverMovies(params);
    },
    enabled: validGenreId > 0,
  });

  // Fetch other genres for internal linking
  const otherGenres = genres?.genres.filter(g => g.id !== validGenreId).slice(0, 8) || [];

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", String(newPage));
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Movies", href: "/movies" },
    { label: genreName },
  ];

  return (
    <>
      <SEOHead
        title={genreInfo.seoTitle}
        description={genreInfo.description}
        keywords={genreInfo.keywords.join(", ")}
      />
      <BreadcrumbJsonLd items={breadcrumbs} />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 container mx-auto px-4 pt-24 pb-8">
          {/* Breadcrumbs */}
          <Breadcrumbs items={breadcrumbs} />

          {/* Hero Section */}
          <header className="py-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Film className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                {genreName} Movies
              </h1>
            </div>
            <p className="text-muted-foreground max-w-3xl leading-relaxed">
              {genreInfo.description}
            </p>
          </header>

          {/* Filters */}
          <div className="mb-6">
            <Button
              variant="outline"
              size="sm"
              className="md:hidden mb-4"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
            </Button>

            <div className={`flex flex-wrap gap-3 ${showFilters ? "flex" : "hidden md:flex"}`}>
              <Select
                value={yearSelectValue}
                onValueChange={(v) => updateFilter("year", v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={ratingSelectValue}
                onValueChange={(v) => updateFilter("rating", v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Rating</SelectItem>
                  <SelectItem value="9">9+ Stars</SelectItem>
                  <SelectItem value="8">8+ Stars</SelectItem>
                  <SelectItem value="7">7+ Stars</SelectItem>
                  <SelectItem value="6">6+ Stars</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => updateFilter("sort", v)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results Count */}
          {movies && (
            <p className="text-sm text-muted-foreground mb-4">
              Showing page {page} of {movies.total_pages} ({movies.total_pages * 20}+ movies)
            </p>
          )}

          {/* Movie Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-card animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <MovieGrid items={movies?.results || []} type="movie" />
          )}

          {/* Pagination */}
          {movies && movies.total_pages > 1 && (
            <nav aria-label="Pagination" className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {page} of {Math.min(movies.total_pages, 500)}
              </span>
              <Button
                variant="outline"
                disabled={page >= Math.min(movies.total_pages, 500)}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </nav>
          )}

          {/* Related Genres for Internal Linking */}
          {otherGenres.length > 0 && (
            <section className="mt-12 pt-8 border-t border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Explore More Movie Genres
              </h2>
              <div className="flex flex-wrap gap-2">
                {otherGenres.map((genre) => (
                  <Link
                    key={genre.id}
                    to={`/genre/movies/${getMovieGenreSlugFromId(genre.id)}`}
                    className="px-4 py-2 rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors text-sm"
                  >
                    {genre.name}
                  </Link>
                ))}
                <Link
                  to="/movies"
                  className="px-4 py-2 rounded-full bg-card border border-border text-foreground hover:bg-primary hover:text-primary-foreground transition-colors text-sm"
                >
                  All Movies →
                </Link>
              </div>
            </section>
          )}

          {/* Quick Links */}
          <QuickLinks currentType="movie" />
        </main>

        <Footer />
      </div>
    </>
  );
}
