import { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Movie, TVShow } from "@/lib/tmdb";
import { MovieCard } from "./MovieCard";
import { Button } from "@/components/ui/button";

interface MovieRowProps {
  title: string;
  items: (Movie | TVShow)[];
  type: "movie" | "tv";
  viewMoreLink?: string;
}

export function MovieRow({ title, items, type, viewMoreLink }: MovieRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">{title}</h2>
        {viewMoreLink && (
          <Link
            to={viewMoreLink}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            View More
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      <div className="relative group/row">
        {/* Scroll Buttons */}
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

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-hide pb-4 -mx-4 px-4"
        >
          {items.map((item) => (
            <MovieCard
              key={item.id}
              item={item}
              type={type}
              className="flex-shrink-0 w-[150px] md:w-[180px]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
