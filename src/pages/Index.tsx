import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSlider } from "@/components/movie/HeroSlider";
import { MovieRow } from "@/components/movie/MovieRow";
import { ChristmasMoviesRow } from "@/components/movie/ChristmasMoviesRow";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { RefreshCw, WifiOff } from "lucide-react";

export default function Index() {
  const { data: trending, isLoading: trendingLoading, isError: trendingError, refetch: refetchTrending, isFetching } = useQuery({
    queryKey: ["trending"],
    queryFn: () => tmdb.getTrending("week"),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: popular, refetch: refetchPopular } = useQuery({
    queryKey: ["popular"],
    queryFn: () => tmdb.getPopular(),
    retry: 2,
  });

  const { data: topRated, refetch: refetchTopRated } = useQuery({
    queryKey: ["topRated"],
    queryFn: () => tmdb.getTopRated(),
    retry: 2,
  });

  const { data: nowPlaying, refetch: refetchNowPlaying } = useQuery({
    queryKey: ["nowPlaying"],
    queryFn: () => tmdb.getNowPlaying(),
    retry: 2,
  });

  const { data: trendingTV, refetch: refetchTrendingTV } = useQuery({
    queryKey: ["trendingTV"],
    queryFn: () => tmdb.getTrendingTV("week"),
    retry: 2,
  });

  const { data: popularTV, refetch: refetchPopularTV } = useQuery({
    queryKey: ["popularTV"],
    queryFn: () => tmdb.getPopularTV(),
    retry: 2,
  });

  const handleRetryAll = () => {
    refetchTrending();
    refetchPopular();
    refetchTopRated();
    refetchNowPlaying();
    refetchTrendingTV();
    refetchPopularTV();
  };

  const hasNoData = !trending?.results?.length && !trendingLoading && !isFetching;

  return (
    <>
      <SEOHead
        title="Watch Free Movies & TV Shows Online"
        description="StreamFlix - Your ultimate destination for free HD movies and TV shows streaming. Watch the latest releases, trending titles, and classic films online."
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1">
          {/* Error/Empty State */}
          {(trendingError || hasNoData) && !trendingLoading && !isFetching ? (
            <div className="h-[70vh] md:h-[85vh] flex flex-col items-center justify-center gap-6 px-4 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                <WifiOff className="w-10 h-10 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">Nije moguće učitati sadržaj</h2>
                <p className="text-muted-foreground max-w-md">
                  Provjerite internetsku vezu i pokušajte ponovo.
                </p>
              </div>
              <Button 
                onClick={handleRetryAll} 
                size="lg"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Pokušaj ponovo
              </Button>
            </div>
          ) : trendingLoading || isFetching ? (
            <div className="h-[70vh] md:h-[85vh] bg-card animate-pulse flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground">Učitavanje...</p>
              </div>
            </div>
          ) : (
            <HeroSlider movies={trending?.results?.slice(0, 5) || []} />
          )}

          {/* Content Rows */}
          <div className="container mx-auto px-4 py-8 space-y-4">
            {/* Christmas Movies Section */}
            <ChristmasMoviesRow />

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
