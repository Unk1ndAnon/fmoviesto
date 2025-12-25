import { useParams, Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { tmdb, getBackdropUrl, getImageUrl } from "@/lib/tmdb";
import { slugToTitle, generateSlug, getWatchMovieUrl, getWatchTVUrl, getMovieUrl, getTVShowUrl, parseSeasonEpisode } from "@/lib/slug";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { VideoPlayer, ServerDropdown, useVideoSources } from "@/components/movie/VideoPlayer";
import { MovieRow } from "@/components/movie/MovieRow";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Play, Star, Film, ChevronLeft, ChevronRight, Heart, Bookmark, Calendar, Users, MessageCircle, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites, useWatchlist } from "@/hooks/useUserLists";
import { toast } from "sonner";
import { useWatchParty, SyncEvent } from "@/hooks/useWatchParty";
import { useVidifySync } from "@/hooks/useVidifySync";
import { WatchPartyButton } from "@/components/watch-party/WatchPartyButton";
import { WatchPartyChat } from "@/components/watch-party/WatchPartyChat";
import { PlaybackSync } from "@/components/watch-party/PlaybackSync";
import { SyncCountdownOverlay } from "@/components/watch-party/SyncCountdownOverlay";
import { HowToWatchTooltip } from "@/components/movie/HowToWatchTooltip";
import { useWatchTracking, useWatchingNow } from "@/hooks/useWatchStats";

