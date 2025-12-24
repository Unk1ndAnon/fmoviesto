import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Play, Pause, RotateCcw, Users, Timer, Radio, AlertTriangle, CheckCircle, Clock, Target, Activity, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { HeartbeatData } from '@/hooks/useWatchParty';

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
  lastHostHeartbeat?: HeartbeatData | null;
  onSendHeartbeat?: (time: number, playing: boolean) => void;
  // Vidify player sync data
  playerTime?: number;
  playerStatus?: 'play' | 'pause' | 'seeking' | 'progress' | 'ended';
  isPlayerActive?: boolean;
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
  lastHostHeartbeat,
  onSendHeartbeat,
  // Vidify player sync data
  playerTime = 0,
  playerStatus = 'pause',
  isPlayerActive = false,
}: PlaybackSyncProps) {
  const [localTime, setLocalTime] = useState(currentTime);
  const [localPlaying, setLocalPlaying] = useState(isPlaying);
  const [timeInput, setTimeInput] = useState(formatTime(currentTime));
  const [countdownDuration, setCountdownDuration] = useState(5);
  const [hostLiveTime, setHostLiveTime] = useState(currentTime);
  const lastUpdateRef = useRef<number>(Date.now());
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // For host: use actual player time when available
  const effectiveHostTime = isHost && isPlayerActive ? playerTime : localTime;
  const effectiveHostPlaying = isHost && isPlayerActive 
    ? (playerStatus === 'play' || playerStatus === 'progress') 
    : localPlaying;

  // Calculate and tick host's live time based on heartbeat (for viewers)
  useEffect(() => {
    if (isHost) {
      // For host, use player time if active, otherwise local time
      setHostLiveTime(isPlayerActive ? playerTime : localTime);
      return;
    }

    if (!lastHostHeartbeat) {
      setHostLiveTime(currentTime);
      return;
    }

    // Calculate initial time from heartbeat
    const calculateHostTime = () => {
      const elapsed = (Date.now() - lastHostHeartbeat.timestamp) / 1000;
      return lastHostHeartbeat.hostPlaying 
        ? lastHostHeartbeat.hostTime + elapsed 
        : lastHostHeartbeat.hostTime;
    };

    setHostLiveTime(calculateHostTime());

    // If host is playing, tick every second
    if (lastHostHeartbeat.hostPlaying) {
      tickIntervalRef.current = setInterval(() => {
        setHostLiveTime(calculateHostTime());
      }, 1000);
    }

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
      }
    };
  }, [isHost, localTime, lastHostHeartbeat, currentTime, isPlayerActive, playerTime]);

  // Host: sync local state with player time when active
  useEffect(() => {
    if (isHost && isPlayerActive) {
      setLocalTime(playerTime);
      setLocalPlaying(playerStatus === 'play' || playerStatus === 'progress');
      setTimeInput(formatTime(playerTime));
    }
  }, [isHost, isPlayerActive, playerTime, playerStatus]);

  // Host ticking: only when player is not active (manual mode)
  useEffect(() => {
    if (!isHost || !localPlaying || isPlayerActive) return;

    const hostTickInterval = setInterval(() => {
      setLocalTime(prev => prev + 1);
      setTimeInput(formatTime(localTime + 1));
    }, 1000);

    return () => clearInterval(hostTickInterval);
  }, [isHost, localPlaying, localTime, isPlayerActive]);

  // Sync local state with remote state (for non-host or when player not active)
  useEffect(() => {
    if (isHost && isPlayerActive) return; // Don't override player time
    setLocalTime(currentTime);
    setLocalPlaying(isPlaying);
    setTimeInput(formatTime(currentTime));
    lastUpdateRef.current = Date.now();
  }, [currentTime, isPlaying, isHost, isPlayerActive]);

  // Send heartbeat periodically when host (using effective player time)
  useEffect(() => {
    if (!isHost || !onSendHeartbeat) return;

    const heartbeatInterval = setInterval(() => {
      onSendHeartbeat(effectiveHostTime, effectiveHostPlaying);
    }, 3000);

    return () => clearInterval(heartbeatInterval);
  }, [isHost, effectiveHostTime, effectiveHostPlaying, onSendHeartbeat]);

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

  const handleSeekToHostTime = () => {
    toast.success(`🎯 Seek your video to ${formatTime(Math.round(hostLiveTime))}`, {
      duration: 5000,
      description: 'Match the host\'s current playback position',
    });
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
          {/* Player Connection Status */}
          <div className={cn(
            "flex items-center gap-2 p-2 rounded-lg text-sm",
            isPlayerActive 
              ? "bg-green-500/10 text-green-600" 
              : "bg-yellow-500/10 text-yellow-600"
          )}>
            {isPlayerActive ? (
              <>
                <Activity className="w-4 h-4" />
                <span>Player connected - syncing automatically</span>
                <span className="ml-auto text-xs px-2 py-0.5 bg-green-500/20 rounded-full">
                  {playerStatus}
                </span>
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4" />
                <span>Waiting for player connection...</span>
              </>
            )}
          </div>

          {/* Live Host Time Display */}
          <div className="p-3 bg-primary/10 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Your Current Time</span>
                {effectiveHostPlaying && (
                  <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-500 rounded-full animate-pulse">
                    LIVE
                  </span>
                )}
              </div>
              <span className="text-2xl font-mono font-bold text-primary">
                {formatTime(effectiveHostTime)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isPlayerActive 
                ? 'Syncing from your video player in real-time'
                : 'Start playing in your video player to sync automatically'}
            </p>
          </div>

          {/* Time Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">Set Target Time</label>
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
            {isPlayerActive 
              ? 'Your player syncs automatically - viewers will follow your playback'
              : 'Set your video time, then sync everyone. They\'ll see instructions to match your playback.'}
          </p>
        </div>
      )}

      {/* Guest View */}
      {!isHost && (
        <div className="space-y-3">
          {/* Player Connection Status for viewers */}
          <div className={cn(
            "flex items-center gap-2 p-2 rounded-lg text-sm",
            isPlayerActive 
              ? "bg-green-500/10 text-green-600" 
              : "bg-muted/50 text-muted-foreground"
          )}>
            {isPlayerActive ? (
              <>
                <Activity className="w-4 h-4" />
                <span>Your player connected</span>
                <span className="ml-auto font-mono text-xs">
                  {formatTime(playerTime)}
                </span>
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4" />
                <span>Play video to enable sync tracking</span>
              </>
            )}
          </div>

          {/* Live Host Time Display */}
          <div className="p-4 bg-primary/10 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <span className="font-medium">Host's Current Time</span>
              </div>
              {lastHostHeartbeat?.hostPlaying && (
                <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-500 rounded-full animate-pulse">
                  LIVE
                </span>
              )}
            </div>
            <div className="text-center">
              <span className="text-4xl font-mono font-bold text-primary">
                {formatTime(Math.round(hostLiveTime))}
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Seek your video player to this exact time
            </p>
          </div>

          {/* Seek to Host Time Button */}
          <Button 
            onClick={handleSeekToHostTime}
            className="w-full gap-2"
            size="lg"
          >
            <Target className="w-5 h-5" />
            Seek to {formatTime(Math.round(hostLiveTime))}
          </Button>

          {/* Current host status */}
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              {lastHostHeartbeat?.hostPlaying ?? isPlaying ? (
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
                  Host is {(lastHostHeartbeat?.hostPlaying ?? isPlaying) ? 'playing' : 'paused'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(lastHostHeartbeat?.hostPlaying ?? isPlaying) ? 'Press play to sync' : 'Pause your video'}
                </p>
              </div>
            </div>
          </div>

          {/* Sync status with drift detection */}
          <div className={cn(
            "flex items-center gap-2 p-2 rounded-lg text-sm",
            isOutOfSync 
              ? "bg-destructive/10 text-destructive" 
              : isPlayerActive && driftSeconds < 3
                ? "bg-green-500/10 text-green-600"
                : "bg-muted/50 text-muted-foreground"
          )}>
            {isOutOfSync ? (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>~{Math.round(driftSeconds)}s out of sync - seek to {formatTime(Math.round(hostLiveTime))}</span>
              </>
            ) : isPlayerActive ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>In sync with host {driftSeconds > 0 && `(${driftSeconds.toFixed(1)}s drift)`}</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                <span>Play video to check sync status</span>
              </>
            )}
          </div>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Seek your video player to <strong className="text-foreground">{formatTime(Math.round(hostLiveTime))}</strong></p>
            <p>• {(lastHostHeartbeat?.hostPlaying ?? isPlaying) ? 'Press play to match the host' : 'Pause your video to match the host'}</p>
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
