import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSlider } from "@/components/movie/HeroSlider";
import { MovieRow } from "@/components/movie/MovieRow";
import { ChristmasMoviesRow } from "@/components/movie/ChristmasMoviesRow";
import { SEOHead } from "@/components/seo/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsMovieRow } from "@/components/stats/StatsMovieRow";
import { useAllWatchingNow, useMostWatched } from "@/hooks/useWatchStats";
export default function Index() {
  const { data: trending, isLoading: trendingLoading } = useQuery({
    queryKey: ["trending"],
    queryFn: () => tmdb.getTrending("week"),
  });

  const { data: popular } = useQuery({
    queryKey: ["popular"],
    queryFn: () => tmdb.getPopular(),
  });

  const { data: topRated } = useQuery({
    queryKey: ["topRated"],
    queryFn: () => tmdb.getTopRated(),
  });

  const { data: nowPlaying } = useQuery({
    queryKey: ["nowPlaying"],
    queryFn: () => tmdb.getNowPlaying(),
  });

  const { data: trendingTV } = useQuery({
    queryKey: ["trendingTV"],
    queryFn: () => tmdb.getTrendingTV("week"),
  });

  const { data: popularTV } = useQuery({
    queryKey: ["popularTV"],
    queryFn: () => tmdb.getPopularTV(),
  });

  // Watch statistics
  const { items: watchingNow, isLoading: watchingNowLoading } = useAllWatchingNow(20);
  const { items: mostWatchedToday, isLoading: todayLoading } = useMostWatched(24, 20);
  const { items: mostWatchedWeek, isLoading: weekLoading } = useMostWatched(168, 20);
  const { items: mostWatchedMonth, isLoading: monthLoading } = useMostWatched(720, 20);

  return (
    <>
      <SEOHead
        title="Watch Free Movies & TV Shows Online"
        description="StreamFlix - Your ultimate destination for free HD movies and TV shows streaming. Watch the latest releases, trending titles, and classic films online."
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1">
          {/* Hero Section */}
          {trendingLoading ? (
            <div className="h-[70vh] md:h-[85vh] bg-card animate-pulse" />
          ) : (
            <HeroSlider movies={trending?.results?.slice(0, 5) || []} />
          )}

          {/* Content Rows */}
          <div className="container mx-auto px-4 py-8 space-y-4">
            {/* Christmas Movies Section */}
            <ChristmasMoviesRow />

            {/* Watching Now - Live viewers */}
            <StatsMovieRow
              title="🔴 Watching Now"
              items={watchingNow}
              isLoading={watchingNowLoading}
              showViewCount
            />

            {/* Most Watched Today */}
            <StatsMovieRow
              title="🔥 Most Watched Today"
              items={mostWatchedToday}
              isLoading={todayLoading}
              showViewCount
            />

            <MovieRow
              title="Trending This Week"
              items={trending?.results || []}
              type="movie"
              viewMoreLink="/movies?category=trending"
              isLoading={trendingLoading}
            />

            <MovieRow
              title="Popular Movies"
              items={popular?.results || []}
              type="movie"
              viewMoreLink="/movies?category=popular"
              isLoading={!popular}
            />

            {/* Most Watched This Week */}
            <StatsMovieRow
              title="📈 Most Watched This Week"
              items={mostWatchedWeek}
              isLoading={weekLoading}
              showViewCount
            />

            <MovieRow
              title="Now Playing"
              items={nowPlaying?.results || []}
              type="movie"
              viewMoreLink="/movies?category=now-playing"
              isLoading={!nowPlaying}
            />

            <MovieRow
              title="Top Rated Movies"
              items={topRated?.results || []}
              type="movie"
              viewMoreLink="/movies?category=top-rated"
              isLoading={!topRated}
            />

            {/* Most Watched This Month */}
            <StatsMovieRow
              title="🏆 Most Watched This Month"
              items={mostWatchedMonth}
              isLoading={monthLoading}
              showViewCount
            />

            <MovieRow
              title="Trending TV Shows"
              items={trendingTV?.results || []}
              type="tv"
              viewMoreLink="/tv?category=trending"
              isLoading={!trendingTV}
            />

            <MovieRow
              title="Popular TV Shows"
              items={popularTV?.results || []}
              type="tv"
              viewMoreLink="/tv?category=popular"
              isLoading={!popularTV}
            />
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
