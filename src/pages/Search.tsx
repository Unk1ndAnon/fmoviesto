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
import { Search as SearchIcon, Film, Tv, User } from "lucide-react";

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<"all" | "movie" | "tv" | "person">("all");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput);
      if (searchInput.trim()) {
        setSearchParams({ q: searchInput.trim() }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, setSearchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => tmdb.searchMulti(debouncedQuery),
    enabled: !!debouncedQuery,
  });

  // Separate results by type
  const allResults = data?.results || [];
  
  const movies = allResults.filter((item: any) => item.media_type === "movie");
  const tvShows = allResults.filter((item: any) => item.media_type === "tv");
  const people = allResults.filter((item: any) => item.media_type === "person");
  
  const mediaResults = allResults.filter((item: any) => 
    item.media_type === "movie" || item.media_type === "tv"
  );

  const getFilteredResults = () => {
    switch (filter) {
      case "movie":
        return movies;
      case "tv":
        return tvShows;
      case "person":
        return people;
      default:
        return mediaResults;
    }
  };

  const results = getFilteredResults();

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
                      onClick={() => setFilter("all")}
                    >
                      All ({mediaResults.length})
                    </Button>
                    <Button
                      variant={filter === "movie" ? "default" : "cinema"}
                      size="sm"
                      onClick={() => setFilter("movie")}
                      className="gap-2"
                    >
                      <Film className="w-4 h-4" />
                      Movies ({movies.length})
                    </Button>
                    <Button
                      variant={filter === "tv" ? "default" : "cinema"}
                      size="sm"
                      onClick={() => setFilter("tv")}
                      className="gap-2"
                    >
                      <Tv className="w-4 h-4" />
                      TV Shows ({tvShows.length})
                    </Button>
                    <Button
                      variant={filter === "person" ? "default" : "cinema"}
                      size="sm"
                      onClick={() => setFilter("person")}
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
                    : `${results.length} results for "${debouncedQuery}"`}
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
