import { useParams, Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tmdb, getBackdropUrl, getImageUrl } from "@/lib/tmdb";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { VideoPlayer } from "@/components/movie/VideoPlayer";
import { MovieRow } from "@/components/movie/MovieRow";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Play, Star, Film } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Watch() {
  const { id, type } = useParams<{ id: string; type?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const isTV = type === "tv";
  const itemId = parseInt(id?.split("-")[0] || "0");
  const season = parseInt(searchParams.get("s") || "1");
  const episode = parseInt(searchParams.get("e") || "1");

  const { data: movie, isLoading: movieLoading } = useQuery({
    queryKey: ["movie", itemId],
    queryFn: () => tmdb.getMovieDetails(itemId),
    enabled: !!itemId && !isTV,
  });

  const { data: show, isLoading: showLoading } = useQuery({
    queryKey: ["tv", itemId],
    queryFn: () => tmdb.getTVDetails(itemId),
    enabled: !!itemId && isTV,
  });

  const { data: seasonData } = useQuery({
    queryKey: ["tvSeason", itemId, season],
    queryFn: () => tmdb.getSeasonDetails(itemId, season),
    enabled: !!itemId && isTV && season > 0,
  });

  const isLoading = isTV ? showLoading : movieLoading;
  const item = isTV ? show : movie;
  const title = isTV ? (show?.name || "") : (movie?.title || "");

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

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Content not found</p>
      </div>
    );
  }

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const detailsLink = isTV ? `/tv/${itemId}-${slug}` : `/movie/${itemId}-${slug}`;
  const seasons = show?.seasons?.filter((s) => s.season_number > 0) || [];

  const handleSeasonChange = (newSeason: string) => {
    setSearchParams({ s: newSeason, e: "1" });
  };

  const handleEpisodeChange = (newEpisode: string) => {
    setSearchParams({ s: String(season), e: newEpisode });
  };

  return (
    <>
      <SEOHead
        title={`Watch ${title}${isTV ? ` S${season}E${episode}` : ""} - Free HD Streaming`}
        description={`Watch ${title} online for free in HD quality. ${item.overview?.slice(0, 100)}...`}
        image={getBackdropUrl(item.backdrop_path)}
        type={isTV ? "video.tv_show" : "video.movie"}
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 pt-20">
          <div className="container mx-auto px-4 py-6">
            {/* Back Button */}
            <Link to={detailsLink} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              Back to Details
            </Link>

            {/* Title */}
            <h1 className="text-xl md:text-2xl font-bold text-foreground mb-4">
              {title}
              {isTV && (
                <span className="text-base font-normal text-muted-foreground ml-2">
                  - Season {season}, Episode {episode}
                </span>
              )}
            </h1>

            {/* Player */}
            <div className="mb-6">
              <VideoPlayer
                id={itemId}
                type={isTV ? "tv" : "movie"}
                season={isTV ? season : undefined}
                episode={isTV ? episode : undefined}
                title={title}
              />
            </div>

            {/* Season & Episode Selector for TV */}
            {isTV && (
              <div className="mb-6 p-4 rounded-lg bg-card border border-border">
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
              <div className="mb-6">
                <h3 className="font-semibold text-foreground mb-4">Episodes</h3>
                <div className="grid gap-2">
                  {seasonData.episodes.map((ep) => (
                    <Link
                      key={ep.id}
                      to={`/watch/tv/${itemId}-${slug}?s=${season}&e=${ep.episode_number}`}
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
                            src={getImageUrl(ep.still_path, "w300")}
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

            {/* Similar */}
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
