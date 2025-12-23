import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSlider } from "@/components/movie/HeroSlider";
import { MovieRow } from "@/components/movie/MovieRow";
import { ChristmasMoviesRow } from "@/components/movie/ChristmasMoviesRow";
import { SEOHead } from "@/components/seo/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
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
