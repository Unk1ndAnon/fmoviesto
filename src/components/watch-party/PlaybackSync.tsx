import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Play, Pause, RotateCcw, Users, Timer, Radio, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PlaybackSyncProps {
  isHost: boolean;
  isConnected: boolean;
  currentTime: number;
  isPlaying: boolean;
  onUpdatePlayback: (time: number, playing: boolean) => void;
  memberCount: number;
  // New sync props
  onInitiateCountdown?: (targetTime: number, countdownSeconds: number) => void;
  onSendPlay?: (time: number) => void;
  onSendPause?: (time: number) => void;
  onSendSeek?: (time: number, isPlaying: boolean) => void;
  driftSeconds?: number;
  isOutOfSync?: boolean;
  lastHeartbeatTime?: number;
}

const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const parseTimeInput = (input: string): number | null => {
  // Support formats: "1:23:45", "23:45", "45", "1h23m45s"
  const colonFormat = input.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (colonFormat) {
    if (colonFormat[3]) {
      // h:mm:ss
      return parseInt(colonFormat[1]) * 3600 + parseInt(colonFormat[2]) * 60 + parseInt(colonFormat[3]);
    } else {
      // mm:ss
      return parseInt(colonFormat[1]) * 60 + parseInt(colonFormat[2]);
    }
  }
  
  // Just seconds
  const secondsOnly = input.match(/^(\d+)$/);
  if (secondsOnly) {
    return parseInt(secondsOnly[1]);
  }
  
  return null;
};

