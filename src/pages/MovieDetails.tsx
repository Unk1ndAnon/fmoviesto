import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tmdb, getImageUrl, getBackdropUrl } from "@/lib/tmdb";
import { slugToTitle, generateSlug, getWatchMovieUrl, getMovieUrl } from "@/lib/slug";
import { generateMovieKeywords } from "@/lib/seo-keywords";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MovieRow } from "@/components/movie/MovieRow";
import { SEOHead } from "@/components/seo/SEOHead";
import { MovieJsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { Play, Star, Clock, Calendar, DollarSign } from "lucide-react";

export default function MovieDetails() {
  const { slug } = useParams<{ slug: string }>();
  const searchTitle = slugToTitle(slug || "");

  // Search for movie by title to get TMDB ID
  const { data: searchResult, isLoading: isSearching } = useQuery({
    queryKey: ["movieSearch", searchTitle],
    queryFn: () => tmdb.searchMovieByTitle(searchTitle),
    enabled: !!searchTitle,
  });

  // Fetch full movie details once we have the ID
  const { data: movie, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["movie", searchResult?.id],
    queryFn: () => tmdb.getMovieDetails(searchResult!.id),
    enabled: !!searchResult?.id,
  });

  const isLoading = isSearching || isLoadingDetails;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="h-[60vh] bg-card animate-pulse" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Movie not found</p>
      </div>
    );
  }

  const movieSlug = generateSlug(movie.title);

  const trailer = movie.videos?.results?.find(
    (v) => v.type === "Trailer" && v.site === "YouTube"
  );

  const director = movie.credits?.crew?.find((c) => c.job === "Director");
  const cast = movie.credits?.cast?.slice(0, 8) || [];

  const formatMoney = (amount: number) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const seoKeywords = generateMovieKeywords({
    title: movie.title,
    year: movie.release_date?.split("-")[0],
    genres: movie.genres?.map(g => g.name) || [],
    cast: cast.map(c => c.name),
  });

  return (
    <>
      <SEOHead
        title={`${movie.title} (${movie.release_date?.split("-")[0]})`}
        description={movie.overview}
        image={getBackdropUrl(movie.backdrop_path)}
        type="video.movie"
        keywords={seoKeywords}
      />
      <MovieJsonLd movie={movie} />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        {/* Hero Backdrop */}
        <section className="relative min-h-[60vh] md:min-h-[70vh]">
          {movie.backdrop_path && (
            <>
              <img
                src={getBackdropUrl(movie.backdrop_path)}
                alt={movie.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 hero-gradient" />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
            </>
          )}

          <div className="relative container mx-auto px-4 pt-32 pb-12">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Poster with Play Button */}
              <Link to={getWatchMovieUrl(movie.title)} className="flex-shrink-0 relative group/poster">
                <img
                  src={getImageUrl(movie.poster_path, "w342")}
                  alt={movie.title}
                  className="w-48 md:w-64 rounded-lg shadow-2xl mx-auto md:mx-0 transition-transform duration-300 group-hover/poster:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 group-hover/poster:opacity-100 transition-opacity duration-300 rounded-lg">
                  <div className="w-16 h-16 rounded-full bg-primary/90 backdrop-blur flex items-center justify-center">
                    <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
                  </div>
                </div>
              </Link>

              {/* Info */}
              <div className="flex-1 space-y-4">
                {/* Title & Year */}
                <div>
                  <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-2">
                    {movie.title}
                  </h1>
                  {movie.tagline && (
                    <p className="text-lg text-muted-foreground italic">
                      "{movie.tagline}"
                    </p>
                  )}
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="rating-badge high">
                    <Star className="w-3 h-3" fill="currentColor" />
                    {movie.vote_average?.toFixed(1)}
                  </div>
                  {movie.runtime && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {movie.release_date}
                  </span>
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-2">
                  {movie.genres?.map((genre) => (
                    <Link
                      key={genre.id}
                      to={`/movies?genre=${genre.id}`}
                      className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      {genre.name}
                    </Link>
                  ))}
                </div>

                {/* Overview */}
                <p className="text-muted-foreground leading-relaxed max-w-2xl">
                  {movie.overview}
                </p>

                {/* Details */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {director && (
                    <div>
                      <span className="text-muted-foreground">Director:</span>
                      <p className="text-foreground font-medium">{director.name}</p>
                    </div>
                  )}
                  {movie.budget > 0 && (
                    <div>
                      <span className="text-muted-foreground">Budget:</span>
                      <p className="text-foreground font-medium">{formatMoney(movie.budget)}</p>
                    </div>
                  )}
                  {movie.revenue > 0 && (
                    <div>
                      <span className="text-muted-foreground">Revenue:</span>
                      <p className="text-foreground font-medium">{formatMoney(movie.revenue)}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-4 pt-4">
                  <Link to={getWatchMovieUrl(movie.title)}>
                    <Button variant="hero" size="lg" className="gap-2">
                      <Play className="w-5 h-5" fill="currentColor" />
                      Watch Now
                    </Button>
                  </Link>
                  {trailer && (
                    <a
                      href={`https://www.youtube.com/watch?v=${trailer.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="glass" size="lg" className="gap-2">
                        <Play className="w-5 h-5" />
                        Watch Trailer
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cast */}
        {cast.length > 0 && (
          <section className="container mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Cast</h2>
            <div className="flex flex-wrap gap-2">
              {cast.map((person) => {
                const actorSlug = generateSlug(person.name);
                return (
                  <Link
                    key={person.id}
                    to={`/actor/${actorSlug}`}
                    className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {person.name}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Similar Movies */}
        <section className="container mx-auto px-4">
          {movie.similar?.results && movie.similar.results.length > 0 && (
            <MovieRow
              title="Similar Movies"
              items={movie.similar.results}
              type="movie"
            />
          )}

          {movie.recommendations?.results && movie.recommendations.results.length > 0 && (
            <MovieRow
              title="Recommended"
              items={movie.recommendations.results}
              type="movie"
            />
          )}
        </section>

        <Footer />
      </div>
    </>
  );
}
