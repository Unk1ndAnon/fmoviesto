import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { useTVFollows } from "@/hooks/useTVFollows";
import { useAuth } from "@/contexts/AuthContext";
import { tmdb, getImageUrl } from "@/lib/tmdb";
import { generateSlug, getTVShowUrl, getWatchTVUrl } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Bell, BellOff, Tv, Calendar, Star, Sparkles } from "lucide-react";

export default function Following() {
  const { user } = useAuth();
  const { follows, isLoading, unfollowShow } = useTVFollows();

  // Fetch details for each followed show to get latest episode info
  const { data: showDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ["followedShowDetails", follows.map(f => f.tmdb_id)],
    queryFn: async () => {
      const details = await Promise.all(
        follows.map(async (follow) => {
          try {
            const show = await tmdb.getTVDetails(follow.tmdb_id);
            // Get latest season details
            const latestSeasonNumber = show.number_of_seasons || 1;
            const seasonDetails = await tmdb.getSeasonDetails(follow.tmdb_id, latestSeasonNumber);
            
            return {
              ...follow,
              showDetails: show,
              latestSeason: latestSeasonNumber,
              latestEpisode: seasonDetails.episodes?.[seasonDetails.episodes.length - 1],
              hasNewEpisode: seasonDetails.episodes?.some(ep => {
                const airDate = new Date(ep.air_date);
                const followDate = new Date(follow.last_air_date || follow.created_at);
                return airDate > followDate;
              }),
            };
          } catch {
            return { ...follow, showDetails: null };
          }
        })
      );
      return details;
    },
    enabled: follows.length > 0,
  });

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SEOHead 
          title="Following - Sign in Required"
          description="Sign in to follow TV shows and get notified about new episodes."
        />
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-center">
          <Tv className="w-16 h-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Sign in to follow shows</h1>
          <p className="text-muted-foreground mb-6">Track your favorite TV shows and get notified about new episodes</p>
          <Link to="/auth">
            <Button>Sign In</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const isLoadingAll = isLoading || loadingDetails;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead 
        title="Following - Your TV Shows"
        description="Track your followed TV shows and never miss a new episode."
      />
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Bell className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Following</h1>
            <p className="text-muted-foreground">
              {follows.length} {follows.length === 1 ? "show" : "shows"} you're tracking
            </p>
          </div>
        </div>

        {isLoadingAll ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl overflow-hidden">
                <Skeleton className="aspect-video" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : follows.length === 0 ? (
          <div className="text-center py-16">
            <Tv className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No followed shows yet</h2>
            <p className="text-muted-foreground mb-6">
              Start following TV shows to track new episodes
            </p>
            <Link to="/tv">
              <Button>Browse TV Shows</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {(showDetails || follows.map(f => ({ ...f, showDetails: null, hasNewEpisode: false }))).map((item) => {
              const show = item.showDetails;
              const latestEpisode = (item as any).latestEpisode;
              const hasNewEpisode = (item as any).hasNewEpisode;

              return (
                <div 
                  key={item.id} 
                  className="bg-card rounded-xl overflow-hidden group hover:ring-2 hover:ring-primary/50 transition-all"
                >
                  <Link to={getTVShowUrl(item.title)} className="relative block">
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={getImageUrl(show?.backdrop_path || item.poster_path, "w500")}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      
                      {hasNewEpisode && (
                        <div className="absolute top-3 left-3">
                          <span className="px-2 py-1 text-xs font-bold rounded bg-green-500 text-white flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            NEW EPISODE
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                          <Play className="w-6 h-6 text-primary-foreground" fill="currentColor" />
                        </div>
                      </div>
                    </div>
                  </Link>

                  <div className="p-4">
                    <Link to={getTVShowUrl(item.title)}>
                      <h3 className="font-semibold text-lg line-clamp-1 hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                    </Link>

                    {show && (
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-400" fill="currentColor" />
                          {show.vote_average?.toFixed(1)}
                        </span>
                        <span>{show.number_of_seasons} Seasons</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          show.status === "Returning Series" 
                            ? "bg-green-500/20 text-green-400" 
                            : "bg-blue-500/20 text-blue-400"
                        }`}>
                          {show.status === "Returning Series" ? "Ongoing" : "Ended"}
                        </span>
                      </div>
                    )}

                    {latestEpisode && (
                      <div className="mt-3 p-2 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground">Latest Episode:</p>
                        <p className="text-sm font-medium line-clamp-1">
                          S{latestEpisode.season_number}E{latestEpisode.episode_number} - {latestEpisode.name}
                        </p>
                        {latestEpisode.air_date && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(latestEpisode.air_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-4">
                      <Link to={getWatchTVUrl(item.title, item.last_season, item.last_episode)} className="flex-1">
                        <Button className="w-full gap-2" size="sm">
                          <Play className="w-3 h-3" fill="currentColor" />
                          Continue
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => unfollowShow.mutate(item.tmdb_id)}
                        className="gap-1"
                      >
                        <BellOff className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
