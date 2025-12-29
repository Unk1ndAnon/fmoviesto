import { useState, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { tmdb, Movie, TVShow } from '@/lib/tmdb';
import { useMostWatched } from '@/hooks/useWatchStats';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SEOHead } from '@/components/seo/SEOHead';
import { MovieCard } from '@/components/movie/MovieCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Film, Tv, Eye, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type FilterValue = 'all' | 'movies' | 'tv';

export default function Trending() {
  const [filter, setFilter] = useState<FilterValue>('all');

  // Get most watched items from Supabase (last 168 hours = 7 days)
  const { items: watchedItems, isLoading: isWatchedLoading, refetch } = useMostWatched(168, 50);

  // Filter items based on selected filter
  const filteredWatched = useMemo(() => {
    if (filter === 'all') return watchedItems;
    return watchedItems.filter(item => 
      filter === 'movies' ? item.media_type === 'movie' : item.media_type === 'tv'
    );
  }, [watchedItems, filter]);

  // Fetch TMDB details for movies
  const movieQueries = useQueries({
    queries: filteredWatched
      .filter(item => item.media_type === 'movie')
      .map(item => ({
        queryKey: ['movie', item.tmdb_id],
        queryFn: () => tmdb.getMovieDetails(item.tmdb_id),
        staleTime: 10 * 60 * 1000,
      })),
  });

  // Fetch TMDB details for TV shows
  const tvQueries = useQueries({
    queries: filteredWatched
      .filter(item => item.media_type === 'tv')
      .map(item => ({
        queryKey: ['tv', item.tmdb_id],
        queryFn: () => tmdb.getTVDetails(item.tmdb_id),
        staleTime: 10 * 60 * 1000,
      })),
  });

  const isLoading = isWatchedLoading || movieQueries.some(q => q.isLoading) || tvQueries.some(q => q.isLoading);

  // Build maps for quick lookup
  const movieMap = new Map<number, Movie>();
  const tvMap = new Map<number, TVShow>();
  const viewCountMap = new Map<string, number>();

  filteredWatched.forEach(record => {
    viewCountMap.set(`${record.media_type}-${record.tmdb_id}`, record.view_count);
  });

  movieQueries.forEach((q, idx) => {
    const record = filteredWatched.filter(r => r.media_type === 'movie')[idx];
    if (q.data && record) {
      movieMap.set(record.tmdb_id, q.data);
    }
  });

  tvQueries.forEach((q, idx) => {
    const record = filteredWatched.filter(r => r.media_type === 'tv')[idx];
    if (q.data && record) {
      tvMap.set(record.tmdb_id, q.data);
    }
  });

  // Build combined list preserving order by view count
  type CombinedItem = { 
    item: Movie | TVShow; 
    mediaType: 'movie' | 'tv'; 
    viewCount: number;
    index: number;
  };

  const combinedItems: CombinedItem[] = filteredWatched
    .map((record, idx): CombinedItem | null => {
      if (record.media_type === 'movie') {
        const movie = movieMap.get(record.tmdb_id);
        return movie ? { 
          item: movie, 
          mediaType: 'movie', 
          viewCount: record.view_count,
          index: idx 
        } : null;
      } else {
        const tv = tvMap.get(record.tmdb_id);
        return tv ? { 
          item: tv, 
          mediaType: 'tv', 
          viewCount: record.view_count,
          index: idx 
        } : null;
      }
    })
    .filter((item): item is CombinedItem => item !== null);

  const filterConfig = [
    { value: 'all' as FilterValue, label: 'All', icon: TrendingUp },
    { value: 'movies' as FilterValue, label: 'Movies', icon: Film },
    { value: 'tv' as FilterValue, label: 'TV Shows', icon: Tv },
  ];

  return (
    <>
      <SEOHead
        title="Trending on Fmov - Most Watched Movies & TV Shows"
        description="Discover what's trending on Fmov. See the most watched movies and TV shows based on real-time viewing data."
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 pt-20">
          <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8 flex items-start justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-primary" />
                  Trending on Fmov
                </h1>
                <p className="text-muted-foreground">
                  Most watched movies and TV shows in the last 7 days
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>

            {/* Filter Tabs */}
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterValue)} className="mb-8">
              <TabsList className="bg-card/50 border border-border h-auto">
                {filterConfig.map(({ value, label, icon: Icon }) => (
                  <TabsTrigger 
                    key={value} 
                    value={value}
                    className="gap-2 py-2.5 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Content */}
            {!isWatchedLoading && filteredWatched.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h2 className="text-xl font-semibold mb-2">No trending content yet</h2>
                <p>Start watching movies and TV shows to see what's trending!</p>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="aspect-[2/3] rounded-lg" />
                    <div className="pt-3 space-y-1">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {combinedItems.map(({ item, mediaType, viewCount, index }) => (
                  <div key={`${mediaType}-${item.id}`} className="relative">
                    {/* Rank badge for top 10 */}
                    {index < 10 && (
                      <div className="absolute -top-2 -left-2 z-10 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-lg">
                        {index + 1}
                      </div>
                    )}
                    {/* View count badge */}
                    <div className="absolute top-2 right-2 z-10 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {viewCount}
                    </div>
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
