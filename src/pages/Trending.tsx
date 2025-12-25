import { useState, useRef } from 'react';
import { useQueries } from '@tanstack/react-query';
import { tmdb, Movie, TVShow } from '@/lib/tmdb';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SEOHead } from '@/components/seo/SEOHead';
import { MovieCard } from '@/components/movie/MovieCard';
import { WatchedItem, useMostWatched } from '@/hooks/useWatchStats';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flame, TrendingUp, Trophy, Calendar } from 'lucide-react';

type TabValue = 'today' | 'week' | 'month' | 'year';

export default function Trending() {
  const [activeTab, setActiveTab] = useState<TabValue>('today');

  // Fetch stats for each period
  const { items: mostWatchedToday, isLoading: todayLoading } = useMostWatched(24, 50);
  const { items: mostWatchedWeek, isLoading: weekLoading } = useMostWatched(168, 50);
  const { items: mostWatchedMonth, isLoading: monthLoading } = useMostWatched(720, 50);
  const { items: mostWatchedYear, isLoading: yearLoading } = useMostWatched(8760, 50);

  const getCurrentItems = (): WatchedItem[] => {
    switch (activeTab) {
      case 'today': return mostWatchedToday;
      case 'week': return mostWatchedWeek;
      case 'month': return mostWatchedMonth;
      case 'year': return mostWatchedYear;
    }
  };

  const isLoading = (): boolean => {
    switch (activeTab) {
      case 'today': return todayLoading;
      case 'week': return weekLoading;
      case 'month': return monthLoading;
      case 'year': return yearLoading;
    }
  };

  const items = getCurrentItems();

  // Fetch TMDB details for current items
  const movieQueries = useQueries({
    queries: items
      .filter(item => item.media_type === 'movie')
      .map(item => ({
        queryKey: ['movie', item.tmdb_id],
        queryFn: () => tmdb.getMovieDetails(item.tmdb_id),
        staleTime: 5 * 60 * 1000,
      })),
  });

  const tvQueries = useQueries({
    queries: items
      .filter(item => item.media_type === 'tv')
      .map(item => ({
        queryKey: ['tv', item.tmdb_id],
        queryFn: () => tmdb.getTVDetails(item.tmdb_id),
        staleTime: 5 * 60 * 1000,
      })),
  });

  const isQueriesLoading = movieQueries.some(q => q.isLoading) || tvQueries.some(q => q.isLoading);

  // Map fetched data back to items in order with their media types
  const movieMap = new Map<number, Movie>();
  const tvMap = new Map<number, TVShow>();
  
  movieQueries.forEach((q, idx) => {
    const item = items.filter(i => i.media_type === 'movie')[idx];
    if (q.data && item) {
      movieMap.set(item.tmdb_id, q.data);
    }
  });
  
  tvQueries.forEach((q, idx) => {
    const item = items.filter(i => i.media_type === 'tv')[idx];
    if (q.data && item) {
      tvMap.set(item.tmdb_id, q.data);
    }
  });

  // Build combined list preserving order with media type
  type CombinedItem = { item: Movie | TVShow; mediaType: 'movie' | 'tv' };
  const combinedItems: CombinedItem[] = items
    .map((watchItem): CombinedItem | null => {
      if (watchItem.media_type === 'movie') {
        const movie = movieMap.get(watchItem.tmdb_id);
        return movie ? { item: movie, mediaType: 'movie' } : null;
      } else {
        const tv = tvMap.get(watchItem.tmdb_id);
        return tv ? { item: tv, mediaType: 'tv' } : null;
      }
    })
    .filter((item): item is CombinedItem => item !== null);

  const tabConfig = [
    { value: 'today' as TabValue, label: 'Today', icon: Flame, color: 'text-orange-500' },
    { value: 'week' as TabValue, label: 'This Week', icon: TrendingUp, color: 'text-blue-500' },
    { value: 'month' as TabValue, label: 'This Month', icon: Trophy, color: 'text-yellow-500' },
    { value: 'year' as TabValue, label: 'This Year', icon: Calendar, color: 'text-green-500' },
  ];

  const getTitle = () => {
    switch (activeTab) {
      case 'today': return 'Trending Today';
      case 'week': return 'Trending This Week';
      case 'month': return 'Trending This Month';
      case 'year': return 'Trending This Year';
    }
  };

  return (
    <>
      <SEOHead
        title="Trending on Fmov - Most Watched Movies & TV Shows"
        description="Discover what's trending on Fmov. See the most watched movies and TV shows today, this week, this month, and this year."
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

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="mb-8">
              <TabsList className="bg-card/50 border border-border h-auto flex-wrap">
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

            {/* Content */}
            {isLoading() || isQueriesLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 18 }).map((_, i) => (
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
                <h2 className="text-xl font-semibold mb-2">No trending data yet</h2>
                <p>Start watching to see what's popular!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {combinedItems.map(({ item, mediaType }, index) => (
                  <div key={item.id} className="relative">
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