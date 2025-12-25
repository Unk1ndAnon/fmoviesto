import { useQueries } from '@tanstack/react-query';
import { tmdb, Movie, TVShow } from '@/lib/tmdb';
import { MovieRow } from '@/components/movie/MovieRow';
import { WatchedItem, WatchingNowItem } from '@/hooks/useWatchStats';
import { Skeleton } from '@/components/ui/skeleton';

interface StatsMovieRowProps {
  title: string;
  items: (WatchedItem | WatchingNowItem)[];
  isLoading: boolean;
  showViewCount?: boolean;
}

export function StatsMovieRow({ 
  title, 
  items, 
  isLoading,
  showViewCount = false 
}: StatsMovieRowProps) {
  // Fetch TMDB details for all items
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="w-40 h-60 flex-shrink-0 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

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

  if (combinedItems.length === 0 && !isQueriesLoading) {
    return null;
  }

  // Determine if items are movies or TV shows (for MovieRow type prop)
  // Since we have mixed content, we'll pass 'movie' and let MovieRow handle it
  // Actually MovieRow expects items to be same type, so we need to handle this
  
  return (
    <MovieRow
      title={title}
      items={combinedItems}
      type="movie" // MovieRow will use 'name' for TV and 'title' for movies
      isLoading={isQueriesLoading}
    />
  );
}
