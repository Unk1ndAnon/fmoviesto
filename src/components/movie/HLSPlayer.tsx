import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { AlertTriangle, RefreshCw, Volume2, VolumeX, Maximize, Pause, Play, Settings, Subtitles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HLSPlayerProps {
  url: string;
  title: string;
  onLoad?: () => void;
  onError?: () => void;
  className?: string;
}

interface QualityLevel {
  index: number;
  height: number;
  bitrate: number;
  label: string;
}

interface SubtitleTrack {
  id: number;
  name: string;
  lang: string;
}

export function HLSPlayer({ url, title, onLoad, onError, className }: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Quality and subtitles state
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = auto
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<number>(-1); // -1 = off
  const [retryCount, setRetryCount] = useState(0);

  const initHls = useCallback(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
        manifestLoadingTimeOut: 20000,
        manifestLoadingMaxRetry: 4,
        manifestLoadingRetryDelay: 1000,
        levelLoadingTimeOut: 20000,
        levelLoadingMaxRetry: 4,
        levelLoadingRetryDelay: 1000,
        startLevel: -1, // Auto quality
        abrEwmaDefaultEstimate: 500000, // 500kbps starting estimate
      });
      
      hlsRef.current = hls;

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log("HLS: Media attached, loading source:", url);
        hls.loadSource(url);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        console.log("HLS: Manifest parsed, levels:", data.levels.length);
        setIsLoading(false);
        onLoad?.();
        
        // Build quality levels
        const levels: QualityLevel[] = data.levels.map((level, index) => ({
          index,
          height: level.height || 0,
          bitrate: level.bitrate || 0,
          label: level.height ? `${level.height}p` : `${Math.round((level.bitrate || 0) / 1000)}kbps`,
        }));
        
        // Sort by height descending
        levels.sort((a, b) => b.height - a.height);
        setQualityLevels(levels);
        
        video.play().catch(() => {
          // Autoplay might be blocked
        });
      });

      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
        const tracks: SubtitleTrack[] = data.subtitleTracks.map((track, index) => ({
          id: index,
          name: track.name || track.lang || `Track ${index + 1}`,
          lang: track.lang || "",
        }));
        setSubtitleTracks(tracks);
        console.log("HLS: Subtitle tracks found:", tracks.length);
      });

      hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_, data) => {
        setCurrentSubtitle(data.id);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        if (currentQuality === -1) {
          // Auto mode - don't update UI
        }
        console.log("HLS: Level switched to", data.level);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error("HLS Error:", data.type, data.details, data);
        
        if (data.fatal) {
          setIsLoading(false);
          
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error("HLS network error:", data.details);
              // Try to recover
              if (retryCount < 3) {
                console.log("Attempting to recover from network error...");
                hls.startLoad();
                setRetryCount(prev => prev + 1);
              } else {
                setHasError(true);
                setErrorMessage(`Network error: ${data.details}. The stream may be unavailable or blocked.`);
                onError?.();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error("HLS media error:", data.details);
              if (retryCount < 3) {
                console.log("Attempting to recover from media error...");
                hls.recoverMediaError();
                setRetryCount(prev => prev + 1);
              } else {
                setHasError(true);
                setErrorMessage(`Media error: ${data.details}`);
                onError?.();
              }
              break;
            default:
              setHasError(true);
              setErrorMessage(`Playback error: ${data.details}`);
              onError?.();
              break;
          }
        }
      });

      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS support (Safari)
      video.src = url;
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        onLoad?.();
        
        // Get text tracks for Safari
        const tracks: SubtitleTrack[] = [];
        for (let i = 0; i < video.textTracks.length; i++) {
          const track = video.textTracks[i];
          if (track.kind === "subtitles" || track.kind === "captions") {
            tracks.push({
              id: i,
              name: track.label || track.language || `Track ${i + 1}`,
              lang: track.language || "",
            });
          }
        }
        setSubtitleTracks(tracks);
        
        video.play().catch(() => {});
      });
      video.addEventListener("error", () => {
        setIsLoading(false);
        setHasError(true);
        setErrorMessage("Failed to load video");
        onError?.();
      });
    } else {
      setHasError(true);
      setErrorMessage("HLS is not supported in this browser");
      onError?.();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url, onLoad, onError, retryCount, currentQuality]);

  useEffect(() => {
    const cleanup = initHls();
    return cleanup;
  }, [url]); // Only re-init on URL change

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      setProgress(video.currentTime);
      // Update buffered progress
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const handleDurationChange = () => setDuration(video.duration);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("volumechange", handleVolumeChange);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("volumechange", handleVolumeChange);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value[0];
    if (value[0] > 0 && video.muted) {
      video.muted = false;
    }
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value[0];
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  const setQuality = (levelIndex: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    
    setCurrentQuality(levelIndex);
    hls.currentLevel = levelIndex; // -1 for auto
    console.log("Quality set to:", levelIndex === -1 ? "Auto" : qualityLevels.find(l => l.index === levelIndex)?.label);
  };

  const setSubtitle = (trackId: number) => {
    const hls = hlsRef.current;
    const video = videoRef.current;
    
    if (hls) {
      hls.subtitleTrack = trackId;
      setCurrentSubtitle(trackId);
    } else if (video) {
      // Safari native
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = i === trackId ? "showing" : "hidden";
      }
      setCurrentSubtitle(trackId);
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const retry = () => {
    setHasError(false);
    setIsLoading(true);
    setRetryCount(0);
    initHls();
  };

  const getCurrentQualityLabel = () => {
    if (currentQuality === -1) return "Auto";
    const level = qualityLevels.find(l => l.index === currentQuality);
    return level?.label || "Auto";
  };

  if (hasError) {
    return (
      <div className={cn("relative aspect-video bg-black flex items-center justify-center", className)}>
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <AlertTriangle className="w-12 h-12 text-destructive" />
          <p className="text-foreground font-medium">Failed to load video</p>
          <p className="text-muted-foreground text-sm max-w-md">{errorMessage}</p>
          <Button variant="outline" onClick={retry} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn("relative aspect-video bg-black overflow-hidden group", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading video...</p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full"
        playsInline
        crossOrigin="anonymous"
        onClick={togglePlay}
        title={title}
      />

      {/* Custom Controls */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Progress Bar with Buffer */}
        <div className="relative mb-3">
          {/* Buffer indicator */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-white/30 rounded-full"
            style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
          />
          <Slider
            value={[progress]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer relative z-10"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={togglePlay}
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="w-20"
              />
            </div>

            {/* Time */}
            <span className="text-white text-sm">
              {formatTime(progress)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Subtitles */}
            {subtitleTracks.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className={cn(
                      "text-white hover:bg-white/20",
                      currentSubtitle !== -1 && "text-primary"
                    )}
                  >
                    <Subtitles className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-sm border-border z-50">
                  <DropdownMenuLabel>Subtitles</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setSubtitle(-1)}
                    className="flex items-center justify-between"
                  >
                    Off
                    {currentSubtitle === -1 && <Check className="w-4 h-4 ml-2" />}
                  </DropdownMenuItem>
                  {subtitleTracks.map((track) => (
                    <DropdownMenuItem 
                      key={track.id}
                      onClick={() => setSubtitle(track.id)}
                      className="flex items-center justify-between"
                    >
                      {track.name} {track.lang && `(${track.lang})`}
                      {currentSubtitle === track.id && <Check className="w-4 h-4 ml-2" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Quality - Always show */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-white hover:bg-white/20 gap-1 px-2"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-xs">{getCurrentQualityLabel()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-sm border-border z-50">
                <DropdownMenuLabel>Quality</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setQuality(-1)}
                  className="flex items-center justify-between"
                >
                  Auto
                  {currentQuality === -1 && <Check className="w-4 h-4 ml-2" />}
                </DropdownMenuItem>
                {qualityLevels.length > 0 ? (
                  qualityLevels.map((level) => (
                    <DropdownMenuItem 
                      key={level.index}
                      onClick={() => setQuality(level.index)}
                      className="flex items-center justify-between"
                    >
                      {level.label}
                      {currentQuality === level.index && <Check className="w-4 h-4 ml-2" />}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                    No quality options available
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Fullscreen */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              <Maximize className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Center Play Button (when paused) */}
      {!isPlaying && !isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-20 h-20 rounded-full bg-primary/90 backdrop-blur flex items-center justify-center">
            <Play className="w-10 h-10 text-primary-foreground ml-1" fill="currentColor" />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to check if URL is m3u8/HLS
export function isHLSUrl(url: string): boolean {
  const trimmedUrl = url.trim().toLowerCase();
  return trimmedUrl.endsWith('.m3u8') || trimmedUrl.includes('.m3u8?');
}
