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
        const payload: {
          tmdb_id: number;
          type: 'movie' | 'tv';
          season?: number;
          episode?: number;
        } = {
          tmdb_id: tmdbId,
          type,
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
  }, [tmdbId, type, season, episode, enabled]);

  return { streams, subtitles, isLoading, error };
}
