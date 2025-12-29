import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export interface MeowStreamResult {
  streams: MeowStream[];
  subtitles: MeowSubtitle[];
  isLoading: boolean;
  error: string | null;
}

export function useMeowStream(
  tmdbId: number,
  type: 'movie' | 'tv',
  season?: number,
  episode?: number,
  enabled: boolean = false
): MeowStreamResult {
  const [streams, setStreams] = useState<MeowStream[]>([]);
  const [subtitles, setSubtitles] = useState<MeowSubtitle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !tmdbId) {
      return;
    }

    const fetchStream = async () => {
      setIsLoading(true);
      setError(null);
      setStreams([]);
      setSubtitles([]);

      try {
        const params = new URLSearchParams({
          tmdb_id: tmdbId.toString(),
          type: type,
        });

        if (type === 'tv' && season && episode) {
          params.append('season', season.toString());
          params.append('episode', episode.toString());
        }

        const { data, error: fnError } = await supabase.functions.invoke('meow-stream', {
          body: null,
          headers: {},
        });

        // Since we can't pass query params directly, we need to use fetch
        const projectId = 'fblsoqabliezhxtswfah';
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/meow-stream?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.streams && result.streams.length > 0) {
          setStreams(result.streams);
          setSubtitles(result.subtitles || []);
        } else {
          setError('No streams available');
        }
      } catch (err) {
        console.error('[useMeowStream] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch stream');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStream();
  }, [tmdbId, type, season, episode, enabled]);

  return { streams, subtitles, isLoading, error };
}
