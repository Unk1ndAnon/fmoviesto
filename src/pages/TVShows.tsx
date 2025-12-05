import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { tmdb } from "@/lib/tmdb";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MovieGrid } from "@/components/movie/MovieGrid";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const categories = [
  { id: "trending", label: "Trending" },
  { id: "popular", label: "Popular" },
  { id: "top-rated", label: "Top Rated" },
];

export default function TVShows() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") || "popular";
  const [page, setPage] = useState(1);

  const { data: genres } = useQuery({
    queryKey: ["tvGenres"],
    queryFn: tmdb.getTVGenres,
  });

  const genreId = searchParams.get("genre");

  const { data, isLoading } = useQuery({
    queryKey: ["tv", category, genreId, page],
    queryFn: async () => {
      switch (category) {
        case "trending":
          return tmdb.getTrendingTV("week");
        case "top-rated":
          return tmdb.getTopRatedTV(page);
        default:
          return tmdb.getPopularTV(page);
      }
    },
  });

  return (
    <>
      <SEOHead
        title={`${categories.find(c => c.id === category)?.label || 'Popular'} TV Shows`}
        description={`Browse ${category} TV shows on StreamFlix. Watch the best series in HD quality for free.`}
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 pt-20">
          <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                TV Shows
              </h1>

              {/* Category Tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={category === cat.id ? "default" : "cinema"}
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

              {/* Genre Filter */}
              <div className="flex flex-wrap gap-2">
                {genres?.genres?.map((genre) => (
                  <Button
                    key={genre.id}
                    variant={genreId === String(genre.id) ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setSearchParams({ genre: String(genre.id) });
                      setPage(1);
                    }}
                    className="text-xs"
                  >
                    {genre.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* TV Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div key={i} className="aspect-[2/3] bg-card rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <MovieGrid items={data?.results || []} type="tv" />
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
