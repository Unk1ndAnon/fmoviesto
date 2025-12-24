import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, RotateCcw, Users, Bell, BellOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PlaybackSyncProps {
  isHost: boolean;
  isConnected: boolean;
  currentTime: number;
  isPlaying: boolean;
  onUpdatePlayback: (time: number, playing: boolean) => void;
  memberCount: number;
}

const AUTO_SYNC_INTERVAL = 30000; // 30 seconds

export function PlaybackSync({
  isHost,
  isConnected,
  currentTime,
  isPlaying,
  onUpdatePlayback,
  memberCount,
}: PlaybackSyncProps) {
  const [localTime, setLocalTime] = useState(currentTime);
  const [localPlaying, setLocalPlaying] = useState(isPlaying);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  const lastSyncRef = useRef<number>(Date.now());
  const autoSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state with remote state (for guests)
  useEffect(() => {
    if (!isHost) {
      setLocalTime(currentTime);
      setLocalPlaying(isPlaying);
      
      // Show toast when host changes playback
      const timeSinceLastSync = Date.now() - lastSyncRef.current;
      if (timeSinceLastSync > 1000) {
        if (isPlaying !== localPlaying) {
          toast.info(isPlaying ? '▶️ Host resumed playback' : '⏸️ Host paused playback', {
            duration: 2000,
          });
        }
      }
      lastSyncRef.current = Date.now();
      setLastSyncTime(Date.now());
    }
  }, [currentTime, isPlaying, isHost]);

  // Auto-sync reminder for guests
  useEffect(() => {
    if (isHost || !isConnected || !autoSyncEnabled) {
      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current);
        autoSyncIntervalRef.current = null;
      }
      return;
    }

    autoSyncIntervalRef.current = setInterval(() => {
      const timeSinceLastSync = Date.now() - lastSyncTime;
      if (timeSinceLastSync >= AUTO_SYNC_INTERVAL) {
        toast.info(
          <div className="flex flex-col gap-1">
            <span className="font-medium">🔄 Time to sync!</span>
            <span className="text-sm">Sync to: {formatTime(currentTime)}</span>
          </div>,
          {
            duration: 5000,
            action: {
              label: 'Got it',
              onClick: () => setLastSyncTime(Date.now()),
            },
          }
        );
        setLastSyncTime(Date.now());
      }
    }, AUTO_SYNC_INTERVAL);

    return () => {
      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current);
      }
    };
  }, [isHost, isConnected, autoSyncEnabled, lastSyncTime, currentTime]);

  const handlePlayPause = () => {
    if (!isHost) return;
    const newPlaying = !localPlaying;
    setLocalPlaying(newPlaying);
    onUpdatePlayback(localTime, newPlaying);
    toast.success(newPlaying ? 'Playback resumed for all' : 'Playback paused for all', {
      duration: 2000,
    });
  };

  const handleSeek = (value: number[]) => {
    if (!isHost) return;
    const newTime = value[0];
    setLocalTime(newTime);
  };

  const handleSeekCommit = (value: number[]) => {
    if (!isHost) return;
    const newTime = value[0];
    setLocalTime(newTime);
    onUpdatePlayback(newTime, localPlaying);
    toast.success(`Synced to ${formatTime(newTime)}`, { duration: 2000 });
  };

  const handleSync = () => {
    if (!isHost) return;
    onUpdatePlayback(localTime, localPlaying);
    toast.success('Sync signal sent to all guests', { duration: 2000 });
  };

  const toggleAutoSync = () => {
    setAutoSyncEnabled(!autoSyncEnabled);
    toast.info(autoSyncEnabled ? 'Auto-sync reminders disabled' : 'Auto-sync reminders enabled', {
      duration: 2000,
    });
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isConnected) return null;

  return (
    <div className="p-3 bg-card border border-border rounded-lg space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
          )} />
          <span className="text-muted-foreground">
            {isHost ? 'You are the host' : 'Synced with host'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isHost && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={toggleAutoSync}
              title={autoSyncEnabled ? 'Disable sync reminders' : 'Enable sync reminders'}
            >
              {autoSyncEnabled ? (
                <Bell className="w-3 h-3 text-primary" />
              ) : (
                <BellOff className="w-3 h-3 text-muted-foreground" />
              )}
            </Button>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            {memberCount} watching
          </div>
        </div>
      </div>

      {/* Playback Controls - Host Only */}
      {isHost && (
        <div className="space-y-3">
          {/* Time Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Sync Time</span>
              <span>{formatTime(localTime)}</span>
            </div>
            <Slider
              value={[localTime]}
              min={0}
              max={10800} // 3 hours max
              step={1}
              onValueChange={handleSeek}
              onValueCommit={handleSeekCommit}
              className="cursor-pointer"
            />
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={localPlaying ? "default" : "outline"}
              onClick={handlePlayPause}
              className="flex-1 gap-2"
            >
              {localPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause All
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Play All
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSync}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Sync
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Set your video time, then use controls to sync everyone
          </p>
        </div>
      )}

      {/* Guest View */}
      {!isHost && (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-secondary/50 rounded">
            <div className="flex items-center gap-2">
              {isPlaying ? (
                <Play className="w-4 h-4 text-green-500" />
              ) : (
                <Pause className="w-4 h-4 text-yellow-500" />
              )}
              <span className="text-sm">
                {isPlaying ? 'Playing' : 'Paused'}
              </span>
            </div>
            <span className="text-sm font-mono">{formatTime(currentTime)}</span>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Sync your player to: <strong>{formatTime(currentTime)}</strong>
            </p>
            {autoSyncEnabled && (
              <span className="text-xs text-primary flex items-center gap-1">
                <Bell className="w-3 h-3" />
                Auto-remind on
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