function WatchActionButtons({
  itemId,
  mediaType,
  title,
  posterPath,
  voteAverage,
  releaseDate,
}: {
  itemId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  voteAverage: number;
  releaseDate: string | null;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();

  const inFavorites = isFavorite(itemId, mediaType);
  const inWatchlist = isInWatchlist(itemId, mediaType);

  const handleFavorite = () => {
    if (!user) {
      toast.error("Please sign in to add favorites");
      navigate("/auth");
      return;
    }
    if (inFavorites) {
      removeFavorite.mutate({ tmdb_id: itemId, media_type: mediaType });
    } else {
      addFavorite.mutate({
        tmdb_id: itemId,
        media_type: mediaType,
        title,
        poster_path: posterPath,
        vote_average: voteAverage,
        release_date: releaseDate,
      });
    }
  };

  const handleWatchlist = () => {
    if (!user) {
      toast.error("Please sign in to add to watchlist");
      navigate("/auth");
      return;
    }
    if (inWatchlist) {
      removeFromWatchlist.mutate({ tmdb_id: itemId, media_type: mediaType });
    } else {
      addToWatchlist.mutate({
        tmdb_id: itemId,
        media_type: mediaType,
        title,
        poster_path: posterPath,
        vote_average: voteAverage,
        release_date: releaseDate,
      });
    }
  };

  return (
    <div className="flex gap-2 mb-6">
      <Button
        variant={inFavorites ? "default" : "outline"}
        size="sm"
        className="flex-1 gap-2"
        onClick={handleFavorite}
      >
        <Heart className={cn("w-4 h-4", inFavorites && "fill-current")} />
        {inFavorites ? "Favorited" : "Favorite"}
      </Button>
      <Button
        variant={inWatchlist ? "default" : "outline"}
        size="sm"
        className="flex-1 gap-2"
        onClick={handleWatchlist}
      >
        <Bookmark className={cn("w-4 h-4", inWatchlist && "fill-current")} />
        {inWatchlist ? "In Watchlist" : "Watchlist"}
      </Button>
    </div>
  );
}

export default function Watch() {
  const { slug, seasonEpisode } = useParams<{ slug: string; seasonEpisode?: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [showChat, setShowChat] = useState(false);
  const [currentSource, setCurrentSource] = useState(0);
  
  // Detect TV from URL (has seasonEpisode param)
  const isTV = !!seasonEpisode;
  const searchTitle = slugToTitle(slug || "");
  
  // Parse season/episode from URL
  const { season, episode } = seasonEpisode 
    ? parseSeasonEpisode(seasonEpisode)
    : { season: 1, episode: 1 };

  // Search for content by title
  const { data: movieSearch, isLoading: movieSearching } = useQuery({
    queryKey: ["movieSearch", searchTitle],
    queryFn: () => tmdb.searchMovieByTitle(searchTitle),
    enabled: !!searchTitle && !isTV,
  });

  const { data: tvSearch, isLoading: tvSearching } = useQuery({
    queryKey: ["tvSearch", searchTitle],
    queryFn: () => tmdb.searchTVByTitle(searchTitle),
    enabled: !!searchTitle && isTV,
  });

  const itemId = isTV ? tvSearch?.id : movieSearch?.id;

  const { data: movie, isLoading: movieLoading } = useQuery({
    queryKey: ["movie", itemId],
    queryFn: () => tmdb.getMovieDetails(itemId!),
    enabled: !!itemId && !isTV,
  });

  const { data: show, isLoading: showLoading } = useQuery({
    queryKey: ["tv", itemId],
    queryFn: () => tmdb.getTVDetails(itemId!),
    enabled: !!itemId && isTV,
  });

  const { data: seasonData } = useQuery({
    queryKey: ["tvSeason", itemId, season],
    queryFn: () => tmdb.getSeasonDetails(itemId!, season),
    enabled: !!itemId && isTV && season > 0,
  });

  const isLoading = isTV 
    ? (tvSearching || showLoading)
    : (movieSearching || movieLoading);
  
  const item = isTV ? show : movie;
  const title = isTV ? (show?.name || "") : (movie?.title || "");
  const year = isTV 
    ? (show?.first_air_date ? new Date(show.first_air_date).getFullYear() : "")
    : (movie?.release_date ? new Date(movie.release_date).getFullYear() : "");

  // Video sources hook
  const videoSources = useVideoSources(
    itemId || 0, 
    isTV ? 'tv' : 'movie', 
    isTV ? season : undefined, 
    isTV ? episode : undefined
  );

  // Sync event state for overlay
  const [currentSyncEvent, setCurrentSyncEvent] = useState<SyncEvent | null>(null);

  // Watch tracking for statistics
  const { startTracking, stopTracking, isTracking } = useWatchTracking({
    tmdbId: itemId || 0,
    mediaType: isTV ? 'tv' : 'movie',
    season: isTV ? season : undefined,
    episode: isTV ? episode : undefined,
    enabled: !!itemId,
  });

  // Watch count for this content
  const { count: watchingCount } = useWatchingNow(itemId || 0, isTV ? 'tv' : 'movie');

  // Start tracking when player loads
  useEffect(() => {
    if (itemId) {
      startTracking();
    }
    return () => {
      stopTracking();
    };
  }, [itemId, startTracking, stopTracking]);

  // Watch Party hook
  const watchParty = useWatchParty({
    tmdbId: itemId || 0,
    mediaType: isTV ? 'tv' : 'movie',
    season: isTV ? season : undefined,
    episode: isTV ? episode : undefined,
    onPlaybackUpdate: useCallback((time: number, playing: boolean) => {
      console.log('Playback update:', time, playing);
    }, []),
    onSyncEvent: useCallback((event: SyncEvent) => {
      console.log('Sync event received:', event);
      setCurrentSyncEvent(event);
    }, []),
  });

  // Vidify player sync - listens to WATCH_PROGRESS messages from iframe
  const vidifySync = useVidifySync({
    mediaId: String(itemId || 0),
    isHost: watchParty.isHost,
    enabled: !!watchParty.room && !!itemId,
    onTimeUpdate: useCallback((currentTime: number, eventType: string) => {
      // Update viewer time for drift detection
      if (!watchParty.isHost) {
        watchParty.updateViewerTime(currentTime);
      }
    }, [watchParty.isHost, watchParty.updateViewerTime]),
    onHostSync: useCallback((eventType: string, currentTime: number) => {
      // Host broadcasts sync events when player state changes
      watchParty.broadcastPlayerEvent(eventType, currentTime);
      
      // Also update room playback state in database
      const isPlaying = eventType === 'play' || eventType === 'progress';
      watchParty.updatePlayback(currentTime, isPlaying);
    }, [watchParty.broadcastPlayerEvent, watchParty.updatePlayback]),
  });

  // Check for room code in URL params
  useEffect(() => {
    const roomCode = searchParams.get('party');
    if (roomCode && itemId) {
      watchParty.joinByCode(roomCode).then((success) => {
        if (success) {
          setShowChat(true);
        }
      });
    }
  }, [searchParams, itemId]);

  // Fetch public rooms when component mounts
  useEffect(() => {
    if (itemId) {
      watchParty.fetchPublicRooms();
    }
  }, [itemId, watchParty.fetchPublicRooms]);

  // Handle room creation and show chat
  const handleCreateRoom = async (isPublic: boolean, name?: string) => {
    const roomId = await watchParty.createRoom(isPublic, name);
    if (roomId) {
      setShowChat(true);
    }
    return roomId;
  };

  // Handle join and show chat
  const handleJoinRoom = async (roomId: string) => {
    const success = await watchParty.joinRoom(roomId);
    if (success) {
      setShowChat(true);
    }
    return success;
  };

  const handleJoinByCode = async (code: string) => {
    const success = await watchParty.joinByCode(code);
    if (success) {
      setShowChat(true);
    }
    return success;
  };

  const handleLeaveRoom = async () => {
    await watchParty.leaveRoom();
    setShowChat(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 container mx-auto px-4">
          <div className="aspect-video bg-card animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (!item || !itemId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Content not found</p>
      </div>
    );
  }

  const contentSlug = generateSlug(title);
  const detailsLink = isTV ? getTVShowUrl(title) : getMovieUrl(title);
  const seasons = show?.seasons?.filter((s) => s.season_number > 0) || [];

  const handleSeasonChange = (newSeason: string) => {
    navigate(getWatchTVUrl(title, parseInt(newSeason), 1));
  };

  const handleEpisodeChange = (newEpisode: string) => {
    navigate(getWatchTVUrl(title, season, parseInt(newEpisode)));
  };

  // Generate proper SEO meta tags
  const currentUrl = `${window.location.origin}${location.pathname}`;
  const backdropImage = item.backdrop_path 
    ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` 
    : undefined;

  // Meta tag content based on page type
  const seoTitle = isTV 
    ? `Watch ${title} – Season ${season} Episode ${episode} Online Free – Fmovies`
    : `Watch ${title} (${year}) Online Free – Fmovies`;
  
  const seoDescription = isTV
    ? `Watch ${title} Season ${season} Episode ${episode} online free in HD on Fmovies. Stream instantly without signup.`
    : `Watch ${title} (${year}) online free in HD on Fmovies. Stream movies instantly without signup.`;
  
  const seoType = isTV ? "video.episode" : "video.movie";

  return (
    <>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        image={backdropImage}
        url={currentUrl}
        type={seoType as "video.movie" | "video.tv_show" | "video.episode"}
        siteName="Fmovies"
      />

      {/* Sync Countdown Overlay for Watch Party */}
      {watchParty.room && !watchParty.isHost && (
        <SyncCountdownOverlay
          syncEvent={currentSyncEvent}
          isHost={watchParty.isHost}
          driftSeconds={watchParty.driftSeconds}
          isOutOfSync={watchParty.isOutOfSync}
          hostTime={watchParty.room.playback_time}
          onResync={() => setCurrentSyncEvent(null)}
          onDismiss={() => setCurrentSyncEvent(null)}
        />
      )}

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 pt-16">
          {/* Watch Page Layout - Player left, Sidebar right on desktop */}
          <div className="flex flex-col lg:flex-row lg:justify-center">
            {/* Main Player Area */}
            <div
              className={cn(
                "w-full p-4 lg:p-6 lg:w-[56rem] lg:flex-none",
                showChat && watchParty.room && "lg:pr-[calc(20rem+1.5rem)]"
              )}
            >
              {/* Constrained Player Container */}
              <div className="max-w-4xl">
              {/* Server Dropdown & Watch Party - Inline */}
              <div className="flex items-center justify-between gap-2 mb-4">
                {/* Server Dropdown */}
                <div className="flex items-center gap-3">
                  <ServerDropdown
                    sources={videoSources}
                    currentSource={currentSource}
                    onSelectSource={setCurrentSource}
                  />
                  
                  {/* Watching Now Badge */}
                  {watchingCount > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/90 text-primary-foreground text-xs font-medium animate-pulse">
                      <Eye className="w-3 h-3" />
                      <span>{watchingCount} watching</span>
                    </div>
                  )}
                </div>

                {/* Watch Party Button */}
                {watchParty.room ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setShowChat(!showChat)}
                  >
                    <MessageCircle className="w-4 h-4" />
                    {showChat ? 'Hide Chat' : 'Show Chat'}
                    <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                      {watchParty.members.length}
                    </span>
                  </Button>
                ) : (
                  <WatchPartyButton
                    onCreateRoom={handleCreateRoom}
                    onJoinRoom={handleJoinRoom}
                    onJoinByCode={handleJoinByCode}
                    onRefreshRooms={watchParty.fetchPublicRooms}
                    publicRooms={watchParty.publicRooms}
                    isLoading={watchParty.isLoading}
                    title={title}
                  />
                )}
              </div>

              {/* Player */}
              <VideoPlayer
                id={itemId}
                type={isTV ? "tv" : "movie"}
                season={isTV ? season : undefined}
                episode={isTV ? episode : undefined}
                title={title}
                backdrop={getBackdropUrl(item.backdrop_path)}
                externalControls
                currentSource={currentSource}
                onSourceChange={setCurrentSource}
              />

              {/* How to Watch Tooltip - First visit only */}
              <HowToWatchTooltip />

              {/* Playback Sync Controls - Watch Party */}
              {watchParty.room && (
                <div className="mt-4">
                  <PlaybackSync
                    isHost={watchParty.isHost}
                    isConnected={watchParty.isConnected}
                    currentTime={watchParty.room.playback_time}
                    isPlaying={watchParty.room.is_playing}
                    onUpdatePlayback={watchParty.updatePlayback}
                    memberCount={watchParty.members.length}
                    onInitiateCountdown={watchParty.initiateCountdownSync}
                    onSendPlay={watchParty.sendPlayEvent}
                    onSendPause={watchParty.sendPauseEvent}
                    onSendSeek={watchParty.sendSeekEvent}
                    driftSeconds={watchParty.driftSeconds}
                    isOutOfSync={watchParty.isOutOfSync}
                    lastHeartbeatTime={watchParty.lastHostHeartbeat?.timestamp}
                    lastHostHeartbeat={watchParty.lastHostHeartbeat}
                    onSendHeartbeat={watchParty.sendHeartbeat}
                    // Vidify player sync data
                    playerTime={vidifySync.playerTime}
                    playerStatus={vidifySync.playerStatus}
                    isPlayerActive={vidifySync.isPlayerActive}
                  />
                </div>
              )}

              {/* Desktop Overview - Below player */}
              {!watchParty.room && item.overview && (
                <div className="hidden lg:block mt-4 p-4 rounded-lg bg-card border border-border">
                  <h3 className="font-semibold text-foreground mb-2">Overview</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.overview}
                  </p>
                </div>
              )}

              {/* Next/Previous Episode Navigation */}
              {isTV && seasonData?.episodes && (
                <div className="flex items-center justify-between mt-4 p-3 rounded-lg bg-card border border-border">
                  <Button
                    variant="ghost"
                    disabled={episode <= 1}
                    onClick={() => navigate(getWatchTVUrl(title, season, episode - 1))}
                    className="gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous Episode
                  </Button>
                  
                  <span className="text-sm text-muted-foreground">
                    S{season} E{episode} / {seasonData.episodes.length}
                  </span>
                  
                  <Button
                    variant="ghost"
                    disabled={episode >= seasonData.episodes.length}
                    onClick={() => navigate(getWatchTVUrl(title, season, episode + 1))}
                    className="gap-2"
                  >
                    Next Episode
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Season & Episode Selector for TV */}
              {isTV && (
                <div className="mt-4 p-4 rounded-lg bg-card border border-border">
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Season Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Season:</span>
                      <Select value={String(season)} onValueChange={handleSeasonChange}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {seasons.map((s) => (
                            <SelectItem key={s.season_number} value={String(s.season_number)}>
                              Season {s.season_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Episode Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Episode:</span>
                      <Select value={String(episode)} onValueChange={handleEpisodeChange}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {seasonData?.episodes?.map((ep) => (
                            <SelectItem key={ep.episode_number} value={String(ep.episode_number)}>
                              Episode {ep.episode_number}
                            </SelectItem>
                          )) || Array.from({ length: 20 }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              Episode {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Episode List for TV */}
              {isTV && seasonData?.episodes && (
                <div className="mt-6">
                  <h3 className="font-semibold text-foreground mb-4">Episodes</h3>
                  <div className="grid gap-2 max-h-96 overflow-y-auto">
                    {seasonData.episodes.map((ep) => (
                      <Link
                        key={ep.id}
                        to={getWatchTVUrl(title, season, ep.episode_number)}
                        className={cn(
                          "flex gap-4 p-3 rounded-lg transition-colors",
                          ep.episode_number === episode
                            ? "bg-primary/10 border border-primary"
                            : "bg-card border border-border hover:bg-secondary"
                        )}
                      >
                        <div className="flex-shrink-0 w-32 aspect-video rounded overflow-hidden bg-secondary">
                          {ep.still_path ? (
                            <img
                              src={getImageUrl(ep.still_path, "w780")}
                              alt={ep.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Film className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded",
                              ep.episode_number === episode
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-secondary-foreground"
                            )}>
                              E{ep.episode_number}
                            </span>
                            {ep.vote_average > 0 && (
                              <div className="flex items-center gap-1 text-xs text-rating-gold">
                                <Star className="w-3 h-3" fill="currentColor" />
                                {ep.vote_average.toFixed(1)}
                              </div>
                            )}
                          </div>
                          <h4 className={cn(
                            "font-medium line-clamp-1",
                            ep.episode_number === episode ? "text-primary" : "text-foreground"
                          )}>
                            {ep.name}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {ep.overview || "No description available."}
                          </p>
                        </div>
                        {ep.episode_number === episode && (
                          <div className="flex items-center">
                            <Play className="w-5 h-5 text-primary" fill="currentColor" />
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              </div>
            </div>

            {/* Sidebar - Movie/Show Info - RIGHT on desktop (hidden when in watch party) */}
            {!watchParty.room && (
              <div className="hidden lg:block w-80 xl:w-96 p-4 lg:p-6 border-l border-border shrink-0">
                {/* Poster */}
                <div className="rounded-lg overflow-hidden mb-4">
                  <img 
                    src={getImageUrl(item.poster_path, "w780")}
                    alt={title}
                    className="w-full aspect-[2/3] object-cover"
                  />
                </div>

                {/* Title & Year */}
                <h2 className="text-xl font-bold text-foreground mb-1">{title}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Calendar className="w-4 h-4" />
                  <span>{year}</span>
                  {item.vote_average > 0 && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1 text-rating-gold">
                        <Star className="w-4 h-4" fill="currentColor" />
                        {item.vote_average.toFixed(1)}
                      </div>
                    </>
                  )}
                </div>

                {/* Back to Details */}
                <Link 
                  to={detailsLink}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Details
                </Link>

                {/* Action Buttons */}
                <WatchActionButtons
                  itemId={itemId}
                  mediaType={isTV ? "tv" : "movie"}
                  title={title}
                  posterPath={item.poster_path}
                  voteAverage={item.vote_average}
                  releaseDate={isTV ? (show?.first_air_date || null) : (movie?.release_date || null)}
                />
              </div>
            )}

            {/* Mobile Action Buttons & Overview - Only visible on mobile */}
            {!watchParty.room && (
              <div className="lg:hidden p-4 space-y-4">
                {/* Action Buttons */}
                <WatchActionButtons
                  itemId={itemId}
                  mediaType={isTV ? "tv" : "movie"}
                  title={title}
                  posterPath={item.poster_path}
                  voteAverage={item.vote_average}
                  releaseDate={isTV ? (show?.first_air_date || null) : (movie?.release_date || null)}
                />

                {/* Overview */}
                {item.overview && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Overview</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.overview}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Watch Party Chat Sidebar - Fixed position */}
            {showChat && watchParty.room && (
              <div className="fixed right-0 top-16 bottom-0 w-80 z-40">
                <WatchPartyChat
                  messages={watchParty.messages}
                  members={watchParty.members}
                  isHost={watchParty.isHost}
                  isConnected={watchParty.isConnected}
                  roomCode={watchParty.room.room_code}
                  sessionId={watchParty.sessionId}
                  onSendMessage={watchParty.sendMessage}
                  onClose={() => setShowChat(false)}
                  onLeave={handleLeaveRoom}
                />
              </div>
            )}
          </div>

          {/* Similar Content */}
          <div className="container mx-auto px-4 py-6">
            {!isTV && movie?.similar?.results && movie.similar.results.length > 0 && (
              <MovieRow
                title="You May Also Like"
                items={movie.similar.results}
                type="movie"
              />
            )}

            {isTV && show?.similar?.results && show.similar.results.length > 0 && (
              <MovieRow
                title="Similar Shows"
                items={show.similar.results}
                type="tv"
              />
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
