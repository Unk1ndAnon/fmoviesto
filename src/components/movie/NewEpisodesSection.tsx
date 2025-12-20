import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tmdb, getImageUrl, TVShow } from "@/lib/tmdb";
import { generateSlug, getTVShowUrl, getWatchTVUrl } from "@/lib/slug";
import { Play, Calendar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTVFollows } from "@/hooks/useTVFollows";

interface EpisodeShowItem {
  show: TVShow;
  latestEpisode?: {
    season: number;
    episode: number;
    name: string;
    airDate: string;
  };
}

export function NewEpisodesSection() {
  const { follows, isFollowing } = useTVFollows();

  const { data: airingToday, isLoading: loadingToday } = useQuery({
    queryKey: ["airingTodayTV"],
    queryFn: () => tmdb.getAiringTodayTV(1),
  });

  const { data: onTheAir, isLoading: loadingOnAir } = useQuery({
    queryKey: ["onTheAirTV"],
    queryFn: () => tmdb.getOnTheAirTV(1),
  });

  const isLoading = loadingToday || loadingOnAir;

  // Combine and deduplicate shows, prioritizing airing today
  const allShows: TVShow[] = [];
  const seenIds = new Set<number>();

  // Add airing today first
  airingToday?.results?.forEach(show => {
    if (!seenIds.has(show.id)) {
      seenIds.add(show.id);
      allShows.push(show);
    }
  });

  // Then add on the air
  onTheAir?.results?.forEach(show => {
    if (!seenIds.has(show.id)) {
      seenIds.add(show.id);
      allShows.push(show);
    }
  });

  // Sort by vote average and limit
  const sortedShows = allShows
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, 12);

  if (isLoading) {
    return (
      <section className="py-8">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">New Episodes</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[2/3] rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (sortedShows.length === 0) return null;

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">New Episodes</h2>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/20 text-primary">
            Airing Now
          </span>
        </div>
        <Link to="/tv?category=airing">
          <Button variant="ghost" size="sm">View All</Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {sortedShows.map((show) => {
          const showSlug = generateSlug(show.name);
          const isFollowed = isFollowing(show.id);

          return (
            <Link
              key={show.id}
              to={getTVShowUrl(show.name)}
              className="group relative"
            >
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-card">
                <img
                  src={getImageUrl(show.poster_path, "w500")}
                  alt={show.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent" />
                
                {/* New Episode Badge */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-green-500 text-white">
                    NEW EP
                  </span>
                  {isFollowed && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-primary text-primary-foreground">
                      FOLLOWING
                    </span>
                  )}
                </div>
                
                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
                    <Play className="w-5 h-5 text-primary-foreground" fill="currentColor" />
                  </div>
                </div>

                {/* Bottom Info */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="font-medium text-sm text-white line-clamp-1 group-hover:text-primary transition-colors">
                    {show.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-white/70 mt-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {show.first_air_date ? new Date(show.first_air_date).getFullYear() : "TBA"}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
