import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MovieGrid } from "@/components/movie/MovieGrid";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, Film, Tv } from "lucide-react";

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(query);
  const [filter, setFilter] = useState<"all" | "movie" | "tv">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: () => tmdb.searchMulti(query),
    enabled: !!query,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput.trim() });
    }
  };

  const results = data?.results?.filter((item) => {
    if (filter === "all") return true;
    const mediaType = "title" in item ? "movie" : "tv";
    return mediaType === filter;
  }) || [];

  const movies = results.filter((item) => "title" in item);
  const tvShows = results.filter((item) => "name" in item && !("title" in item));

  return (
    <>
      <SEOHead
        title={query ? `Search Results for "${query}"` : "Search"}
        description={`Search for movies and TV shows on StreamFlix. Find your favorite content to stream in HD.`}
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 pt-20">
          <div className="container mx-auto px-4 py-8">
            {/* Search Form */}
            <div className="max-w-2xl mx-auto mb-12">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-8">
                Search Movies & TV Shows
              </h1>
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search for movies, TV shows..."
                    className="pl-12 h-14 text-lg bg-card border-border"
                  />
                </div>
                <Button type="submit" size="lg" className="h-14 px-8">
                  Search
                </Button>
              </form>
            </div>

            {/* Results */}
            {query && (
              <>
                {/* Filter Tabs */}
                <div className="flex items-center gap-4 mb-8">
                  <span className="text-muted-foreground">Filter:</span>
                  <div className="flex gap-2">
                    <Button
                      variant={filter === "all" ? "default" : "cinema"}
                      size="sm"
                      onClick={() => setFilter("all")}
                    >
                      All ({results.length})
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
                  </div>
                </div>

                {/* Results Header */}
                <h2 className="text-xl font-semibold text-foreground mb-6">
                  {isLoading
                    ? "Searching..."
                    : `${results.length} results for "${query}"`}
                </h2>

                {/* Loading */}
                {isLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="aspect-[2/3] bg-card rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : results.length > 0 ? (
                  <MovieGrid
                    items={results}
                    type={filter === "tv" ? "tv" : "movie"}
                  />
                ) : (
                  <div className="text-center py-20">
                    <p className="text-muted-foreground text-lg">
                      No results found for "{query}"
                    </p>
                    <p className="text-muted-foreground/60 mt-2">
                      Try searching with different keywords
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Empty State */}
            {!query && (
              <div className="text-center py-20">
                <SearchIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  Enter a search term to find movies and TV shows
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
