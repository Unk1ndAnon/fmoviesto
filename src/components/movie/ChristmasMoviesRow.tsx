import { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowRight, Snowflake } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { tmdb, Movie } from "@/lib/tmdb";
import { useChristmasMovies } from "@/hooks/useCollections";
import { MovieCard } from "./MovieCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Feature flag - set to true to enable Christmas movies row
const CHRISTMAS_MOVIES_ENABLED = false;

export function ChristmasMoviesRow() {
  // Feature disabled
  if (!CHRISTMAS_MOVIES_ENABLED) {
    return null;
  }
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: collectionMovies, isLoading: collectionLoading } = useChristmasMovies(12);

  // Fetch movie details from TMDB for each collection movie
  const { data: movies, isLoading: moviesLoading } = useQuery({
    queryKey: ["christmas-movies-details", collectionMovies],
    queryFn: async () => {
      if (!collectionMovies || collectionMovies.length === 0) return [];
      
      const moviePromises = collectionMovies.map(async (cm) => {
        try {
          const movie = await tmdb.getMovieDetails(cm.tmdb_id);
          return movie;
        } catch {
          return null;
        }
      });
      
      const results = await Promise.all(moviePromises);
      return results.filter((m): m is Movie => m !== null);
    },
    enabled: !!collectionMovies && collectionMovies.length > 0,
  });

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const isLoading = collectionLoading || moviesLoading;
  const showSkeleton = isLoading || !movies || movies.length === 0;

  // Don't render if no movies in collection
  if (!collectionLoading && (!collectionMovies || collectionMovies.length === 0)) {
    return null;
  }

  return (
    <section className="py-6 min-h-[442px] relative overflow-hidden">
      {/* Subtle Christmas background effect */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-4 left-[10%] text-primary/30">
          <Snowflake className="w-4 h-4 animate-pulse" />
        </div>
        <div className="absolute top-12 right-[20%] text-primary/20">
          <Snowflake className="w-3 h-3 animate-pulse delay-300" />
        </div>
        <div className="absolute bottom-8 left-[30%] text-primary/25">
          <Snowflake className="w-5 h-5 animate-pulse delay-500" />
        </div>
        <div className="absolute top-20 left-[60%] text-primary/20">
          <Snowflake className="w-3 h-3 animate-pulse delay-700" />
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎄</span>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            Christmas Movies
          </h2>
        </div>
        <Link
          to="/collection/christmas-movies"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="relative group/row z-10">
        {!showSkeleton && (
          <>
            <Button
              variant="glass"
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover/row:opacity-100 transition-opacity -translate-x-2"
              onClick={() => scroll("left")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <Button
              variant="glass"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover/row:opacity-100 transition-opacity translate-x-2"
              onClick={() => scroll("right")}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </>
        )}

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-hide pb-4 -mx-4 px-4"
        >
          {showSkeleton ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[150px] md:w-[180px]">
                <div className="aspect-[2/3] rounded-lg overflow-hidden">
                  <Skeleton className="w-full h-full" />
                </div>
                <div className="pt-3 space-y-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))
          ) : (
            movies?.map((item) => (
              <MovieCard
                key={item.id}
                item={item}
                type="movie"
                className="flex-shrink-0 w-[150px] md:w-[180px]"
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
