import { useQuery } from "@tanstack/react-query";
import { tmdb, getImageUrl } from "@/lib/tmdb";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { generateSlug } from "@/lib/slug";
import { useTVFollows } from "@/hooks/useTVFollows";
import { Calendar, Play, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface TVShow {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  first_air_date: string;
  overview: string;
}

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

  const isLoading = airingLoading || onTheAirLoading;

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

              {isLoading ? (
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
                  {airingToday?.results?.map((show: TVShow) => (
                    <TVShowCard
                      key={show.id}
                      show={show}
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

              {isLoading ? (
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
                  {onTheAir?.results?.map((show: TVShow) => (
                    <TVShowCard
                      key={show.id}
                      show={show}
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
  show: TVShow;
  isFollowing: boolean;
  badge?: string;
}

function TVShowCard({ show, isFollowing, badge }: TVShowCardProps) {
  const slug = generateSlug(show.name);

  return (
    <Link
      to={`/tvshow/${slug}`}
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
        {show.first_air_date && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(show.first_air_date), "yyyy")}
          </p>
        )}
      </div>
    </Link>
  );
}
