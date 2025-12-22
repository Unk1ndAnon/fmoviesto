import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tmdb, getImageUrl, getBackdropUrl } from "@/lib/tmdb";
import { slugToTitle, generateSlug, getWatchTVUrl, getTVShowUrl } from "@/lib/slug";
import { generateTVKeywords } from "@/lib/seo-keywords";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MovieRow } from "@/components/movie/MovieRow";
import { SEOHead } from "@/components/seo/SEOHead";
import { TVShowJsonLd } from "@/components/seo/JsonLd";
import { TrailerDialog } from "@/components/movie/TrailerDialog";
import { MovieTags } from "@/components/movie/MovieTags";
import { GenerateTagsButton } from "@/components/movie/GenerateTagsButton";
import { RelatedGenreLinks, Breadcrumbs, QuickLinks } from "@/components/seo/InternalLinks";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Star, Calendar, ChevronRight, ChevronLeft, Plus, Film, Clock, ChevronDown, ChevronUp, Bell, BellOff } from "lucide-react";
import { SharePopover } from "@/components/SharePopover";
import { useWatchlist } from "@/hooks/useUserLists";
import { useTVFollows } from "@/hooks/useTVFollows";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function TVDetails() {
  const { slug } = useParams<{ slug: string }>();
  const searchTitle = slugToTitle(slug || "");
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const episodeScrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { isFollowing, followShow, unfollowShow, getFollow } = useTVFollows();

  // Search for TV show by title to get TMDB ID
  const { data: searchResult, isLoading: isSearching } = useQuery({
    queryKey: ["tvSearch", searchTitle],
    queryFn: () => tmdb.searchTVByTitle(searchTitle),
    enabled: !!searchTitle,
  });

  // Fetch full TV details once we have the ID
  const { data: show, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["tv", searchResult?.id],
    queryFn: () => tmdb.getTVDetails(searchResult!.id),
    enabled: !!searchResult?.id,
  });

  const { data: seasonData } = useQuery({
    queryKey: ["tvSeason", searchResult?.id, selectedSeason],
    queryFn: () => tmdb.getSeasonDetails(searchResult!.id, selectedSeason),
    enabled: !!searchResult?.id && selectedSeason > 0,
  });

  const isLoading = isSearching || isLoadingDetails;

  const scrollEpisodes = (direction: "left" | "right") => {
    if (episodeScrollRef.current) {
      const scrollAmount = 300;
      episodeScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleWatchlist = () => {
    if (!user) {
      toast.error("Please sign in to add to watchlist");
      return;
    }
    if (!show) return;

    const inWatchlist = isInWatchlist(show.id, "tv");
    if (inWatchlist) {
      removeFromWatchlist.mutate({ tmdb_id: show.id, media_type: "tv" });
    } else {
      addToWatchlist.mutate({
        tmdb_id: show.id,
        media_type: "tv",
        title: show.name,
        poster_path: show.poster_path,
        vote_average: show.vote_average,
        release_date: show.first_air_date,
      });
    }
  };

  const handleFollow = () => {
    if (!user) {
      toast.error("Please sign in to follow shows");
      return;
    }
    if (!show) return;

    const following = isFollowing(show.id);
    if (following) {
      unfollowShow.mutate(show.id);
    } else {
      const latestSeason = show.number_of_seasons || 1;
      const latestEpisode = seasonData?.episodes?.[seasonData.episodes.length - 1];
      followShow.mutate({
        tmdb_id: show.id,
        title: show.name,
        poster_path: show.poster_path,
        last_season: latestSeason,
        last_episode: latestEpisode?.episode_number || 1,
        last_air_date: latestEpisode?.air_date,
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

  if (!show) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">TV Show not found</p>
      </div>
    );
  }

  const showSlug = generateSlug(show.name);
  const cast = show.credits?.cast?.slice(0, 8) || [];
  const seasons = show.seasons?.filter((s) => s.season_number > 0) || [];
  const isOngoing = show.status === "Returning Series" || show.status === "In Production";
  const statusText = isOngoing ? "Ongoing" : "Completed";
  const year = show.first_air_date?.split("-")[0];
  const genres = show.genres?.map(g => g.name).join(", ") || "";
  const episodeCount = seasonData?.episodes?.length || 0;
  const trailer = show.videos?.results?.find(
    (v) => v.type === "Trailer" && v.site === "YouTube"
  );

  const seoKeywords = generateTVKeywords({
    title: show.name,
    year,
    genres: show.genres?.map(g => g.name) || [],
    cast: cast.map(c => c.name),
    seasons: show.number_of_seasons,
    latestSeason: show.number_of_seasons,
  });

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "TV Shows", href: "/tv" },
    { label: show.name },
  ];

  return (
    <>
      <SEOHead
        title={`${show.name} (${year})`}
        description={show.overview}
        image={getBackdropUrl(show.backdrop_path)}
        type="video.tv_show"
        keywords={seoKeywords}
      />
      <TVShowJsonLd show={show} />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        {/* Breadcrumbs for SEO */}
        <div className="container mx-auto px-4 pt-20">
          <Breadcrumbs items={breadcrumbs} />
        </div>
        {/* Hero Section - Desktop Design */}
        <section className="relative min-h-[70vh] lg:min-h-[80vh]">
          {show.backdrop_path && (
            <>
              <img
                src={getBackdropUrl(show.backdrop_path)}
                alt={show.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
            </>
          )}

          <div className="relative container mx-auto px-4 pt-32 lg:pt-40 pb-8">
            <div className="max-w-3xl space-y-5">
              {/* Title with Season */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                {show.name} | Season {selectedSeason}
              </h1>

              {/* Meta Row: Rating, Status, Year, Genre */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="w-4 h-4" fill="currentColor" />
                  <span className="font-semibold">{show.vote_average?.toFixed(1)}/10</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isOngoing 
                    ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                    : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                }`}>
                  {statusText}
                </span>
                <span className="text-muted-foreground">{year}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{genres}</span>
              </div>

              {/* Overview */}
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base max-w-2xl line-clamp-3">
                {show.overview}
              </p>

              {/* Creator Info */}
              {show.created_by && show.created_by.length > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Created by: </span>
                  {show.created_by.map((creator, index) => (
                    <span key={creator.id}>
                      <Link 
                        to={`/director/${generateSlug(creator.name)}`}
                        className="text-foreground font-medium hover:text-primary transition-colors"
                      >
                        {creator.name}
                      </Link>
                      {index < show.created_by!.length - 1 && ", "}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to={getWatchTVUrl(show.name, selectedSeason, 1)}>
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
                  {show && isInWatchlist(show.id, "tv") ? "In Watchlist" : "My Watchlist"}
                </Button>
                <Button 
                  variant={show && isFollowing(show.id) ? "default" : "outline"}
                  className={`gap-2 rounded-full px-6 ${
                    show && isFollowing(show.id) 
                      ? "bg-primary text-primary-foreground" 
                      : "border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/80"
                  }`}
                  onClick={handleFollow}
                >
                  {show && isFollowing(show.id) ? (
                    <>
                      <BellOff className="w-4 h-4" />
                      Following
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      Follow
                    </>
                  )}
                </Button>
                <SharePopover title={show?.name || ""} />
              </div>

              {/* Episode List Section */}
              <div className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-foreground">List Episodes</h2>
                    <span className="text-muted-foreground text-sm">({episodeCount} Eps)</span>
                    <Select
                      value={String(selectedSeason)}
                      onValueChange={(v) => { setSelectedSeason(parseInt(v)); setShowAllEpisodes(false); }}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs bg-background/50 border-border/50">
                        <SelectValue placeholder="Season" />
                      </SelectTrigger>
                      <SelectContent>
                        {seasons.map((season) => (
                          <SelectItem key={season.season_number} value={String(season.season_number)}>
                            Season {season.season_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="hidden md:flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-background/50 hover:bg-background/80"
                      onClick={() => scrollEpisodes("left")}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-background/50 hover:bg-background/80"
                      onClick={() => scrollEpisodes("right")}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Episodes: swipe row on mobile; on desktop show up to 8 at once, and use a denser grid when expanded */}
                <div
                  ref={episodeScrollRef}
                  className={`flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory md:grid md:overflow-visible md:snap-none ${
                    showAllEpisodes ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-3 lg:grid-cols-4"
                  }`}
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {(showAllEpisodes ? seasonData?.episodes : seasonData?.episodes?.slice(0, 8))?.map((episode) => (
                    <Link
                      key={episode.id}
                      to={getWatchTVUrl(show.name, selectedSeason, episode.episode_number)}
                      className="flex-shrink-0 w-56 md:w-auto snap-start group"
                    >
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-card mb-2">
                        {episode.still_path ? (
                          <img
                            src={getImageUrl(episode.still_path, "w780")}
                            alt={episode.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <Film className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" />
                        </div>
                      </div>
                      <p className="text-xs text-foreground font-medium line-clamp-1 group-hover:text-primary transition-colors">
                        S{selectedSeason} E{episode.episode_number} - {episode.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        {episode.air_date && (
                          <span>
                            {new Date(episode.air_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        )}
                        {episode.runtime && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {episode.runtime}m
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
                
                {/* View All Episodes Button */}
                {seasonData?.episodes && seasonData.episodes.length > 8 && (
                  <Button
                    variant="outline"
                    className="mt-3 gap-2 rounded-full px-6 border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/80"
                    onClick={() => setShowAllEpisodes(!showAllEpisodes)}
                  >
                    {showAllEpisodes ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        View All {seasonData.episodes.length} Episodes
                      </>
                    )}
                  </Button>
                )}
              </div>

            </div>
          </div>
        </section>

        {/* AI-Generated Tags */}
        {show && (
          <section className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3 mb-2">
              <MovieTags tmdbId={show.id} mediaType="tv" maxTags={10} />
              <GenerateTagsButton tmdbId={show.id} mediaType="tv" title={show.name} />
            </div>
          </section>
        )}

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

        {/* Similar Shows */}
        <section className="container mx-auto px-4">
          {show.similar?.results && show.similar.results.length > 0 && (
            <MovieRow
              title="Similar Shows"
              items={show.similar.results}
              type="tv"
            />
          )}
        </section>

        {/* Internal Links for SEO */}
        <section className="container mx-auto px-4">
          <RelatedGenreLinks genres={show.genres} type="tv" />
          <QuickLinks currentType="tv" />
        </section>

        <Footer />
      </div>

      {trailer && (
        <TrailerDialog
          open={trailerOpen}
          onOpenChange={setTrailerOpen}
          trailerKey={trailer.key}
          title={show.name}
        />
      )}
    </>
  );
}
