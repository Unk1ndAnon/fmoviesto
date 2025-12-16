import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Play, Info, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Movie, getBackdropUrl } from "@/lib/tmdb";
import { getWatchMovieUrl, getMovieUrl } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeroSliderProps {
  movies: Movie[];
}

export function HeroSlider({ movies }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const slideTo = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [isTransitioning]);

  const nextSlide = useCallback(() => {
    slideTo((currentIndex + 1) % movies.length);
  }, [currentIndex, movies.length, slideTo]);

  const prevSlide = useCallback(() => {
    slideTo((currentIndex - 1 + movies.length) % movies.length);
  }, [currentIndex, movies.length, slideTo]);

  useEffect(() => {
    const timer = setInterval(nextSlide, 8000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  if (!movies || movies.length === 0) return null;

  const currentMovie = movies[currentIndex];

  return (
    <section className="relative h-[70vh] md:h-[85vh] overflow-hidden">
      {/* Background Images */}
      {movies.map((movie, index) => (
        <div
          key={movie.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            index === currentIndex ? "opacity-100" : "opacity-0"
          )}
        >
          <img
            src={getBackdropUrl(movie.backdrop_path, "original")}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 hero-gradient" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
        </div>
      ))}

      {/* Content */}
      <div className="absolute inset-0 flex items-center">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl animate-slide-up" key={currentMovie.id}>
            {/* Rating */}
            <div className="flex items-center gap-3 mb-4">
              <div className="rating-badge high">
                <Star className="w-3 h-3" fill="currentColor" />
                {currentMovie.vote_average?.toFixed(1)}
              </div>
              <span className="text-sm text-muted-foreground">
                {currentMovie.release_date?.split("-")[0]}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 leading-tight">
              {currentMovie.title}
            </h1>

            {/* Overview */}
            <p className="text-base md:text-lg text-muted-foreground mb-8 line-clamp-3">
              {currentMovie.overview}
            </p>

            {/* Actions */}
            <div className="flex flex-wrap gap-4">
              <Link to={getWatchMovieUrl(currentMovie.title)}>
                <Button variant="hero" size="lg" className="gap-2">
                  <Play className="w-5 h-5" fill="currentColor" />
                  Watch Now
                </Button>
              </Link>
              <Link to={getMovieUrl(currentMovie.title)}>
                <Button variant="glass" size="lg" className="gap-2">
                  <Info className="w-5 h-5" />
                  More Info
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <Button
        variant="glass"
        size="icon"
        className="absolute left-4 top-1/2 -translate-y-1/2 hidden md:flex"
        onClick={prevSlide}
      >
        <ChevronLeft className="w-6 h-6" />
      </Button>
      <Button
        variant="glass"
        size="icon"
        className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex"
        onClick={nextSlide}
      >
        <ChevronRight className="w-6 h-6" />
      </Button>

      {/* Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {movies.slice(0, 5).map((_, index) => (
          <button
            key={index}
            onClick={() => slideTo(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              index === currentIndex
                ? "w-8 bg-primary"
                : "bg-foreground/30 hover:bg-foreground/50"
            )}
          />
        ))}
      </div>
    </section>
  );
}
