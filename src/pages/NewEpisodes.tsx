import { useQuery, useQueries } from "@tanstack/react-query";
import { tmdb, getImageUrl, TVShow as TMDBTVShow } from "@/lib/tmdb";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { generateSlug } from "@/lib/slug";
import { useTVFollows } from "@/hooks/useTVFollows";
import { Calendar, Clock, Play, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isToday, isTomorrow } from "date-fns";

type TVShowWithDetails = TMDBTVShow;

export default function NewEpisodes() {
  const { isFollowing } = useTVFollows();

  const { data: airingToday, isLoading: airingLoading } = useQuery({
    queryKey: ["airingToday"],
    queryFn: () => tmdb.getAiringTodayTV(),
  });

  const { data: onTheAir, isLoading: onTheAirLoading } = useQuery({
    queryKey: ["onTheAir"],
    queryFn: () => tmdb.getOnTheAirTV(),
  });

  // Fetch detailed info for airing today shows
  const airingTodayDetails = useQueries({
    queries: (airingToday?.results || []).slice(0, 20).map((show) => ({
      queryKey: ["tvDetails", show.id],
      queryFn: () => tmdb.getTVDetails(show.id),
      staleTime: 1000 * 60 * 10, // 10 minutes
    })),
  });

  // Fetch detailed info for on the air shows
  const onTheAirDetails = useQueries({
    queries: (onTheAir?.results || []).slice(0, 20).map((show) => ({
      queryKey: ["tvDetails", show.id],
      queryFn: () => tmdb.getTVDetails(show.id),
      staleTime: 1000 * 60 * 10, // 10 minutes
    })),
  });

  const isLoading = airingLoading || onTheAirLoading;
  const detailsLoading = airingTodayDetails.some(q => q.isLoading) || onTheAirDetails.some(q => q.isLoading);

  // Create maps for quick lookup
  const airingTodayMap = new Map<number, TVShowWithDetails>();
  airingTodayDetails.forEach(q => {
    if (q.data) airingTodayMap.set(q.data.id, q.data as TVShowWithDetails);
  });

  const onTheAirMap = new Map<number, TVShowWithDetails>();
  onTheAirDetails.forEach(q => {
    if (q.data) onTheAirMap.set(q.data.id, q.data as TVShowWithDetails);
  });

  return (
    <>
      <SEOHead
        title="New Episodes - Watch Latest TV Show Episodes"
        description="Discover new TV show episodes airing today and this week. Stay up to date with your favorite series and never miss an episode."
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 pt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                New Episodes
              </h1>
              <p className="text-muted-foreground">
                Latest episodes airing today and this week
              </p>
            </div>

            {/* Airing Today Section */}
            <section className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="text-xl md:text-2xl font-semibold text-foreground">
                  Airing Today
                </h2>
                <Badge variant="default" className="bg-primary text-primary-foreground text-xs">
                  NEW
                </Badge>
              </div>

              {isLoading || detailsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="aspect-[2/3] rounded-lg" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {airingToday?.results?.slice(0, 20).map((show) => (
                    <TVShowCard
                      key={show.id}
                      show={show}
                      details={airingTodayMap.get(show.id)}
                      isFollowing={isFollowing(show.id)}
                      badge="TODAY"
                    />
                  ))}
                </div>
              )}

              {!isLoading && (!airingToday?.results || airingToday.results.length === 0) && (
                <p className="text-muted-foreground text-center py-8">
                  No shows airing today
                </p>
              )}
            </section>

            {/* On The Air Section */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <Play className="w-5 h-5 text-primary" />
                <h2 className="text-xl md:text-2xl font-semibold text-foreground">
                  On The Air This Week
                </h2>
              </div>

              {isLoading || detailsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="aspect-[2/3] rounded-lg" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {onTheAir?.results?.slice(0, 20).map((show) => (
                    <TVShowCard
                      key={show.id}
                      show={show}
                      details={onTheAirMap.get(show.id)}
                      isFollowing={isFollowing(show.id)}
                    />
                  ))}
                </div>
              )}

              {!isLoading && (!onTheAir?.results || onTheAir.results.length === 0) && (
                <p className="text-muted-foreground text-center py-8">
                  No shows on the air this week
                </p>
              )}
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}

interface TVShowCardProps {
  show: TMDBTVShow;
  details?: TVShowWithDetails;
  isFollowing: boolean;
  badge?: string;
}

function TVShowCard({ show, details, isFollowing, badge }: TVShowCardProps) {
  const slug = generateSlug(show.name);
  
  // Get episode info from next_episode_to_air or last_episode_to_air
  const nextEpisode = details?.next_episode_to_air;
  const lastEpisode = details?.last_episode_to_air;
  const episode = nextEpisode || lastEpisode;

  // Build episode code for URL
  const seasonNum = episode?.season_number || 1;
  const episodeNum = episode?.episode_number || 1;
  const episodeCode = `s${String(seasonNum).padStart(2, '0')}e${String(episodeNum).padStart(2, '0')}`;
  
  // Link directly to watch page with episode
  const watchUrl = `/watch/${slug}-${episodeCode}`;

  const formatAirDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (isToday(date)) return "Today";
      if (isTomorrow(date)) return "Tomorrow";
      return format(date, "MMM d");
    } catch {
      return dateStr;
    }
  };

  return (
    <Link
      to={watchUrl}
      className="group relative block overflow-hidden rounded-lg bg-card transition-transform hover:scale-105"
    >
      <div className="aspect-[2/3] relative">
        {show.poster_path ? (
          <img
            src={getImageUrl(show.poster_path, "w342")}
            alt={show.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-sm">No Image</span>
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {badge && (
            <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5">
              {badge}
            </Badge>
          )}
          {isFollowing && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
              FOLLOWING
            </Badge>
          )}
        </div>

        {/* Rating */}
        {show.vote_average > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/80 px-1.5 py-0.5 rounded text-xs">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span className="font-medium">{show.vote_average.toFixed(1)}</span>
          </div>
        )}

        {/* Episode Info Overlay */}
        {episode && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/90 to-transparent p-2 pt-6">
            <div className="flex items-center justify-between gap-1">
              <span className="text-primary font-semibold text-xs">
                S{String(episode.season_number).padStart(2, '0')}E{String(episode.episode_number).padStart(2, '0')}
              </span>
              {episode.runtime && (
                <span className="text-muted-foreground text-[10px]">
                  {episode.runtime}min
                </span>
              )}
            </div>
            {episode.air_date && (
              <div className="flex items-center gap-1.5 text-foreground text-[11px] mt-1 font-medium">
                <Calendar className="w-3 h-3 text-primary" />
                <span>{formatAirDate(episode.air_date)}</span>
                <Clock className="w-3 h-3 text-muted-foreground ml-1" />
                <span className="text-muted-foreground">Check local listings</span>
              </div>
            )}
          </div>
        )}

        {/* Play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
            <Play className="w-5 h-5 text-primary-foreground fill-primary-foreground" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-2">
        <h3 className="font-medium text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {show.name}
        </h3>
        {episode && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {episode.name || `Episode ${episode.episode_number}`}
          </p>
        )}
      </div>
    </Link>
  );
}
