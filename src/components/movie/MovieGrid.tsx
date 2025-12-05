import { Movie, TVShow } from "@/lib/tmdb";
import { MovieCard } from "./MovieCard";

interface MovieGridProps {
  items: (Movie | TVShow)[];
  type: "movie" | "tv";
}

export function MovieGrid({ items, type }: MovieGridProps) {
  if (!items || items.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">No results found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
      {items.map((item) => (
        <MovieCard key={item.id} item={item} type={type} />
      ))}
    </div>
  );
}
