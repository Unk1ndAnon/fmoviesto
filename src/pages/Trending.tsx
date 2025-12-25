import { useState, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { tmdb, Movie, TVShow } from '@/lib/tmdb';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SEOHead } from '@/components/seo/SEOHead';
import { MovieCard } from '@/components/movie/MovieCard';
import { WatchedItem, useMostWatched } from '@/hooks/useWatchStats';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Flame, TrendingUp, Trophy, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

type TabValue = 'today' | 'week' | 'month' | 'year';

const ITEMS_PER_PAGE = 24;

export default function Trending() {
  const [activeTab, setActiveTab] = useState<TabValue>('today');
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value as TabValue);
    setCurrentPage(1);
  };

  // Fetch stats for each period with higher limits for longer periods
  const { items: mostWatchedToday, isLoading: todayLoading } = useMostWatched(24, 100);
  const { items: mostWatchedWeek, isLoading: weekLoading } = useMostWatched(168, 100);
  const { items: mostWatchedMonth, isLoading: monthLoading } = useMostWatched(720, 500);
  const { items: mostWatchedYear, isLoading: yearLoading } = useMostWatched(8760, 500);

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

  const allItems = getCurrentItems();
  const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
  
  // Paginate items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return allItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [allItems, currentPage]);

  // Fetch TMDB details for current page items only
  const movieQueries = useQueries({
    queries: paginatedItems
      .filter(item => item.media_type === 'movie')
      .map(item => ({
        queryKey: ['movie', item.tmdb_id],
        queryFn: () => tmdb.getMovieDetails(item.tmdb_id),
        staleTime: 5 * 60 * 1000,
      })),
  });

  const tvQueries = useQueries({
    queries: paginatedItems
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
    const item = paginatedItems.filter(i => i.media_type === 'movie')[idx];
    if (q.data && item) {
      movieMap.set(item.tmdb_id, q.data);
    }
  });
  
  tvQueries.forEach((q, idx) => {
    const item = paginatedItems.filter(i => i.media_type === 'tv')[idx];
    if (q.data && item) {
      tvMap.set(item.tmdb_id, q.data);
    }
  });

  // Build combined list preserving order with media type
  type CombinedItem = { item: Movie | TVShow; mediaType: 'movie' | 'tv'; globalIndex: number };
  const combinedItems: CombinedItem[] = paginatedItems
    .map((watchItem, idx): CombinedItem | null => {
      const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + idx;
      if (watchItem.media_type === 'movie') {
        const movie = movieMap.get(watchItem.tmdb_id);
        return movie ? { item: movie, mediaType: 'movie', globalIndex } : null;
      } else {
        const tv = tvMap.get(watchItem.tmdb_id);
        return tv ? { item: tv, mediaType: 'tv', globalIndex } : null;
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

  // Pagination controls
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 5;
    
    if (totalPages <= showPages + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (currentPage < totalPages - 2) pages.push('...');
      
      pages.push(totalPages);
    }
    
    return pages;
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
            <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-8">
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

            {/* Stats */}
            {!isLoading() && allItems.length > 0 && (
              <div className="mb-4 text-sm text-muted-foreground">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, allItems.length)} of {allItems.length} titles
              </div>
            )}

            {/* Content */}
            {isLoading() || isQueriesLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
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
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {combinedItems.map(({ item, mediaType, globalIndex }) => (
                    <div key={item.id} className="relative">
                      {globalIndex < 10 && (
                        <div className="absolute -top-2 -left-2 z-10 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-lg">
                          {globalIndex + 1}
                        </div>
                      )}
                      <MovieCard
                        item={item}
                        type={mediaType}
                      />
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((page, idx) => (
                        typeof page === 'number' ? (
                          <Button
                            key={idx}
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => goToPage(page)}
                            className="min-w-[2.5rem]"
                          >
                            {page}
                          </Button>
                        ) : (
                          <span key={idx} className="px-2 text-muted-foreground">...</span>
                        )
                      ))}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}