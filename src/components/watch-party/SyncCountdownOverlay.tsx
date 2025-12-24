import { useState, useEffect, useCallback } from 'react';
import { Play, Clock, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SyncEvent } from '@/hooks/useWatchParty';

interface SyncCountdownOverlayProps {
  syncEvent: SyncEvent | null;
  isHost: boolean;
  driftSeconds: number;
  isOutOfSync: boolean;
  hostTime: number;
  onResync: () => void;
  onDismiss: () => void;
}

export function SyncCountdownOverlay({
  syncEvent,
  isHost,
  driftSeconds,
  isOutOfSync,
  hostTime,
  onResync,
  onDismiss,
}: SyncCountdownOverlayProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showPlayInstruction, setShowPlayInstruction] = useState(false);
  const [targetTime, setTargetTime] = useState<number>(0);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle sync countdown event
  useEffect(() => {
    if (!syncEvent || isHost) return;

    if (syncEvent.type === 'sync_countdown' && syncEvent.countdownSeconds) {
      setCountdown(syncEvent.countdownSeconds);
      setTargetTime(syncEvent.targetTime);
      setShowPlayInstruction(false);

      // Start countdown
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            setShowPlayInstruction(true);
            // Auto-dismiss after 10 seconds
            setTimeout(() => {
              setShowPlayInstruction(false);
              onDismiss();
            }, 10000);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else if (syncEvent.type === 'play') {
      setTargetTime(syncEvent.targetTime);
      setShowPlayInstruction(true);
      setCountdown(null);
      
      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        setShowPlayInstruction(false);
        onDismiss();
      }, 8000);
    } else if (syncEvent.type === 'pause') {
      setTargetTime(syncEvent.targetTime);
      setShowPlayInstruction(false);
      setCountdown(null);
    } else if (syncEvent.type === 'seek') {
      setTargetTime(syncEvent.targetTime);
      setShowPlayInstruction(syncEvent.isPlaying);
      setCountdown(null);
      
      if (syncEvent.isPlaying) {
        setTimeout(() => {
          setShowPlayInstruction(false);
          onDismiss();
        }, 8000);
      }
    }
  }, [syncEvent, isHost, onDismiss]);

  // Don't show for host
  if (isHost) return null;

  // Show countdown overlay
  if (countdown !== null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="text-center space-y-6 p-8">
          <div className="relative">
            <div className="w-32 h-32 mx-auto rounded-full border-4 border-primary flex items-center justify-center">
              <span className="text-6xl font-bold text-primary animate-pulse">
                {countdown}
              </span>
            </div>
            <div className="absolute inset-0 w-32 h-32 mx-auto rounded-full border-4 border-primary/30 animate-ping" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Get Ready!</h2>
            <p className="text-muted-foreground">
              Seek your video to <span className="font-mono font-bold text-primary">{formatTime(targetTime)}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Press play when the countdown ends
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show play instruction
  if (showPlayInstruction) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto">
        <div className="text-center space-y-6 p-8 max-w-md">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary/20 flex items-center justify-center animate-bounce">
            <Play className="w-12 h-12 text-primary fill-primary" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">Click Play Now!</h2>
            <p className="text-muted-foreground">
              Seek to <span className="font-mono font-bold text-primary text-lg">{formatTime(targetTime)}</span> and press play
            </p>
          </div>
          
          <Button onClick={onDismiss} variant="outline" size="lg">
            Got it
          </Button>
        </div>
      </div>
    );
  }

  // Show out of sync warning (persistent but non-blocking)
  if (isOutOfSync && !showPlayInstruction && countdown === null) {
    return (
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4">
        <div className="bg-destructive/90 backdrop-blur-sm text-destructive-foreground rounded-lg shadow-lg p-4 flex items-center gap-4">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">You're out of sync</p>
            <p className="text-sm opacity-90">
              ~{Math.round(driftSeconds)}s behind • Host at {formatTime(hostTime)}
            </p>
          </div>
          <Button
            onClick={onResync}
            variant="secondary"
            size="sm"
            className="gap-2 shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            Resync
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
