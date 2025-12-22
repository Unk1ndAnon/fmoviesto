import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Play, Plus, ChevronLeft, ChevronRight, Star, User } from "lucide-react";
import { Movie, getBackdropUrl, getPosterUrl, getImageUrl, tmdb } from "@/lib/tmdb";
import { getWatchMovieUrl, getMovieUrl } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface HeroSliderProps {
  movies: Movie[];
}

export function HeroSlider({ movies }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentMovie = movies[currentIndex];

  // Fetch detailed movie info for genres, runtime, and credits
  const { data: movieDetails } = useQuery({
    queryKey: ["heroMovieDetails", currentMovie?.id],
    queryFn: () => tmdb.getMovieDetails(currentMovie.id),
    enabled: !!currentMovie?.id,
    staleTime: 1000 * 60 * 10,
  });

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

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const director = movieDetails?.credits?.crew?.find(c => c.job === "Director");
  const cast = movieDetails?.credits?.cast?.slice(0, 3) || [];
  const genres = movieDetails?.genres?.slice(0, 3) || [];
  const runtime = formatRuntime(movieDetails?.runtime);
  const year = currentMovie.release_date?.split("-")[0];
  const voteCount = currentMovie.vote_count;
  const formattedVoteCount = voteCount >= 1000000 
    ? `${(voteCount / 1000000).toFixed(1)}M` 
    : voteCount >= 1000 
      ? `${(voteCount / 1000).toFixed(0)}K` 
      : voteCount?.toString();

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
            fetchPriority={index === 0 ? "high" : "auto"}
          />
          <div className="absolute inset-0 hero-gradient" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
        </div>
      ))}

      {/* Mobile Layout */}
      <div className="absolute inset-0 flex items-center md:hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl animate-slide-up" key={currentMovie.id}>
            {/* Rating */}
            <div className="flex items-center gap-3 mb-4">
              <div className="rating-badge high">
                <Star className="w-3 h-3" fill="currentColor" />
                {currentMovie.vote_average?.toFixed(1)}
              </div>
              <span className="text-sm text-muted-foreground">{year}</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">
              {currentMovie.title}
            </h1>

            {/* Overview */}
            <p className="text-base text-muted-foreground mb-8 line-clamp-3">
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
                  <Plus className="w-5 h-5" />
                  More Info
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout - New Design */}
      <div className="absolute inset-0 hidden md:flex items-center">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-12 gap-8 items-center" key={currentMovie.id}>
            {/* Left: Movie Poster */}
            <div className="col-span-3 lg:col-span-2 animate-fade-in">
              <div className="relative group">
                <img
                  src={getPosterUrl(currentMovie.poster_path, "w500")}
                  alt={currentMovie.title}
                  className="w-full rounded-xl shadow-2xl ring-1 ring-white/10"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Center: Movie Info */}
            <div className="col-span-5 lg:col-span-6 animate-slide-up">
              {/* Genre Badges */}
              {genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {genres.map((genre) => (
                    <span
                      key={genre.id}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 backdrop-blur-sm text-foreground/90 border border-white/20"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Title */}
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground mb-3 leading-tight font-display">
                {currentMovie.title}
              </h1>

              {/* Metadata */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <span>{year}</span>
                {runtime && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                    <span>{runtime}</span>
                  </>
                )}
              </div>

              {/* Overview */}
              <p className="text-base lg:text-lg text-muted-foreground mb-6 line-clamp-3 max-w-xl">
                {currentMovie.overview}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4">
                <Link to={getWatchMovieUrl(currentMovie.title)}>
                  <Button 
                    size="lg" 
                    className="gap-2 bg-white text-black hover:bg-white/90 font-semibold px-8"
                  >
                    <Play className="w-5 h-5" fill="currentColor" />
                    Watch movie
                  </Button>
                </Link>
                <Link to={getMovieUrl(currentMovie.title)}>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="gap-2 border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-foreground px-8"
                  >
                    <Plus className="w-5 h-5" />
                    Add to wishlist
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: Rating & Cast Card */}
            <div className="col-span-4 animate-fade-in">
              <div className="flex flex-col items-end gap-4">
                {/* Rating Display */}
                <div className="text-right">
                  <div className="flex items-baseline gap-1 justify-end">
                    <span className="text-4xl lg:text-5xl font-bold text-green-400">
                      {currentMovie.vote_average?.toFixed(1)}
                    </span>
                    <span className="text-lg text-muted-foreground">/10</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{formattedVoteCount} reviews</p>
                </div>

                {/* Cast Card */}
                {(director || cast.length > 0) && (
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 w-full max-w-xs">
                    {/* Director */}
                    {director && (
                      <div className="mb-3">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Director</p>
                        <div className="flex items-center gap-3">
                          {director.profile_path ? (
                            <img
                              src={getImageUrl(director.profile_path, "w92")}
                              alt={director.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="text-sm font-medium text-foreground">{director.name}</span>
                        </div>
                      </div>
                    )}

                    {/* Cast */}
                    {cast.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Cast</p>
                        <div className="space-y-2">
                          {cast.map((actor) => (
                            <div key={actor.id} className="flex items-center gap-3">
                              {actor.profile_path ? (
                                <img
                                  src={getImageUrl(actor.profile_path, "w92")}
                                  alt={actor.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                  <User className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              <span className="text-sm text-foreground">{actor.name}</span>
                            </div>
                          ))}
                        </div>
                        <Link 
                          to={getMovieUrl(currentMovie.title)}
                          className="block mt-3 text-xs text-primary hover:underline text-center"
                        >
                          See full cast
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
