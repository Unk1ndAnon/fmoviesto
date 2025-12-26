import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  getCacheKey,
  canFetch,
  markFetched,
  getWatchingNowFromCache,
  setWatchingNowCache,
  isWatchingNowCacheFresh,
  getAllWatchingNowFromCache,
  setAllWatchingNowCache,
  isAllWatchingNowCacheFresh,
  getMostWatchedFromCache,
  setMostWatchedCache,
  isMostWatchedCacheFresh,
  shouldBackoff,
  recordError,
  clearError,
} from '@/lib/watchStatsCache';

// Generate or retrieve anonymous session ID
const getSessionId = (): string => {
  const key = 'watch_session_id';
  let sessionId = localStorage.getItem(key);
  if (!sessionId) {
    sessionId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(key, sessionId);
  }
  return sessionId;
};

interface UseWatchTrackingParams {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  enabled?: boolean;
}

export function useWatchTracking({
  tmdbId,
  mediaType,
  season,
  episode,
  enabled = true,
}: UseWatchTrackingParams) {
  const [eventId, setEventId] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionId = getSessionId();

  // Start tracking when playback begins
  const startTracking = useCallback(async () => {
    if (!enabled || !tmdbId || isTracking) return;

    try {
      // Check for duplicate view within 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      const { data: existing } = await supabase
        .from('watch_events')
        .select('id')
        .eq('session_id', sessionId)
        .eq('tmdb_id', tmdbId)
        .eq('media_type', mediaType)
        .gte('started_at', tenMinutesAgo)
        .maybeSingle();

      if (existing) {
        // Reuse existing event, just update ping
        setEventId(existing.id);
        setIsTracking(true);
        return;
      }

      // Insert new watch event
      const { data, error } = await supabase
        .from('watch_events')
        .insert({
          session_id: sessionId,
          tmdb_id: tmdbId,
          media_type: mediaType,
          season: mediaType === 'tv' ? season : null,
          episode: mediaType === 'tv' ? episode : null,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error starting watch tracking:', error);
        return;
      }

      setEventId(data.id);
      setIsTracking(true);
    } catch (err) {
      console.error('Error in startTracking:', err);
    }
  }, [enabled, tmdbId, mediaType, season, episode, sessionId, isTracking]);

  // Update last_ping periodically
  const updatePing = useCallback(async () => {
    if (!eventId) return;

    try {
      await supabase
        .from('watch_events')
        .update({ last_ping: new Date().toISOString() })
        .eq('id', eventId);
    } catch (err) {
      // Silently fail ping updates - non-critical
      console.warn('Error updating ping:', err);
    }
  }, [eventId]);

  // Stop tracking when playback ends
  const stopTracking = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Set up ping interval when tracking starts
  useEffect(() => {
    if (isTracking && eventId) {
      // Ping every 30 seconds
      pingIntervalRef.current = setInterval(updatePing, 30000);
      
      // Initial ping
      updatePing();

      return () => {
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
      };
    }
  }, [isTracking, eventId, updatePing]);

  // Cleanup on unmount or page unload
  useEffect(() => {
    const handleUnload = () => {
      stopTracking();
    };

    window.addEventListener('beforeunload', handleUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      stopTracking();
    };
  }, [stopTracking]);

  return {
    startTracking,
    stopTracking,
    isTracking,
  };
}

interface WatchingNowResult {
  count: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useWatchingNow(tmdbId: number, mediaType: 'movie' | 'tv'): WatchingNowResult {
  const [count, setCount] = useState(() => getWatchingNowFromCache(tmdbId, mediaType) ?? 0);
  const [isLoading, setIsLoading] = useState(!isWatchingNowCacheFresh(tmdbId, mediaType));
  const [error, setError] = useState<Error | null>(null);
  const fetchingRef = useRef(false);

  const fetchCount = useCallback(async (force = false) => {
    if (!tmdbId) {
      setCount(0);
      setIsLoading(false);
      return;
    }

    const cacheKey = getCacheKey('watching', tmdbId, mediaType);

    // Check cache first
    if (!force && isWatchingNowCacheFresh(tmdbId, mediaType)) {
      const cached = getWatchingNowFromCache(tmdbId, mediaType);
      if (cached !== null) {
        setCount(cached);
        setIsLoading(false);
        return;
      }
    }

    // Rate limiting
    if (!force && !canFetch(cacheKey)) {
      const cached = getWatchingNowFromCache(tmdbId, mediaType);
      if (cached !== null) {
        setCount(cached);
      }
      setIsLoading(false);
      return;
    }

    // Error backoff
    if (shouldBackoff(cacheKey)) {
      const cached = getWatchingNowFromCache(tmdbId, mediaType);
      if (cached !== null) {
        setCount(cached);
      }
      setIsLoading(false);
      return;
    }

    // Prevent concurrent fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      setIsLoading(true);
      markFetched(cacheKey);

      const { data, error: rpcError } = await supabase.rpc('get_watching_now', {
        p_tmdb_id: tmdbId,
        p_media_type: mediaType,
      });

      if (rpcError) throw rpcError;
      
      const newCount = data || 0;
      setCount(newCount);
      setWatchingNowCache(tmdbId, mediaType, newCount);
      setError(null);
      clearError(cacheKey);
    } catch (err) {
      console.warn('Error fetching watching now:', err);
      recordError(cacheKey);
      setError(err as Error);
      
      // Use stale cache on error
      const cached = getWatchingNowFromCache(tmdbId, mediaType);
      if (cached !== null) {
        setCount(cached);
      }
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [tmdbId, mediaType]);

  useEffect(() => {
    fetchCount();
    
    // Refresh every 30 seconds (rate-limited by cache)
    const interval = setInterval(() => fetchCount(), 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  return { count, isLoading, error, refetch: () => fetchCount(true) };
}

export interface WatchedItem {
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  view_count: number;
}

interface MostWatchedResult {
  items: WatchedItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useMostWatched(hours: number, limit: number = 20): MostWatchedResult {
  const [items, setItems] = useState<WatchedItem[]>(() => {
    const cached = getMostWatchedFromCache(hours, limit);
    return cached?.map(item => ({
      tmdb_id: item.tmdb_id,
      media_type: item.media_type as 'movie' | 'tv',
      view_count: item.view_count,
    })) ?? [];
  });
  const [isLoading, setIsLoading] = useState(!isMostWatchedCacheFresh(hours, limit));
  const [error, setError] = useState<Error | null>(null);
  const fetchingRef = useRef(false);

  const fetchItems = useCallback(async (force = false) => {
    const cacheKey = getCacheKey('most_watched', hours, limit);

    // Check cache first
    if (!force && isMostWatchedCacheFresh(hours, limit)) {
      const cached = getMostWatchedFromCache(hours, limit);
      if (cached) {
        setItems(cached.map(item => ({
          tmdb_id: item.tmdb_id,
          media_type: item.media_type as 'movie' | 'tv',
          view_count: item.view_count,
        })));
        setIsLoading(false);
        return;
      }
    }

    // Rate limiting
    if (!force && !canFetch(cacheKey)) {
      setIsLoading(false);
      return;
    }

    // Error backoff
    if (shouldBackoff(cacheKey)) {
      setIsLoading(false);
      return;
    }

    // Prevent concurrent fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      setIsLoading(true);
      markFetched(cacheKey);

      const { data, error: rpcError } = await supabase.rpc('get_most_watched', {
        p_hours: hours,
        p_limit: limit,
      });

      if (rpcError) throw rpcError;
      
      const mappedItems = (data || []).map((item: { tmdb_id: number; media_type: string; view_count: number }) => ({
        tmdb_id: item.tmdb_id,
        media_type: item.media_type as 'movie' | 'tv',
        view_count: Number(item.view_count),
      }));
      
      setItems(mappedItems);
      setMostWatchedCache(hours, limit, data || []);
      setError(null);
      clearError(cacheKey);
    } catch (err) {
      console.warn('Error fetching most watched:', err);
      recordError(cacheKey);
      setError(err as Error);
      
      // Use stale cache on error
      const cached = getMostWatchedFromCache(hours, limit);
      if (cached) {
        setItems(cached.map(item => ({
          tmdb_id: item.tmdb_id,
          media_type: item.media_type as 'movie' | 'tv',
          view_count: item.view_count,
        })));
      }
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [hours, limit]);

  useEffect(() => {
    fetchItems();
    
    // Refresh every 5 minutes (rate-limited by cache)
    const interval = setInterval(() => fetchItems(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  return { items, isLoading, error, refetch: () => fetchItems(true) };
}

export interface WatchingNowItem {
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  viewer_count: number;
}

interface AllWatchingNowResult {
  items: WatchingNowItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAllWatchingNow(limit: number = 20): AllWatchingNowResult {
  const [items, setItems] = useState<WatchingNowItem[]>(() => {
    const cached = getAllWatchingNowFromCache();
    return cached?.map(item => ({
      tmdb_id: item.tmdb_id,
      media_type: item.media_type as 'movie' | 'tv',
      viewer_count: item.viewer_count,
    })) ?? [];
  });
  const [isLoading, setIsLoading] = useState(!isAllWatchingNowCacheFresh());
  const [error, setError] = useState<Error | null>(null);
  const fetchingRef = useRef(false);

  const fetchItems = useCallback(async (force = false) => {
    const cacheKey = getCacheKey('all_watching', limit);

    // Check cache first
    if (!force && isAllWatchingNowCacheFresh()) {
      const cached = getAllWatchingNowFromCache();
      if (cached) {
        setItems(cached.map(item => ({
          tmdb_id: item.tmdb_id,
          media_type: item.media_type as 'movie' | 'tv',
          viewer_count: item.viewer_count,
        })));
        setIsLoading(false);
        return;
      }
    }

    // Rate limiting
    if (!force && !canFetch(cacheKey)) {
      setIsLoading(false);
      return;
    }

    // Error backoff
    if (shouldBackoff(cacheKey)) {
      setIsLoading(false);
      return;
    }

    // Prevent concurrent fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      setIsLoading(true);
      markFetched(cacheKey);

      const { data, error: rpcError } = await supabase.rpc('get_all_watching_now', {
        p_limit: limit,
      });

      if (rpcError) throw rpcError;
      
      const mappedItems = (data || []).map((item: { tmdb_id: number; media_type: string; viewer_count: number }) => ({
        tmdb_id: item.tmdb_id,
        media_type: item.media_type as 'movie' | 'tv',
        viewer_count: Number(item.viewer_count),
      }));
      
      setItems(mappedItems);
      setAllWatchingNowCache(data || []);
      setError(null);
      clearError(cacheKey);
    } catch (err) {
      console.warn('Error fetching all watching now:', err);
      recordError(cacheKey);
      setError(err as Error);
      
      // Use stale cache on error
      const cached = getAllWatchingNowFromCache();
      if (cached) {
        setItems(cached.map(item => ({
          tmdb_id: item.tmdb_id,
          media_type: item.media_type as 'movie' | 'tv',
          viewer_count: item.viewer_count,
        })));
      }
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [limit]);

  useEffect(() => {
    fetchItems();
    
    // Refresh every 30 seconds (rate-limited by cache)
    const interval = setInterval(() => fetchItems(), 30000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  return { items, isLoading, error, refetch: () => fetchItems(true) };
}
