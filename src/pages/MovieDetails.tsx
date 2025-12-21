import { useState } from "react";
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
import { TrailerDialog } from "@/components/movie/TrailerDialog";
import { RelatedGenreLinks, Breadcrumbs, QuickLinks } from "@/components/seo/InternalLinks";
import { Button } from "@/components/ui/button";
import { Play, Star, Clock, Calendar, Plus } from "lucide-react";
import { SharePopover } from "@/components/SharePopover";
import { useWatchlist } from "@/hooks/useUserLists";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function MovieDetails() {
  const { slug } = useParams<{ slug: string }>();
  const searchTitle = slugToTitle(slug || "");
  const { user } = useAuth();
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const [trailerOpen, setTrailerOpen] = useState(false);

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

  const handleWatchlist = () => {
    if (!user) {
      toast.error("Please sign in to add to watchlist");
      return;
    }
    if (!movie) return;

    const inWatchlist = isInWatchlist(movie.id, "movie");
    if (inWatchlist) {
      removeFromWatchlist.mutate({ tmdb_id: movie.id, media_type: "movie" });
    } else {
      addToWatchlist.mutate({
        tmdb_id: movie.id,
        media_type: "movie",
        title: movie.title,
        poster_path: movie.poster_path,
        vote_average: movie.vote_average,
        release_date: movie.release_date,
      });
    }
  };


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
  const year = movie.release_date?.split("-")[0];
  const genres = movie.genres?.map(g => g.name).join(", ") || "";

  const formatMoney = (amount: number) => {
    if (!amount) return null;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatRuntime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const seoKeywords = generateMovieKeywords({
    title: movie.title,
    year,
    genres: movie.genres?.map(g => g.name) || [],
    cast: cast.map(c => c.name),
  });

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Movies", href: "/movies" },
    { label: movie.title },
  ];

  return (
    <>
      <SEOHead
        title={`${movie.title} (${year})`}
        description={movie.overview}
        image={getBackdropUrl(movie.backdrop_path)}
        type="video.movie"
        keywords={seoKeywords}
      />
      <MovieJsonLd movie={movie} />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        
        {/* Breadcrumbs for SEO */}
        <div className="container mx-auto px-4 pt-20">
          <Breadcrumbs items={breadcrumbs} />
        </div>

        {/* Hero Section - Matching TV Shows Design */}
        <section className="relative">
          {movie.backdrop_path && (
            <>
              <img
                src={getBackdropUrl(movie.backdrop_path)}
                alt={movie.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
            </>
          )}

          <div className="relative container mx-auto px-4 pt-32 lg:pt-40 pb-8">
            <div className="max-w-3xl space-y-5">
              {/* Title */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                {movie.title}
              </h1>

              {/* Meta Row: Rating, Runtime, Year, Genre */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="w-4 h-4" fill="currentColor" />
                  <span className="font-semibold">{movie.vote_average?.toFixed(1)}/10</span>
                </div>
                {movie.runtime && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {formatRuntime(movie.runtime)}
                  </span>
                )}
                <span className="text-muted-foreground">{year}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{genres}</span>
              </div>

              {/* Tagline */}
              {movie.tagline && (
                <p className="text-muted-foreground italic text-sm">
                  "{movie.tagline}"
                </p>
              )}

              {/* Overview */}
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base max-w-2xl line-clamp-3">
                {movie.overview}
              </p>

              {/* Additional Details */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {director && (
                  <div>
                    <span className="text-muted-foreground">Director: </span>
                    <span className="text-foreground font-medium">{director.name}</span>
                  </div>
                )}
                {movie.budget > 0 && (
                  <div>
                    <span className="text-muted-foreground">Budget: </span>
                    <span className="text-foreground font-medium">{formatMoney(movie.budget)}</span>
                  </div>
                )}
                {movie.revenue > 0 && (
                  <div>
                    <span className="text-muted-foreground">Revenue: </span>
                    <span className="text-foreground font-medium">{formatMoney(movie.revenue)}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to={getWatchMovieUrl(movie.title)}>
                  <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6">
                    <Play className="w-4 h-4" fill="currentColor" />
                    Watch Now
                  </Button>
                </Link>
                {trailer && (
                  <Button 
                    variant="outline" 
                    className="gap-2 rounded-full px-6 border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/80"
                    onClick={() => setTrailerOpen(true)}
                  >
                    <Play className="w-4 h-4" />
                    Trailer
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  className="gap-2 rounded-full px-6 border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/80"
                  onClick={handleWatchlist}
                >
                  <Plus className="w-4 h-4" />
                  {movie && isInWatchlist(movie.id, "movie") ? "In Watchlist" : "My Watchlist"}
                </Button>
                <SharePopover title={movie?.title || ""} />
              </div>
            </div>
          </div>
        </section>

        {/* Cast Section */}
        {cast.length > 0 && (
          <section className="container mx-auto px-4 py-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Cast</h2>
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

        {/* Internal Links for SEO */}
        <section className="container mx-auto px-4">
          <RelatedGenreLinks genres={movie.genres} type="movie" />
          <QuickLinks currentType="movie" />
        </section>

        <Footer />
      </div>

      {trailer && (
        <TrailerDialog
          open={trailerOpen}
          onOpenChange={setTrailerOpen}
          trailerKey={trailer.key}
          title={movie.title}
        />
      )}
    </>
  );
}
