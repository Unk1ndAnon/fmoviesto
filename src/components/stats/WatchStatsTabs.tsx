import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { tmdb, Movie, TVShow } from '@/lib/tmdb';
import { MovieRow } from '@/components/movie/MovieRow';
import { WatchedItem, WatchingNowItem, useAllWatchingNow, useMostWatched } from '@/hooks/useWatchStats';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Flame, TrendingUp, Trophy } from 'lucide-react';

type TabValue = 'now' | 'today' | 'week' | 'month';

export function WatchStatsTabs() {
  const [activeTab, setActiveTab] = useState<TabValue>('now');

  // Fetch all stats
  const { items: watchingNow, isLoading: nowLoading } = useAllWatchingNow(20);
  const { items: mostWatchedToday, isLoading: todayLoading } = useMostWatched(24, 20);
  const { items: mostWatchedWeek, isLoading: weekLoading } = useMostWatched(168, 20);
  const { items: mostWatchedMonth, isLoading: monthLoading } = useMostWatched(720, 20);

  // Get current items based on active tab
  const getCurrentItems = (): (WatchedItem | WatchingNowItem)[] => {
    switch (activeTab) {
      case 'now': return watchingNow;
      case 'today': return mostWatchedToday;
      case 'week': return mostWatchedWeek;
      case 'month': return mostWatchedMonth;
    }
  };

  const isLoading = (): boolean => {
    switch (activeTab) {
      case 'now': return nowLoading;
      case 'today': return todayLoading;
      case 'week': return weekLoading;
      case 'month': return monthLoading;
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

  // Map fetched data back to items in order
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

  // Build combined list preserving order
  const combinedItems: (Movie | TVShow)[] = items
    .map(item => {
      if (item.media_type === 'movie') {
        return movieMap.get(item.tmdb_id);
      } else {
        return tvMap.get(item.tmdb_id);
      }
    })
    .filter((item): item is Movie | TVShow => !!item);

  const tabConfig = [
    { value: 'now' as TabValue, label: 'Live', icon: Eye, color: 'text-red-500' },
    { value: 'today' as TabValue, label: 'Today', icon: Flame, color: 'text-orange-500' },
    { value: 'week' as TabValue, label: 'Week', icon: TrendingUp, color: 'text-blue-500' },
    { value: 'month' as TabValue, label: 'Month', icon: Trophy, color: 'text-yellow-500' },
  ];

  return (
    <div className="space-y-4">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          Watching Statistics
        </h2>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList className="bg-card/50 border border-border">
            {tabConfig.map(({ value, label, icon: Icon, color }) => (
              <TabsTrigger 
                key={value} 
                value={value}
                className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icon className={`w-3.5 h-3.5 ${activeTab === value ? '' : color}`} />
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {isLoading() ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="w-40 h-60 flex-shrink-0 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <p>No viewing data yet. Start watching to see stats!</p>
        </div>
      ) : (
        <MovieRow
          title=""
          items={combinedItems}
          type="movie"
          isLoading={isQueriesLoading}
        />
      )}
    </div>
  );
}
