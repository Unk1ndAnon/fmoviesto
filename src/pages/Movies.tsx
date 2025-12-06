import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { tmdb } from "@/lib/tmdb";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MovieGrid } from "@/components/movie/MovieGrid";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Filter, X } from "lucide-react";

const categories = [
  { id: "popular", label: "Popular" },
  { id: "trending", label: "Trending" },
  { id: "top-rated", label: "Top Rated" },
  { id: "now-playing", label: "Now Playing" },
  { id: "upcoming", label: "Upcoming" },
];

const years = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);

const sortOptions = [
  { id: "popularity.desc", label: "Most Popular" },
  { id: "popularity.asc", label: "Least Popular" },
  { id: "vote_average.desc", label: "Highest Rated" },
  { id: "vote_average.asc", label: "Lowest Rated" },
  { id: "release_date.desc", label: "Newest" },
  { id: "release_date.asc", label: "Oldest" },
  { id: "vote_count.desc", label: "Most Votes" },
];

export default function Movies() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") || "popular";
  const genreId = searchParams.get("genre");
  const year = searchParams.get("year");
  const sortBy = searchParams.get("sort") || "popularity.desc";
  const minRating = searchParams.get("rating");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const { data: genres } = useQuery({
    queryKey: ["movieGenres"],
    queryFn: tmdb.getMovieGenres,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["movies", category, genreId, year, sortBy, minRating, page],
    queryFn: async () => {
      // Use discover API for filtered results
      if (genreId || year || minRating || sortBy !== "popularity.desc") {
        const params: Record<string, string> = {
          page: String(page),
          sort_by: sortBy,
        };
        if (genreId) params.with_genres = genreId;
        if (year) {
          params["primary_release_date.gte"] = `${year}-01-01`;
          params["primary_release_date.lte"] = `${year}-12-31`;
        }
        if (minRating) params["vote_average.gte"] = minRating;
        
        const url = new URL("https://api.themoviedb.org/3/discover/movie");
        url.searchParams.set("api_key", "1e61d290e56866f3b6c22d63a28c6e69");
        Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
        
        const response = await fetch(url.toString());
        return response.json();
      }
      
      switch (category) {
        case "trending":
          return tmdb.getTrending("week");
        case "top-rated":
          return tmdb.getTopRated(page);
        case "now-playing":
          return tmdb.getNowPlaying(page);
        case "upcoming":
          return tmdb.getUpcoming(page);
        default:
          return tmdb.getPopular(page);
      }
    },
  });

  const currentGenre = genres?.genres?.find((g) => g.id === parseInt(genreId || "0"));

  const updateFilter = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchParams({});
    setPage(1);
  };

  const hasActiveFilters = genreId || year || minRating || sortBy !== "popularity.desc";

  return (
    <>
      <SEOHead
        title={currentGenre ? `${currentGenre.name} Movies` : `${categories.find(c => c.id === category)?.label || 'Popular'} Movies`}
        description={`Browse ${currentGenre?.name || category} movies on Fmovies. Watch the best movies in HD quality for free.`}
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 pt-20">
          <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                  {currentGenre ? `${currentGenre.name} Movies` : "Movies"}
                </h1>
                <Button
                  variant="cinema"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="md:hidden"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </div>

              {/* Category Tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={category === cat.id && !genreId && !hasActiveFilters ? "default" : "cinema"}
                    size="sm"
                    onClick={() => {
                      setSearchParams({ category: cat.id });
                      setPage(1);
                    }}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>

              {/* Filters */}
              <div className={`grid grid-cols-2 md:grid-cols-5 gap-3 ${showFilters ? "block" : "hidden md:grid"}`}>
                {/* Genre Filter */}
                <Select
                  value={genreId || ""}
                  onValueChange={(value) => updateFilter("genre", value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {genres?.genres?.map((genre) => (
                      <SelectItem key={genre.id} value={String(genre.id)}>
                        {genre.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Year Filter */}
                <Select
                  value={year || ""}
                  onValueChange={(value) => updateFilter("year", value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Rating Filter */}
                <Select
                  value={minRating || ""}
                  onValueChange={(value) => updateFilter("rating", value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Min Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    {[9, 8, 7, 6, 5, 4].map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {r}+ Stars
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort Filter */}
                <Select
                  value={sortBy}
                  onValueChange={(value) => updateFilter("sort", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="col-span-2 md:col-span-1">
                    <X className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Movie Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div key={i} className="aspect-[2/3] bg-card rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <MovieGrid items={data?.results || []} type="movie" />
            )}

            {/* Pagination */}
            {data && 'total_pages' in data && (data as { total_pages: number }).total_pages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-12">
                <Button
                  variant="cinema"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="text-muted-foreground">
                  Page {page} of {Math.min((data as { total_pages: number }).total_pages, 500)}
                </span>
                <Button
                  variant="cinema"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.min((data as { total_pages: number }).total_pages, 500)}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}