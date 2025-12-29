import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const MEOW_CACHE_PREFIX = 'meow_stream_';
const MEOW_CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export interface MeowStream {
  url: string;
  quality: string;
  type: string;
}

export interface MeowSubtitle {
  url: string;
  lang: string;
  label: string;
}

interface MeowCacheEntry {
  streams: MeowStream[];
  subtitles: MeowSubtitle[];
  timestamp: number;
}

export interface MeowStreamResult {
  streams: MeowStream[];
  subtitles: MeowSubtitle[];
  isLoading: boolean;
  error: string | null;
}

function getCacheKey(
  tmdbId: number,
  type: 'movie' | 'tv',
  season?: number,
  episode?: number
): string {
  if (type === 'tv' && season && episode) {
    return `${MEOW_CACHE_PREFIX}${type}_${tmdbId}_s${season}_e${episode}`;
  }
  return `${MEOW_CACHE_PREFIX}${type}_${tmdbId}`;
}

function getCachedMeowStream(key: string): MeowCacheEntry | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const entry: MeowCacheEntry = JSON.parse(cached);
    const isExpired = Date.now() - entry.timestamp > MEOW_CACHE_DURATION;
    
    if (isExpired) {
      localStorage.removeItem(key);
      return null;
    }
    
    return entry;
  } catch {
    return null;
  }
}

function setCachedMeowStream(
  key: string,
  streams: MeowStream[],
  subtitles: MeowSubtitle[]
): void {
  try {
    const entry: MeowCacheEntry = {
      streams,
      subtitles,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage might be full, ignore
  }
}

export function useMeowStream(
  tmdbId: number,
  type: 'movie' | 'tv',
  title: string,
  season?: number,
  episode?: number,
  enabled: boolean = false
): MeowStreamResult {
  const [streams, setStreams] = useState<MeowStream[]>([]);
  const [subtitles, setSubtitles] = useState<MeowSubtitle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Don't fetch if not enabled or missing required params
    // title must be non-empty string for MeowTV search
    if (!enabled || !tmdbId || !title || title.trim() === '') {
      return;
    }

    const cacheKey = getCacheKey(tmdbId, type, season, episode);

    // Check cache first
    const cached = getCachedMeowStream(cacheKey);
    if (cached) {
      console.log('[useMeowStream] Using cached data for:', cacheKey);
      setStreams(cached.streams);
      setSubtitles(cached.subtitles);
      return;
    }

    const fetchStream = async () => {
      setIsLoading(true);
      setError(null);
      setStreams([]);
      setSubtitles([]);

      try {
        const payload: {
          tmdb_id: number;
          type: 'movie' | 'tv';
          title: string;
          season?: number;
          episode?: number;
        } = {
          tmdb_id: tmdbId,
          type,
          title,
        };

        if (type === 'tv' && season && episode) {
          payload.season = season;
          payload.episode = episode;
        }

        const { data, error: fnError } = await supabase.functions.invoke('meow-stream', {
          body: payload,
        });

        if (fnError) throw fnError;

        const result = data as any;

        if (result?.streams?.length) {
          setStreams(result.streams);
          setSubtitles(result.subtitles || []);
          
          // Cache successful response
          setCachedMeowStream(cacheKey, result.streams, result.subtitles || []);
          console.log('[useMeowStream] Cached data for:', cacheKey);
        } else {
          setError(result?.error || 'No streams available');
        }
      } catch (err) {
        console.error('[useMeowStream] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch stream');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStream();
  }, [tmdbId, type, title, season, episode, enabled]);

  return { streams, subtitles, isLoading, error };
}
