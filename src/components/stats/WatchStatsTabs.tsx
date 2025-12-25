import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { tmdb, Movie, TVShow } from '@/lib/tmdb';
import { MovieCard } from '@/components/movie/MovieCard';
import { WatchedItem, WatchingNowItem, useAllWatchingNow, useMostWatched } from '@/hooks/useWatchStats';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Flame, TrendingUp, Trophy, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

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
    { value: 'now' as TabValue, label: 'Live', icon: Eye, color: 'text-red-500' },
    { value: 'today' as TabValue, label: 'Today', icon: Flame, color: 'text-orange-500' },
    { value: 'week' as TabValue, label: 'Week', icon: TrendingUp, color: 'text-blue-500' },
    { value: 'month' as TabValue, label: 'Month', icon: Trophy, color: 'text-yellow-500' },
  ];

  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Now Watching
          </h2>
          <Link
            to="/trending"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
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
      {isLoading() || isQueriesLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[150px] md:w-[180px]">
              <Skeleton className="aspect-[2/3] rounded-lg" />
              <div className="pt-3 space-y-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : combinedItems.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <p>No viewing data yet. Start watching to see stats!</p>
        </div>
      ) : (
        <div className="relative group/row">
          <Button
            variant="glass"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover/row:opacity-100 transition-opacity -translate-x-2"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <Button
            variant="glass"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover/row:opacity-100 transition-opacity translate-x-2"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scroll-hide pb-4 -mx-4 px-4"
          >
            {combinedItems.map(({ item, mediaType }) => (
              <MovieCard
                key={item.id}
                item={item}
                type={mediaType}
                className="flex-shrink-0 w-[150px] md:w-[180px]"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
