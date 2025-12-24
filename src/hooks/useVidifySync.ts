import { useEffect, useCallback, useRef, useState } from 'react';

interface VidifyWatchProgress {
  type: 'WATCH_PROGRESS';
  data: {
    mediaId: string;
    eventType: 'play' | 'pause' | 'seeking' | 'progress' | 'ended';
    currentTime: number;
    duration?: number;
  };
}

interface UseVidifySyncOptions {
  mediaId: string; // TMDB ID as string
  isHost: boolean;
  enabled: boolean;
  onTimeUpdate?: (currentTime: number, eventType: string) => void;
  onHostSync?: (eventType: string, currentTime: number) => void;
}

export function useVidifySync({
  mediaId,
  isHost,
  enabled,
  onTimeUpdate,
  onHostSync,
}: UseVidifySyncOptions) {
  const [playerTime, setPlayerTime] = useState(0);
  const [playerStatus, setPlayerStatus] = useState<'play' | 'pause' | 'seeking' | 'progress' | 'ended'>('pause');
  const [isPlayerActive, setIsPlayerActive] = useState(false);
  const lastEventRef = useRef<number>(0);

  // Store progress to localStorage (for resume functionality)
  const saveProgress = useCallback((time: number, eventType: string) => {
    try {
      localStorage.setItem(`progress_${mediaId}`, JSON.stringify({
        currentTime: time,
        eventType,
        lastWatched: Date.now()
      }));
    } catch (e) {
      console.warn('Failed to save progress to localStorage:', e);
    }
  }, [mediaId]);

  // Listen to WATCH_PROGRESS events from Vidify player
  useEffect(() => {
    if (!enabled) return;

    const handleMessage = (event: MessageEvent) => {
      // Accept messages from vidify player domains
      if (!event.origin.includes('vidify.top') && 
          !event.origin.includes('videasy.net') &&
          !event.origin.includes('player.')) {
        return;
      }

      // Handle WATCH_PROGRESS messages
      if (event.data?.type === 'WATCH_PROGRESS') {
        const { mediaId: vidMediaId, eventType, currentTime } = event.data.data;

        // Verify it's for our media (compare as strings since IDs can come as either)
        if (String(vidMediaId) !== String(mediaId)) {
          return;
        }

        // Throttle updates (max 1 per 500ms for progress events)
        const now = Date.now();
        if (eventType === 'progress' && now - lastEventRef.current < 500) {
          return;
        }
        lastEventRef.current = now;

        console.log('[VidifySync] Received:', eventType, currentTime);

        // Update local state
        setPlayerTime(currentTime);
        setPlayerStatus(eventType);
        setIsPlayerActive(true);

        // Save progress
        saveProgress(currentTime, eventType);

        // Notify parent
        onTimeUpdate?.(currentTime, eventType);

        // If host, broadcast to others
        if (isHost && onHostSync) {
          onHostSync(eventType, currentTime);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    console.log('[VidifySync] Listening for WATCH_PROGRESS messages');

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [mediaId, isHost, enabled, onTimeUpdate, onHostSync, saveProgress]);

  // Get saved progress from localStorage
  const getSavedProgress = useCallback((): { currentTime: number; lastWatched: number } | null => {
    try {
      const saved = localStorage.getItem(`progress_${mediaId}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to read progress from localStorage:', e);
    }
    return null;
  }, [mediaId]);

  return {
    playerTime,
    playerStatus,
    isPlayerActive,
    getSavedProgress,
  };
}
