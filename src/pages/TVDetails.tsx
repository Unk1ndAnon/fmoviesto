import { useState, useRef, useEffect } from "react";
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
import { Play, Star, ChevronRight, ChevronLeft, Plus, Film, Clock, ChevronDown, ChevronUp, Bell, BellOff, Heart } from "lucide-react";
import { SharePopover } from "@/components/SharePopover";
import { useWatchlist, useFavorites } from "@/hooks/useUserLists";
import { useTVFollows } from "@/hooks/useTVFollows";
import { useAutoTag } from "@/hooks/useAutoTag";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPromptDialog } from "@/components/AuthPromptDialog";
import { cn } from "@/lib/utils";
import { incrementViewCount } from "@/lib/viewCounter";

type TabType = "cast" | "details" | "episodes";

export default function TVDetails() {
  const { slug } = useParams<{ slug: string }>();
  const searchTitle = slugToTitle(slug || "");
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("episodes");
  const episodeScrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { isFavorite: isInFavorites, addFavorite, removeFavorite } = useFavorites();
  const { isFollowing, followShow, unfollowShow } = useTVFollows();

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

  // Auto-tag TV show on page view if not already tagged
  useAutoTag({ tmdbId: show?.id, mediaType: "tv" });

  // Track view count
  useEffect(() => {
    if (show?.id) {
      incrementViewCount(show.id, 'tv');
    }
  }, [show?.id]);

  const scrollEpisodes = (direction: "left" | "right") => {
    if (episodeScrollRef.current) {
      const scrollAmount = 300;
      episodeScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authPromptAction, setAuthPromptAction] = useState<"favorites" | "watchlist" | "follow">("favorites");

  const handleWatchlist = () => {
    if (!user) {
      setAuthPromptAction("watchlist");
      setAuthPromptOpen(true);
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

  const handleFavorite = () => {
    if (!user) {
      setAuthPromptAction("favorites");
      setAuthPromptOpen(true);
      return;
    }
    if (!show) return;

    const inFav = isInFavorites(show.id, "tv");
    if (inFav) {
      removeFavorite.mutate({ tmdb_id: show.id, media_type: "tv" });
    } else {
      addFavorite.mutate({
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
      setAuthPromptAction("follow");
      setAuthPromptOpen(true);
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
        <div className="h-[70vh] bg-card animate-pulse" />
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

  const cast = show.credits?.cast?.slice(0, 8) || [];
  const seasons = show.seasons?.filter((s) => s.season_number > 0) || [];
  const isOngoing = show.status === "Returning Series" || show.status === "In Production";
  const statusText = isOngoing ? "Ongoing" : "Completed";
  const year = show.first_air_date?.split("-")[0];
  const genres = show.genres?.map(g => g.name).join(" / ") || "";
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

  const currentUrl = `${window.location.origin}${window.location.pathname}`;
  const backdropImage = show.backdrop_path 
    ? `https://image.tmdb.org/t/p/original${show.backdrop_path}` 
    : undefined;
  
  const seoTitle = `Watch ${show.name} (${year}) TV Series Online Free – Fmovies`;
  const seoDescription = `Watch ${show.name} TV series online free in HD on Fmovies. Stream all seasons and episodes instantly.`;

  const tabs: { id: TabType; label: string }[] = [
    { id: "episodes", label: "Episodes" },
    { id: "cast", label: "Cast & Crew" },
    { id: "details", label: "More Details" },
  ];

  const isFavorite = show ? isInFavorites(show.id, "tv") : false;
  const inWatchlist = show ? isInWatchlist(show.id, "tv") : false;
  const following = show ? isFollowing(show.id) : false;

  return (
    <>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        image={backdropImage}
        url={currentUrl}
        type="video.tv_show"
        keywords={seoKeywords}
        siteName="Fmovies"
      />
      <TVShowJsonLd show={show} breadcrumbs={breadcrumbs} />

      <div className="min-h-screen flex flex-col bg-background">
        {/* Gradient overlay at top */}
        <div className="fixed top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/20 via-primary/10 to-transparent pointer-events-none z-0" />
        
        <Navbar />

        {/* Hero Section */}
        <section className="relative pt-20 lg:pt-24">
          {/* Background Image */}
          {show.backdrop_path && (
            <>
              <img
                src={getBackdropUrl(show.backdrop_path)}
                alt={show.name}
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
                to={getWatchTVUrl(show.name, selectedSeason, 1)}
                className="group relative block w-[140px] sm:w-[180px] mx-auto rounded-lg overflow-hidden shadow-xl"
              >
                <img
                  src={getImageUrl(show.poster_path, "w342")}
                  alt={show.name}
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
                  {show.name}
                </h1>

                {/* Ratings Row */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5 lg:gap-3">
                  {/* IMDb Rating */}
                  <div className="flex items-center gap-1 px-1.5 py-0.5 lg:px-3 lg:py-1.5 rounded bg-[#1a1d29] border border-border">
                    <span className="text-rating-gold text-[10px] lg:text-sm font-bold">IMDb</span>
                    <span className="text-foreground text-xs lg:text-sm font-semibold">
                      {show.vote_average?.toFixed(1)}
                    </span>
                  </div>
                  
                  {/* Status Badge */}
                  <span className={cn(
                    "px-1.5 py-0.5 lg:px-3 lg:py-1.5 rounded text-[10px] lg:text-sm font-medium",
                    isOngoing 
                      ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                      : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  )}>
                    {statusText}
                  </span>
                  
                  {/* Votes */}
                  <div className="flex items-center gap-1 text-muted-foreground text-[10px] lg:text-sm 2xl:text-base">
                    <Star className="w-3 h-3 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-rating-gold" fill="currentColor" />
                    <span>({show.vote_count?.toLocaleString()})</span>
                  </div>
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5 lg:gap-3 2xl:gap-4 text-[10px] lg:text-sm 2xl:text-base text-muted-foreground">
                  <span className="px-1.5 py-0.5 2xl:px-3 2xl:py-1 rounded bg-secondary text-secondary-foreground text-[10px] lg:text-xs 2xl:text-sm font-medium">HD</span>
                  <span>{show.number_of_seasons} Season{show.number_of_seasons !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>{year}</span>
                  <span>•</span>
                  <span className="line-clamp-1">{genres}</span>
                </div>

                {/* Overview */}
                <p className="text-muted-foreground leading-relaxed text-xs lg:text-base 2xl:text-lg 3xl:text-xl text-center lg:text-left line-clamp-3 lg:line-clamp-none">
                  {show.overview}
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

                  <Button
                    variant={following ? "default" : "outline"}
                    className={cn(
                      "gap-1.5 rounded-full px-3 lg:px-5 h-8 lg:h-10 text-xs lg:text-sm",
                      following 
                        ? "bg-primary text-primary-foreground" 
                        : "border-border bg-secondary/50 hover:bg-secondary text-foreground"
                    )}
                    onClick={handleFollow}
                  >
                    {following ? (
                      <>
                        <BellOff className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                        <span className="hidden sm:inline">Following</span>
                      </>
                    ) : (
                      <>
                        <Bell className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                        <span className="hidden sm:inline">Follow</span>
                      </>
                    )}
                  </Button>

                  <SharePopover title={show.name} />
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

                {/* Tab Content - Episodes */}
                {activeTab === "episodes" && (
                  <div className="pt-1 lg:pt-2">
                    <div className="flex items-center justify-between mb-3 lg:mb-4">
                      <div className="flex items-center gap-2 lg:gap-3">
                        <span className="text-muted-foreground text-[10px] lg:text-sm">({episodeCount} Eps)</span>
                        <Select
                          value={String(selectedSeason)}
                          onValueChange={(v) => { setSelectedSeason(parseInt(v)); setShowAllEpisodes(false); }}
                        >
                          <SelectTrigger className="w-24 lg:w-32 h-7 lg:h-8 text-[10px] lg:text-xs bg-secondary/50 border-border">
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
                          className="h-8 w-8 rounded-full bg-secondary/50 hover:bg-secondary"
                          onClick={() => scrollEpisodes("left")}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-secondary/50 hover:bg-secondary"
                          onClick={() => scrollEpisodes("right")}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div
                      ref={episodeScrollRef}
                      className={cn(
                        "flex gap-2 lg:gap-4 overflow-x-auto pb-3 lg:pb-4 scrollbar-hide snap-x snap-mandatory md:grid md:overflow-visible md:snap-none",
                        showAllEpisodes ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-3 lg:grid-cols-4"
                      )}
                      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                    >
                      {(showAllEpisodes ? seasonData?.episodes : seasonData?.episodes?.slice(0, 8))?.map((episode) => (
                        <Link
                          key={episode.id}
                          to={getWatchTVUrl(show.name, selectedSeason, episode.episode_number)}
                          className="flex-shrink-0 w-36 sm:w-44 lg:w-auto snap-start group"
                        >
                          <div className="relative aspect-video rounded-md lg:rounded-lg overflow-hidden bg-card mb-1.5 lg:mb-2">
                            {episode.still_path ? (
                              <img
                                src={getImageUrl(episode.still_path, "w500")}
                                alt={episode.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <Film className="w-6 h-6 lg:w-8 lg:h-8 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                              <Play className="w-6 h-6 lg:w-8 lg:h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" />
                            </div>
                          </div>
                          <p className="text-[9px] lg:text-xs text-foreground font-medium line-clamp-1 group-hover:text-primary transition-colors">
                            E{episode.episode_number} - {episode.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[8px] lg:text-[10px] text-muted-foreground mt-0.5">
                            {episode.runtime && (
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-2 h-2 lg:w-2.5 lg:h-2.5" />
                                {episode.runtime}m
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                    
                    {seasonData?.episodes && seasonData.episodes.length > 8 && (
                      <Button
                        variant="outline"
                        className="mt-2 lg:mt-3 gap-1.5 rounded-full px-4 lg:px-6 h-7 lg:h-9 text-[10px] lg:text-sm border-border bg-secondary/50 hover:bg-secondary"
                        onClick={() => setShowAllEpisodes(!showAllEpisodes)}
                      >
                        {showAllEpisodes ? (
                          <>
                            <ChevronUp className="w-3 h-3 lg:w-4 lg:h-4" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3 lg:w-4 lg:h-4" />
                            All {seasonData.episodes.length} Episodes
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}

                {/* Tab Content - Cast */}
                {activeTab === "cast" && cast.length > 0 && (
                  <div className="pt-2">
                    <div className="flex items-start gap-4 lg:gap-6 overflow-x-auto pb-4 scroll-hide justify-center lg:justify-start">
                      {cast.map((person) => (
                        <Link
                          key={person.id}
                          to={`/actor/${generateSlug(person.name)}`}
                          className="flex flex-col items-center gap-1.5 lg:gap-2 min-w-[60px] lg:min-w-[70px] group"
                        >
                          <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full overflow-hidden bg-secondary ring-2 ring-transparent group-hover:ring-primary transition-all">
                            {person.profile_path ? (
                              <img
                                src={getImageUrl(person.profile_path, "w185")}
                                alt={person.name}
                                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm lg:text-lg">
                                {person.name[0]}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] lg:text-xs text-muted-foreground text-center line-clamp-1 max-w-[60px] lg:max-w-[70px] group-hover:text-foreground transition-colors">
                            {person.name.split(' ')[0]}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab Content - Details */}
                {activeTab === "details" && (
                  <div className="pt-2 space-y-2 lg:space-y-3 text-xs lg:text-sm">
                    {show.created_by && show.created_by.length > 0 && (
                      <div className="flex justify-center lg:justify-start">
                        <span className="text-muted-foreground w-24 lg:w-28">Created by:</span>
                        <span className="text-foreground">
                          {show.created_by.map((creator, index) => (
                            <span key={creator.id}>
                              <Link 
                                to={`/director/${generateSlug(creator.name)}`}
                                className="hover:text-primary transition-colors"
                              >
                                {creator.name}
                              </Link>
                              {index < show.created_by!.length - 1 && ", "}
                            </span>
                          ))}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-center lg:justify-start">
                      <span className="text-muted-foreground w-24 lg:w-28">First Air:</span>
                      <span className="text-foreground">{show.first_air_date}</span>
                    </div>
                    <div className="flex justify-center lg:justify-start">
                      <span className="text-muted-foreground w-24 lg:w-28">Status:</span>
                      <span className="text-foreground">{show.status}</span>
                    </div>
                    <div className="flex justify-center lg:justify-start">
                      <span className="text-muted-foreground w-24 lg:w-28">Seasons:</span>
                      <span className="text-foreground">{show.number_of_seasons}</span>
                    </div>
                    <div className="flex justify-center lg:justify-start">
                      <span className="text-muted-foreground w-24 lg:w-28">Episodes:</span>
                      <span className="text-foreground">{show.number_of_episodes}</span>
                    </div>
                    {show.networks && show.networks.length > 0 && (
                      <div className="flex justify-center lg:justify-start">
                        <span className="text-muted-foreground w-24 lg:w-28">Network:</span>
                        <span className="text-foreground">{show.networks.map(n => n.name).join(", ")}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Side - Poster (Desktop only) */}
              <div className="hidden lg:block flex-shrink-0">
                <Link 
                  to={getWatchTVUrl(show.name, selectedSeason, 1)}
                  className="group relative block rounded-xl overflow-hidden shadow-2xl w-[280px] xl:w-[320px] 2xl:w-[380px] 3xl:w-[440px] 4xl:w-[500px]"
                >
                  <img
                    src={getImageUrl(show.poster_path, "w780")}
                    alt={show.name}
                    className="w-full h-auto grayscale group-hover:grayscale-0 transition-all duration-500"
                  />
                  {/* Red play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 xl:w-20 xl:h-20 2xl:w-24 2xl:h-24 3xl:w-28 3xl:h-28 rounded-full bg-primary/90 flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:bg-primary transition-all duration-300">
                      <Play className="w-8 h-8 xl:w-10 xl:h-10 2xl:w-12 2xl:h-12 3xl:w-14 3xl:h-14 text-primary-foreground ml-1" fill="currentColor" />
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* AI-Generated Tags */}
        {show && (
          <section className="container mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 3xl:px-16 py-4 max-w-[2000px]">
            <div className="flex items-center gap-3 mb-2 justify-center lg:justify-start">
              <MovieTags tmdbId={show.id} mediaType="tv" maxTags={10} />
              <GenerateTagsButton tmdbId={show.id} mediaType="tv" title={show.name} />
            </div>
          </section>
        )}

        {/* Similar Shows */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 3xl:px-16 max-w-[2000px]">
          {show.similar?.results && show.similar.results.length > 0 && (
            <MovieRow
              title="Similar Shows"
              items={show.similar.results}
              type="tv"
            />
          )}
        </section>

        {/* Internal Links for SEO */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 3xl:px-16 max-w-[2000px]">
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
      <AuthPromptDialog
        open={authPromptOpen}
        onOpenChange={setAuthPromptOpen}
        action={authPromptAction}
      />
    </>
  );
}
