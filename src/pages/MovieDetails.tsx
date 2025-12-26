import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tmdb, getImageUrl, getBackdropUrl } from "@/lib/tmdb";
import { slugToTitle, generateSlug, getWatchMovieUrl } from "@/lib/slug";
import { generateMovieKeywords } from "@/lib/seo-keywords";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MovieRow } from "@/components/movie/MovieRow";
import { SEOHead } from "@/components/seo/SEOHead";
import { MovieJsonLd } from "@/components/seo/JsonLd";
import { TrailerDialog } from "@/components/movie/TrailerDialog";
import { MovieTags } from "@/components/movie/MovieTags";
import { GenerateTagsButton } from "@/components/movie/GenerateTagsButton";
import { RelatedGenreLinks, Breadcrumbs, QuickLinks } from "@/components/seo/InternalLinks";
import { Button } from "@/components/ui/button";
import { Play, Star, Clock, Plus, Heart, ChevronRight } from "lucide-react";
import { SharePopover } from "@/components/SharePopover";
import { useWatchlist, useFavorites } from "@/hooks/useUserLists";
import { useAutoTag } from "@/hooks/useAutoTag";
import { useOMDBRatings } from "@/hooks/useOMDBRatings";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TabType = "cast" | "gallery" | "trailer" | "details";

