import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tmdb, Movie, TVShow } from '@/lib/tmdb';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SEOHead } from '@/components/seo/SEOHead';
import { MovieCard } from '@/components/movie/MovieCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flame, TrendingUp, Film, Tv } from 'lucide-react';

type TabValue = 'day' | 'week';
type FilterValue = 'all' | 'movies' | 'tv';

export default function Trending() {
  const [activeTab, setActiveTab] = useState<TabValue>('day');
  const [filter, setFilter] = useState<FilterValue>('all');

  // Fetch trending movies and TV shows from TMDB
  const { data: trendingMovies, isLoading: moviesLoading } = useQuery({
    queryKey: ['trending-movies', activeTab],
    queryFn: () => tmdb.getTrending(activeTab),
    staleTime: 5 * 60 * 1000,
  });

  const { data: trendingTV, isLoading: tvLoading } = useQuery({
    queryKey: ['trending-tv', activeTab],
    queryFn: () => tmdb.getTrendingTV(activeTab),
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = moviesLoading || tvLoading;

  // Combine and interleave movies and TV shows
  const combinedItems: Array<{ item: Movie | TVShow; mediaType: 'movie' | 'tv' }> = [];
  
  if (filter === 'movies') {
    trendingMovies?.results?.forEach(movie => {
      combinedItems.push({ item: movie, mediaType: 'movie' });
    });
  } else if (filter === 'tv') {
    trendingTV?.results?.forEach(show => {
      combinedItems.push({ item: show, mediaType: 'tv' });
    });
  } else {
    // Interleave movies and TV shows
    const movies = trendingMovies?.results || [];
    const tvShows = trendingTV?.results || [];
    const maxLength = Math.max(movies.length, tvShows.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (movies[i]) {
        combinedItems.push({ item: movies[i], mediaType: 'movie' });
      }
      if (tvShows[i]) {
        combinedItems.push({ item: tvShows[i], mediaType: 'tv' });
      }
    }
  }

  const tabConfig = [
    { value: 'day' as TabValue, label: 'Today', icon: Flame, color: 'text-orange-500' },
    { value: 'week' as TabValue, label: 'This Week', icon: TrendingUp, color: 'text-blue-500' },
  ];

  const filterConfig = [
    { value: 'all' as FilterValue, label: 'All', icon: TrendingUp },
    { value: 'movies' as FilterValue, label: 'Movies', icon: Film },
    { value: 'tv' as FilterValue, label: 'TV Shows', icon: Tv },
  ];

  const getTitle = () => {
    switch (activeTab) {
      case 'day': return 'Trending Today';
      case 'week': return 'Trending This Week';
    }
  };

  return (
    <>
      <SEOHead
        title="Trending on Fmov - Most Popular Movies & TV Shows"
        description="Discover what's trending on Fmov. See the most popular movies and TV shows today and this week."
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 pt-20">
          <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-primary" />
                Trending on Fmov
              </h1>
              <p className="text-muted-foreground">
                Discover what everyone's watching right now
              </p>
            </div>

            {/* Time Period Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="mb-4">
              <TabsList className="bg-card/50 border border-border h-auto">
                {tabConfig.map(({ value, label, icon: Icon, color }) => (
                  <TabsTrigger 
                    key={value} 
                    value={value}
                    className="gap-2 py-2.5 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <Icon className={`w-4 h-4 ${activeTab === value ? '' : color}`} />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Filter Tabs */}
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterValue)} className="mb-8">
              <TabsList className="bg-card/50 border border-border h-auto">
                {filterConfig.map(({ value, label, icon: Icon }) => (
                  <TabsTrigger 
                    key={value} 
                    value={value}
                    className="gap-2 py-2 px-3 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Content */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="aspect-[2/3] rounded-lg" />
                    <div className="pt-3 space-y-1">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : combinedItems.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h2 className="text-xl font-semibold mb-2">No trending data available</h2>
                <p>Check back later for trending content!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {combinedItems.map(({ item, mediaType }, index) => (
                  <div key={`${mediaType}-${item.id}`} className="relative">
                    {index < 10 && (
                      <div className="absolute -top-2 -left-2 z-10 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-lg">
                        {index + 1}
                      </div>
                    )}
                    <MovieCard
                      item={item}
                      type={mediaType}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
