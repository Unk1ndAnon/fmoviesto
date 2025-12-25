import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
      console.error('Error updating ping:', err);
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
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCount = useCallback(async () => {
    if (!tmdbId) {
      setCount(0);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error: rpcError } = await supabase.rpc('get_watching_now', {
        p_tmdb_id: tmdbId,
        p_media_type: mediaType,
      });

      if (rpcError) throw rpcError;
      setCount(data || 0);
      setError(null);
    } catch (err) {
      console.error('Error fetching watching now:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [tmdbId, mediaType]);

  useEffect(() => {
    fetchCount();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  return { count, isLoading, error, refetch: fetchCount };
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
  const [items, setItems] = useState<WatchedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error: rpcError } = await supabase.rpc('get_most_watched', {
        p_hours: hours,
        p_limit: limit,
      });

      if (rpcError) throw rpcError;
      setItems((data || []).map((item: any) => ({
        tmdb_id: item.tmdb_id,
        media_type: item.media_type as 'movie' | 'tv',
        view_count: Number(item.view_count),
      })));
      setError(null);
    } catch (err) {
      console.error('Error fetching most watched:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [hours, limit]);

  useEffect(() => {
    fetchItems();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchItems, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  return { items, isLoading, error, refetch: fetchItems };
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
  const [items, setItems] = useState<WatchingNowItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error: rpcError } = await supabase.rpc('get_all_watching_now', {
        p_limit: limit,
      });

      if (rpcError) throw rpcError;
      setItems((data || []).map((item: any) => ({
        tmdb_id: item.tmdb_id,
        media_type: item.media_type as 'movie' | 'tv',
        viewer_count: Number(item.viewer_count),
      })));
      setError(null);
    } catch (err) {
      console.error('Error fetching all watching now:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchItems();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchItems, 30000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  return { items, isLoading, error, refetch: fetchItems };
}