export default function MovieDetails() {
  const { slug } = useParams<{ slug: string }>();
  const searchTitle = slugToTitle(slug || "");
  const { user } = useAuth();
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { isFavorite: isInFavorites, addFavorite, removeFavorite } = useFavorites();
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("cast");

  const { data: searchResult, isLoading: isSearching } = useQuery({
    queryKey: ["movieSearch", searchTitle],
    queryFn: () => tmdb.searchMovieByTitle(searchTitle),
    enabled: !!searchTitle,
  });

  const { data: movie, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["movie", searchResult?.id],
    queryFn: () => tmdb.getMovieDetails(searchResult!.id),
    enabled: !!searchResult?.id,
  });

  const isLoading = isSearching || isLoadingDetails;

  // Fetch OMDB ratings (title/year for lookup)
  const releaseYear = movie?.release_date?.split("-")[0];
  const { data: omdbData } = useOMDBRatings(
    undefined,
    movie?.title,
    releaseYear
  );

  useAutoTag({ tmdbId: movie?.id, mediaType: "movie" });

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

  const handleFavorite = () => {
    if (!user) {
      toast.error("Please sign in to add to favorites");
      return;
    }
    if (!movie) return;

    const inFav = isInFavorites(movie.id, "movie");
    if (inFav) {
      removeFavorite.mutate({ tmdb_id: movie.id, media_type: "movie" });
    } else {
      addFavorite.mutate({
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
        <div className="h-[70vh] bg-card animate-pulse" />
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

  const trailer = movie.videos?.results?.find(
    (v) => v.type === "Trailer" && v.site === "YouTube"
  );

  const director = movie.credits?.crew?.find((c) => c.job === "Director");
  const cast = movie.credits?.cast?.slice(0, 8) || [];
  const year = movie.release_date?.split("-")[0];
  const genres = movie.genres?.map(g => g.name).join(" / ") || "";

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

  const currentUrl = `${window.location.origin}${window.location.pathname}`;
  const backdropImage = movie.backdrop_path 
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` 
    : undefined;
  
  const seoTitle = `Watch ${movie.title} (${year}) Online Free – Fmovies`;
  const seoDescription = `Watch ${movie.title} (${year}) online free in HD on Fmovies. Stream movies instantly without signup.`;

  const tabs: { id: TabType; label: string }[] = [
    { id: "cast", label: "Cast & Crew" },
    { id: "gallery", label: "Gallery" },
    { id: "trailer", label: "Trailer" },
    { id: "details", label: "More Details" },
  ];

  const isFavorite = movie ? isInFavorites(movie.id, "movie") : false;
  const inWatchlist = movie ? isInWatchlist(movie.id, "movie") : false;

  return (
    <>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        image={backdropImage}
        url={currentUrl}
        type="video.movie"
        keywords={seoKeywords}
        siteName="Fmovies"
      />
      <MovieJsonLd movie={movie} breadcrumbs={breadcrumbs} />

      <div className="min-h-screen flex flex-col bg-background">
        {/* Gradient overlay at top */}
        <div className="fixed top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/20 via-primary/10 to-transparent pointer-events-none z-0" />
        
        <Navbar />

        {/* Hero Section */}
        <section className="relative min-h-[85vh] overflow-hidden">
          {/* Background Image */}
          {movie.backdrop_path && (
            <>
              <img
                src={getBackdropUrl(movie.backdrop_path)}
                alt={movie.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            </>
          )}

          <div className="relative container mx-auto px-4 pt-24 lg:pt-32 pb-8">
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
              {/* Left Content */}
              <div className="flex-1 space-y-5 max-w-2xl">
                {/* Title */}
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                  {movie.title}
                </h1>

                {/* Ratings */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* IMDb Rating */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-rating-gold/20 border border-rating-gold/30">
                    <span className="text-rating-gold text-sm font-bold">IMDb</span>
                    <span className="text-foreground font-semibold">
                      {omdbData?.ratings?.imdb || movie.vote_average?.toFixed(1)}
                    </span>
                  </div>
                  
                  {/* Rotten Tomatoes */}
                  {omdbData?.ratings?.rottenTomatoes && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-destructive/20 border border-destructive/30">
                      <span className="text-xl">🍅</span>
                      <span className="text-foreground font-semibold">{omdbData.ratings.rottenTomatoes}</span>
                    </div>
                  )}
                  
                  {/* Metacritic */}
                  {omdbData?.ratings?.metacritic && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-rating-gold/20 border border-rating-gold/30">
                      <span className="text-rating-gold text-sm font-bold">MC</span>
                      <span className="text-foreground font-semibold">{omdbData.ratings.metacritic}</span>
                    </div>
                  )}
                  
                  {/* Views count */}
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Star className="w-4 h-4 text-rating-gold" fill="currentColor" />
                    <span>({omdbData?.imdbVotes || movie.vote_count?.toLocaleString()} votes)</span>
                  </div>
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs font-medium">HD</span>
                  {movie.runtime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatRuntime(movie.runtime)}
                    </span>
                  )}
                  <span>{year}</span>
                  <span>•</span>
                  <span>{genres}</span>
                </div>

                {/* Overview */}
                <p className="text-muted-foreground leading-relaxed text-sm md:text-base line-clamp-4">
                  {movie.overview}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-4">
                  <Button
                    onClick={() => trailer && setTrailerOpen(true)}
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6"
                  >
                    <Play className="w-4 h-4" fill="currentColor" />
                    Watch Trailer
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="gap-2 rounded-full px-5 border-border bg-background/50 backdrop-blur-sm hover:bg-secondary text-foreground"
                    onClick={handleWatchlist}
                  >
                    <Plus className="w-4 h-4" />
                    {inWatchlist ? "In List" : "Add List"}
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                      "rounded-full border-border bg-background/50 backdrop-blur-sm hover:bg-secondary",
                      isFavorite && "bg-destructive/20 border-destructive/50"
                    )}
                    onClick={handleFavorite}
                  >
                    <Heart className={cn("w-4 h-4", isFavorite ? "fill-destructive text-destructive" : "text-foreground")} />
                  </Button>

                  <SharePopover title={movie.title} />

                </div>

                {/* Tabs */}
                <div className="flex items-center gap-6 pt-6 border-t border-border mt-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "text-sm font-medium transition-colors pb-2",
                        activeTab === tab.id 
                          ? "text-foreground border-b-2 border-primary" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content - Cast */}
                {activeTab === "cast" && cast.length > 0 && (
                  <div className="pt-4">
                    <div className="flex items-center gap-4 overflow-x-auto pb-4 scroll-hide">
                      {cast.map((person) => (
                        <Link
                          key={person.id}
                          to={`/actor/${generateSlug(person.name)}`}
                          className="flex flex-col items-center gap-2 min-w-[80px] group"
                        >
                          <div className="w-16 h-16 rounded-full overflow-hidden bg-secondary ring-2 ring-transparent group-hover:ring-primary transition-all">
                            {person.profile_path ? (
                              <img
                                src={getImageUrl(person.profile_path, "w185")}
                                alt={person.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xl">
                                {person.name[0]}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground text-center line-clamp-1 max-w-[80px]">
                            {person.name}
                          </span>
                        </Link>
                      ))}
                      <button className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary hover:bg-muted transition-colors ml-2">
                        <ChevronRight className="w-5 h-5 text-foreground" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab Content - Details */}
                {activeTab === "details" && (
                  <div className="pt-4 space-y-3 text-sm">
                    {director && (
                      <div className="flex">
                        <span className="text-muted-foreground w-24">Director:</span>
                        <Link 
                          to={`/director/${generateSlug(director.name)}`}
                          className="text-foreground hover:text-primary transition-colors"
                        >
                          {director.name}
                        </Link>
                      </div>
                    )}
                    <div className="flex">
                      <span className="text-muted-foreground w-24">Release:</span>
                      <span className="text-foreground">{movie.release_date}</span>
                    </div>
                    <div className="flex">
                      <span className="text-muted-foreground w-24">Status:</span>
                      <span className="text-foreground">{movie.status}</span>
                    </div>
                    {movie.budget > 0 && (
                      <div className="flex">
                        <span className="text-muted-foreground w-24">Budget:</span>
                        <span className="text-foreground">${movie.budget.toLocaleString()}</span>
                      </div>
                    )}
                    {movie.revenue > 0 && (
                      <div className="flex">
                        <span className="text-muted-foreground w-24">Revenue:</span>
                        <span className="text-foreground">${movie.revenue.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Right - Movie Poster */}
              <div className="hidden lg:block relative">
                <div className="relative w-[300px] xl:w-[350px]">
                  {/* Poster with grayscale effect */}
                  <Link 
                    to={getWatchMovieUrl(movie.title)}
                    className="group relative block rounded-xl overflow-hidden shadow-2xl"
                  >
                    <img
                      src={getImageUrl(movie.poster_path, "w500")}
                      alt={movie.title}
                      className="w-full h-auto grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                    {/* Red play button - always visible */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                        <Play className="w-10 h-10 text-primary-foreground ml-1" fill="currentColor" />
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI-Generated Tags */}
        {movie && (
          <section className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <MovieTags tmdbId={movie.id} mediaType="movie" maxTags={10} />
              <GenerateTagsButton tmdbId={movie.id} mediaType="movie" title={movie.title} />
            </div>
          </section>
        )}

        {/* Related Movies */}
        <section className="container mx-auto px-4 py-8">
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-primary rounded-full" />
            Related Movies
          </h2>
          
          {movie.similar?.results && movie.similar.results.length > 0 && (
            <MovieRow
              title=""
              items={movie.similar.results}
              type="movie"
            />
          )}

          {movie.recommendations?.results && movie.recommendations.results.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-rating-green rounded-full" />
                Recommended
              </h2>
              <MovieRow
                title=""
                items={movie.recommendations.results}
                type="movie"
              />
            </div>
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
