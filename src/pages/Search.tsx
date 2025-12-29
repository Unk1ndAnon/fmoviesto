import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tmdb, getImageUrl } from "@/lib/tmdb";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MovieGrid } from "@/components/movie/MovieGrid";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, Film, Tv, User, ChevronLeft, ChevronRight } from "lucide-react";

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialFilter = (searchParams.get("type") as "all" | "movie" | "tv" | "person") || "all";
  const initialPage = parseInt(searchParams.get("page") || "1", 10);
  
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<"all" | "movie" | "tv" | "person">(initialFilter);
  const [page, setPage] = useState(initialPage);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput);
      if (searchInput.trim()) {
        const newParams = new URLSearchParams();
        newParams.set("q", searchInput.trim());
        if (filter !== "all") newParams.set("type", filter);
        if (page > 1) newParams.set("page", String(page));
        setSearchParams(newParams, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filter, page, setSearchParams]);

  // Reset page when filter or query changes
  useEffect(() => {
    setPage(1);
  }, [filter, debouncedQuery]);

  // Sync URL params with state on URL change
  useEffect(() => {
    const urlQuery = searchParams.get("q") || "";
    const urlFilter = (searchParams.get("type") as "all" | "movie" | "tv" | "person") || "all";
    const urlPage = parseInt(searchParams.get("page") || "1", 10);
    
    if (urlQuery !== searchInput) setSearchInput(urlQuery);
    if (urlFilter !== filter) setFilter(urlFilter);
    if (urlPage !== page) setPage(urlPage);
  }, [searchParams]);

  // Use dedicated search APIs for better results
  const { data: movieData, isLoading: moviesLoading } = useQuery({
    queryKey: ["searchMovies", debouncedQuery, page],
    queryFn: () => tmdb.searchMovies(debouncedQuery, filter === "movie" ? page : 1),
    enabled: !!debouncedQuery && (filter === "all" || filter === "movie"),
  });

  const { data: tvData, isLoading: tvLoading } = useQuery({
    queryKey: ["searchTV", debouncedQuery, page],
    queryFn: () => tmdb.searchTV(debouncedQuery, filter === "tv" ? page : 1),
    enabled: !!debouncedQuery && (filter === "all" || filter === "tv"),
  });

  const { data: multiData, isLoading: multiLoading } = useQuery({
    queryKey: ["searchMulti", debouncedQuery],
    queryFn: () => tmdb.searchMulti(debouncedQuery),
    enabled: !!debouncedQuery && (filter === "all" || filter === "person"),
  });

  const isLoading = moviesLoading || tvLoading || multiLoading;

  // Combine results
  const movies = movieData?.results || [];
  const tvShows = tvData?.results || [];
  const people = (multiData?.results || []).filter((item: any) => item.media_type === "person");
  
  // For "all" filter, combine movies and TV shows
  const mediaResults = filter === "all" 
    ? [...movies.map((m: any) => ({ ...m, media_type: "movie" })), 
       ...tvShows.map((t: any) => ({ ...t, media_type: "tv" }))]
      .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
    : [];

  const getFilteredResults = () => {
    switch (filter) {
      case "movie":
        return movies.map((m: any) => ({ ...m, media_type: "movie" }));
      case "tv":
        return tvShows.map((t: any) => ({ ...t, media_type: "tv" }));
      case "person":
        return people;
      default:
        return mediaResults;
    }
  };

  const results = getFilteredResults();
  
  // Get total pages for pagination
  const getTotalPages = () => {
    switch (filter) {
      case "movie":
        return Math.min(movieData?.total_pages || 1, 500);
      case "tv":
        return Math.min(tvData?.total_pages || 1, 500);
      default:
        return 1; // Multi-search doesn't support pagination well
    }
  };

  const totalPages = getTotalPages();

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    const newParams = new URLSearchParams();
    if (debouncedQuery) newParams.set("q", debouncedQuery);
    if (filter !== "all") newParams.set("type", filter);
    if (newPage > 1) newParams.set("page", String(newPage));
    setSearchParams(newParams, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFilterChange = (newFilter: "all" | "movie" | "tv" | "person") => {
    setFilter(newFilter);
    setPage(1);
    const newParams = new URLSearchParams();
    if (debouncedQuery) newParams.set("q", debouncedQuery);
    if (newFilter !== "all") newParams.set("type", newFilter);
    setSearchParams(newParams, { replace: true });
  };

  return (
    <>
      <SEOHead
        title={debouncedQuery ? `Search Results for "${debouncedQuery}"` : "Search"}
        description={`Search for movies, TV shows, actors, and directors on fmovies. Find your favorite content to stream in HD.`}
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 pt-20">
          <div className="container mx-auto px-4 py-8">
            {/* Search Form */}
            <div className="max-w-2xl mx-auto mb-12">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-8">
                Search Movies, TV Shows & People
              </h1>
              <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search for movies, TV shows, actors, directors..."
                  className="pl-12 h-14 text-lg bg-card border-border"
                  autoFocus
                />
                {isLoading && debouncedQuery && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* Results */}
            {debouncedQuery && (
              <>
                {/* Filter Tabs */}
                <div className="flex items-center gap-4 mb-8 flex-wrap">
                  <span className="text-muted-foreground">Filter:</span>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={filter === "all" ? "default" : "cinema"}
                      size="sm"
                      onClick={() => handleFilterChange("all")}
                    >
                      All ({movies.length + tvShows.length})
                    </Button>
                    <Button
                      variant={filter === "movie" ? "default" : "cinema"}
                      size="sm"
                      onClick={() => handleFilterChange("movie")}
                      className="gap-2"
                    >
                      <Film className="w-4 h-4" />
                      Movies ({movies.length}{movieData?.total_pages && movieData.total_pages > 1 ? "+" : ""})
                    </Button>
                    <Button
                      variant={filter === "tv" ? "default" : "cinema"}
                      size="sm"
                      onClick={() => handleFilterChange("tv")}
                      className="gap-2"
                    >
                      <Tv className="w-4 h-4" />
                      TV Shows ({tvShows.length}{tvData?.total_pages && tvData.total_pages > 1 ? "+" : ""})
                    </Button>
                    <Button
                      variant={filter === "person" ? "default" : "cinema"}
                      size="sm"
                      onClick={() => handleFilterChange("person")}
                      className="gap-2"
                    >
                      <User className="w-4 h-4" />
                      People ({people.length})
                    </Button>
                  </div>
                </div>

                {/* Results Header */}
                <h2 className="text-xl font-semibold text-foreground mb-6">
                  {isLoading
                    ? "Searching..."
                    : `${results.length} results for "${debouncedQuery}"${totalPages > 1 ? ` (page ${page} of ${totalPages})` : ""}`}
                </h2>

                {/* Loading */}
                {isLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="aspect-[2/3] bg-card rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : results.length > 0 ? (
                  filter === "person" ? (
                    // People Grid
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                      {people.map((person: any) => (
                        <Link
                          key={person.id}
                          to={`/person/${person.id}`}
                          className="group"
                        >
                          <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-card">
                            {person.profile_path ? (
                              <img
                                src={getImageUrl(person.profile_path, "w500")}
                                alt={person.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <User className="w-16 h-16 text-muted-foreground/30" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                              <h3 className="font-semibold text-foreground text-sm line-clamp-1">
                                {person.name}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                {person.known_for_department}
                              </p>
                              {person.known_for?.length > 0 && (
                                <p className="text-xs text-muted-foreground/70 line-clamp-1 mt-1">
                                  {person.known_for.map((k: any) => k.title || k.name).slice(0, 2).join(", ")}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <MovieGrid
                      items={results}
                      detectType={true}
                    />
                  )
                ) : (
                  <div className="text-center py-20">
                    <p className="text-muted-foreground text-lg">
                      No results found for "{debouncedQuery}"
                    </p>
                    <p className="text-muted-foreground/60 mt-2">
                      Try searching with different keywords
                    </p>
                  </div>
                )}

                {/* Pagination - only for movie/tv filters */}
                {totalPages > 1 && (filter === "movie" || filter === "tv") && (
                  <div className="flex items-center justify-center gap-4 mt-12">
                    <Button
                      variant="cinema"
                      onClick={() => handlePageChange(Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <span className="text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="cinema"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Empty State */}
            {!debouncedQuery && (
              <div className="text-center py-20">
                <SearchIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  Enter a search term to find movies, TV shows, actors, or directors
                </p>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
