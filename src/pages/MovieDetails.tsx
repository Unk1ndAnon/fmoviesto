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

type TabType = "cast" | "details";

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
        <section className="relative pt-20 lg:pt-24">
          {/* Background Image */}
          {movie.backdrop_path && (
            <>
              <img
                src={getBackdropUrl(movie.backdrop_path)}
                alt={movie.title}
                className="absolute inset-0 w-full h-full object-cover opacity-30"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/70" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            </>
          )}

          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 3xl:px-16 py-6 lg:py-12 2xl:py-16 3xl:py-20 max-w-[2000px]">
            {/* Mobile Poster - Only visible on mobile/tablet */}
            <div className="lg:hidden mb-4">
              <Link 
                to={getWatchMovieUrl(movie.title)}
                className="group relative block w-[140px] sm:w-[180px] mx-auto rounded-lg overflow-hidden shadow-xl"
              >
                <img
                  src={getImageUrl(movie.poster_path, "w342")}
                  alt={movie.title}
                  className="w-full h-auto"
                />
                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <Play className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground ml-0.5" fill="currentColor" />
                  </div>
                </div>
              </Link>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-12 xl:gap-16 2xl:gap-20 3xl:gap-24">
              {/* Left Content */}
              <div className="flex-1 space-y-3 lg:space-y-6 2xl:space-y-8 lg:max-w-xl xl:max-w-2xl 2xl:max-w-3xl 3xl:max-w-4xl">
                {/* Title */}
                <h1 className="text-lg sm:text-xl lg:text-4xl 2xl:text-5xl 3xl:text-6xl font-bold text-foreground leading-tight text-center lg:text-left">
                  {movie.title}
                </h1>

                {/* Ratings Row */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5 lg:gap-3">
                  {/* IMDb Rating */}
                  <div className="flex items-center gap-1 px-1.5 py-0.5 lg:px-3 lg:py-1.5 rounded bg-[#1a1d29] border border-border">
                    <span className="text-rating-gold text-[10px] lg:text-sm font-bold">IMDb</span>
                    <span className="text-foreground text-xs lg:text-sm font-semibold">
                      {omdbData?.ratings?.imdb || movie.vote_average?.toFixed(1)}
                    </span>
                  </div>
                  
                  {/* Rotten Tomatoes */}
                  {omdbData?.ratings?.rottenTomatoes && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 lg:px-3 lg:py-1.5 rounded bg-[#1a1d29] border border-border">
                      <span className="text-sm lg:text-lg">🍅</span>
                      <span className="text-foreground text-xs lg:text-sm font-semibold">{omdbData.ratings.rottenTomatoes}</span>
                    </div>
                  )}
                  
                  {/* Votes */}
                  <div className="flex items-center gap-1 text-muted-foreground text-[10px] lg:text-sm 2xl:text-base">
                    <Star className="w-3 h-3 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-rating-gold" fill="currentColor" />
                    <span>({omdbData?.imdbVotes || movie.vote_count?.toLocaleString()})</span>
                  </div>
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5 lg:gap-3 2xl:gap-4 text-[10px] lg:text-sm 2xl:text-base text-muted-foreground">
                  <span className="px-1.5 py-0.5 2xl:px-3 2xl:py-1 rounded bg-secondary text-secondary-foreground text-[10px] lg:text-xs 2xl:text-sm font-medium">HD</span>
                  {movie.runtime && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3 lg:w-4 lg:h-4" />
                      {formatRuntime(movie.runtime)}
                    </span>
                  )}
                  <span>•</span>
                  <span>{year}</span>
                  <span>•</span>
                  <span className="line-clamp-1">{genres}</span>
                </div>

                {/* Overview */}
                <p className="text-muted-foreground leading-relaxed text-xs lg:text-base 2xl:text-lg 3xl:text-xl text-center lg:text-left line-clamp-3 lg:line-clamp-none">
                  {movie.overview}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 lg:gap-3 2xl:gap-4">
                  <Button
                    onClick={() => trailer && setTrailerOpen(true)}
                    className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-3 lg:px-6 2xl:px-8 h-8 lg:h-10 2xl:h-12 text-xs lg:text-sm 2xl:text-base"
                  >
                    <Play className="w-3.5 h-3.5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" fill="currentColor" />
                    Trailer
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="gap-1.5 rounded-full px-3 lg:px-5 h-8 lg:h-10 text-xs lg:text-sm border-border bg-secondary/50 hover:bg-secondary text-foreground"
                    onClick={handleWatchlist}
                  >
                    <Plus className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                    {inWatchlist ? "Listed" : "List"}
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                      "rounded-full h-8 w-8 lg:h-10 lg:w-10 border-border bg-secondary/50 hover:bg-secondary",
                      isFavorite && "bg-destructive/20 border-destructive/50"
                    )}
                    onClick={handleFavorite}
                  >
                    <Heart className={cn("w-3.5 h-3.5 lg:w-4 lg:h-4", isFavorite ? "fill-destructive text-destructive" : "text-foreground")} />
                  </Button>

                  <SharePopover title={movie.title} />
                </div>

                {/* Tabs */}
                <div className="flex items-center justify-center lg:justify-start gap-3 lg:gap-6 pt-2 lg:pt-4 border-t border-border overflow-x-auto scroll-hide">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "text-[11px] lg:text-sm font-medium transition-colors py-1.5 lg:py-2 whitespace-nowrap",
                        activeTab === tab.id 
                          ? "text-foreground border-b-2 border-primary -mb-[2px]" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content - Cast */}
                {activeTab === "cast" && cast.length > 0 && (
                  <div className="pt-1 lg:pt-2">
                    <div className="flex items-start gap-3 lg:gap-6 overflow-x-auto pb-3 lg:pb-4 scroll-hide justify-center lg:justify-start">
                      {cast.map((person) => (
                        <Link
                          key={person.id}
                          to={`/actor/${generateSlug(person.name)}`}
                          className="flex flex-col items-center gap-1 lg:gap-2 min-w-[50px] lg:min-w-[70px] group"
                        >
                          <div className="w-10 h-10 lg:w-16 lg:h-16 rounded-full overflow-hidden bg-secondary ring-2 ring-transparent group-hover:ring-primary transition-all">
                            {person.profile_path ? (
                              <img
                                src={getImageUrl(person.profile_path, "w185")}
                                alt={person.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs lg:text-lg">
                                {person.name[0]}
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] lg:text-xs text-muted-foreground text-center line-clamp-1 max-w-[50px] lg:max-w-[70px] group-hover:text-foreground transition-colors">
                            {person.name.split(' ')[0]}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab Content - Details */}
                {activeTab === "details" && (
                  <div className="pt-1 lg:pt-2 space-y-1.5 lg:space-y-3 text-[10px] lg:text-sm">
                    {director && (
                      <div className="flex justify-center lg:justify-start">
                        <span className="text-muted-foreground w-16 lg:w-24">Director:</span>
                        <Link 
                          to={`/director/${generateSlug(director.name)}`}
                          className="text-foreground hover:text-primary transition-colors"
                        >
                          {director.name}
                        </Link>
                      </div>
                    )}
                    <div className="flex justify-center lg:justify-start">
                      <span className="text-muted-foreground w-16 lg:w-24">Release:</span>
                      <span className="text-foreground">{movie.release_date}</span>
                    </div>
                    <div className="flex justify-center lg:justify-start">
                      <span className="text-muted-foreground w-16 lg:w-24">Status:</span>
                      <span className="text-foreground">{movie.status}</span>
                    </div>
                    {movie.budget > 0 && (
                      <div className="flex justify-center lg:justify-start">
                        <span className="text-muted-foreground w-16 lg:w-24">Budget:</span>
                        <span className="text-foreground">${movie.budget.toLocaleString()}</span>
                      </div>
                    )}
                    {movie.revenue > 0 && (
                      <div className="flex justify-center lg:justify-start">
                        <span className="text-muted-foreground w-16 lg:w-24">Revenue:</span>
                        <span className="text-foreground">${movie.revenue.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right - Movie Poster (Desktop only) */}
              <div className="hidden lg:block lg:sticky lg:top-24 flex-shrink-0">
                <div className="relative w-[280px] xl:w-[320px] 2xl:w-[380px] 3xl:w-[440px] 4xl:w-[500px]">
                  {/* Poster with grayscale effect */}
                  <Link 
                    to={getWatchMovieUrl(movie.title)}
                    className="group relative block rounded-xl 2xl:rounded-2xl overflow-hidden shadow-2xl"
                  >
                    <img
                      src={getImageUrl(movie.poster_path, "w780")}
                      alt={movie.title}
                      className="w-full h-auto grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                    {/* Red play button - always visible */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 xl:w-20 xl:h-20 2xl:w-24 2xl:h-24 3xl:w-28 3xl:h-28 rounded-full bg-primary/90 flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:bg-primary transition-all duration-300">
                        <Play className="w-8 h-8 xl:w-10 xl:h-10 2xl:w-12 2xl:h-12 3xl:w-14 3xl:h-14 text-primary-foreground ml-1" fill="currentColor" />
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