export function PlaybackSync({
  isHost,
  isConnected,
  currentTime,
  isPlaying,
  onUpdatePlayback,
  memberCount,
  onInitiateCountdown,
  onSendPlay,
  onSendPause,
  onSendSeek,
  driftSeconds = 0,
  isOutOfSync = false,
  lastHeartbeatTime,
}: PlaybackSyncProps) {
  const [localTime, setLocalTime] = useState(currentTime);
  const [localPlaying, setLocalPlaying] = useState(isPlaying);
  const [timeInput, setTimeInput] = useState(formatTime(currentTime));
  const [countdownDuration, setCountdownDuration] = useState(5);
  const lastUpdateRef = useRef<number>(Date.now());

  // Sync local state with remote state
  useEffect(() => {
    setLocalTime(currentTime);
    setLocalPlaying(isPlaying);
    setTimeInput(formatTime(currentTime));
    lastUpdateRef.current = Date.now();
  }, [currentTime, isPlaying]);

  // Handle time input change
  const handleTimeInputChange = (value: string) => {
    setTimeInput(value);
    const parsed = parseTimeInput(value);
    if (parsed !== null) {
      setLocalTime(parsed);
    }
  };

  const handleTimeInputBlur = () => {
    const parsed = parseTimeInput(timeInput);
    if (parsed !== null) {
      setLocalTime(parsed);
      setTimeInput(formatTime(parsed));
    } else {
      setTimeInput(formatTime(localTime));
    }
  };

  // Host controls
  const handlePlayPause = () => {
    if (!isHost) return;
    const newPlaying = !localPlaying;
    setLocalPlaying(newPlaying);
    onUpdatePlayback(localTime, newPlaying);
    
    if (newPlaying && onSendPlay) {
      onSendPlay(localTime);
      toast.success('▶️ Play signal sent to all viewers', { duration: 2000 });
    } else if (!newPlaying && onSendPause) {
      onSendPause(localTime);
      toast.success('⏸️ Pause signal sent to all viewers', { duration: 2000 });
    }
  };

  const handleSeek = (value: number[]) => {
    if (!isHost) return;
    const newTime = value[0];
    setLocalTime(newTime);
    setTimeInput(formatTime(newTime));
  };

  const handleSeekCommit = (value: number[]) => {
    if (!isHost) return;
    const newTime = value[0];
    setLocalTime(newTime);
    setTimeInput(formatTime(newTime));
    onUpdatePlayback(newTime, localPlaying);
    
    if (onSendSeek) {
      onSendSeek(newTime, localPlaying);
      toast.success(`⏱️ Seek to ${formatTime(newTime)} sent`, { duration: 2000 });
    }
  };

  const handleCountdownSync = () => {
    if (!isHost || !onInitiateCountdown) return;
    onInitiateCountdown(localTime, countdownDuration);
    toast.success(`🎬 ${countdownDuration}s countdown started for all viewers`, { duration: 3000 });
  };

  const handleQuickSync = () => {
    if (!isHost) return;
    onUpdatePlayback(localTime, localPlaying);
    if (onSendSeek) {
      onSendSeek(localTime, localPlaying);
    }
    toast.success('🔄 Sync signal sent', { duration: 2000 });
  };

  if (!isConnected) return null;

  return (
    <div className="p-4 bg-card border border-border rounded-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
          )} />
          <span className="font-medium text-foreground">
            {isHost ? '🎬 Host Controls' : '📺 Viewer Sync'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{memberCount} watching</span>
        </div>
      </div>

      {/* Host Controls */}
      {isHost && (
        <div className="space-y-4">
          {/* Time Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">Target Time</label>
              <div className="flex items-center gap-2">
                <Input
                  value={timeInput}
                  onChange={(e) => handleTimeInputChange(e.target.value)}
                  onBlur={handleTimeInputBlur}
                  className="w-28 h-8 text-center font-mono"
                  placeholder="0:00"
                />
              </div>
            </div>
            <Slider
              value={[localTime]}
              min={0}
              max={10800}
              step={1}
              onValueChange={handleSeek}
              onValueCommit={handleSeekCommit}
              className="cursor-pointer"
            />
          </div>

          {/* Primary Controls */}
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
              onClick={handleQuickSync}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Sync Now
            </Button>
          </div>

          {/* Countdown Sync */}
          <div className="p-3 bg-secondary/50 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Timer className="w-4 h-4 text-primary" />
              Countdown Sync
            </div>
            <p className="text-xs text-muted-foreground">
              Give viewers a countdown to seek their video and press play together.
            </p>
            <div className="flex gap-2">
              <select
                value={countdownDuration}
                onChange={(e) => setCountdownDuration(parseInt(e.target.value))}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value={3}>3 seconds</option>
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={15}>15 seconds</option>
              </select>
              <Button
                onClick={handleCountdownSync}
                size="sm"
                className="flex-1 gap-2"
              >
                <Radio className="w-4 h-4" />
                Start Countdown
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Set your video time, then sync everyone. They'll see instructions to match your playback.
          </p>
        </div>
      )}

      {/* Guest View */}
      {!isHost && (
        <div className="space-y-3">
          {/* Current host status */}
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              {isPlaying ? (
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Play className="w-4 h-4 text-green-500 fill-green-500" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Pause className="w-4 h-4 text-yellow-500" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium">
                  Host is {isPlaying ? 'playing' : 'paused'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Sync your video to this time
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-mono font-bold text-primary">
                {formatTime(currentTime)}
              </p>
            </div>
          </div>

          {/* Sync status */}
          <div className={cn(
            "flex items-center gap-2 p-2 rounded-lg text-sm",
            isOutOfSync 
              ? "bg-destructive/10 text-destructive" 
              : "bg-green-500/10 text-green-600"
          )}>
            {isOutOfSync ? (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>~{Math.round(driftSeconds)}s out of sync</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>In sync with host</span>
              </>
            )}
          </div>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Seek your video player to <strong className="text-foreground">{formatTime(currentTime)}</strong></p>
            <p>• {isPlaying ? 'Press play to match the host' : 'Pause your video to match the host'}</p>
            <p>• Watch for countdown notifications from the host</p>
          </div>

          {lastHeartbeatTime && (
            <p className="text-xs text-muted-foreground">
              Last sync: {new Date(lastHeartbeatTime).toLocaleTimeString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
