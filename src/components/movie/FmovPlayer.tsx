import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { 
  AlertTriangle, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  Pause, 
  Play, 
  Settings, 
  Subtitles, 
  Check,
  SkipBack,
  SkipForward,
  Loader2,
  List,
  ChevronLeft
} from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";

export interface VideoSourceItem {
  name: string;
  url: string;
  isCustom?: boolean;
  isHLS?: boolean;
  noAds?: boolean;
  quality?: string;
  provider?: string;
  isApiStream?: boolean;
}

interface FmovPlayerProps {
  url: string;
  title: string;
  poster?: string;
  sources?: VideoSourceItem[];
  currentSourceIndex?: number;
  onSourceChange?: (index: number) => void;
  onLoad?: () => void;
  onError?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
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

// Detect if URL is HLS or MP4
function isHLSStream(url: string): boolean {
  return url.includes('m3u8-proxy') || 
         url.includes('.m3u8') || 
         url.includes('application/vnd.apple.mpegurl');
}

function isMP4Stream(url: string): boolean {
  return url.includes('ts-proxy') || 
         url.includes('.mp4') || 
         url.includes('video/mp4');
}

export function FmovPlayer({ 
  url, 
  title, 
  poster,
  sources = [],
  currentSourceIndex = 0,
  onSourceChange,
  onLoad, 
  onError, 
  onNext,
  onPrevious,
  className 
}: FmovPlayerProps) {
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSourceList, setShowSourceList] = useState(true); // Open by default
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<number>(-1);
  const [retryCount, setRetryCount] = useState(0);

  const isHLS = isHLSStream(url);
  const isMP4 = isMP4Stream(url);
  
  const hasSources = sources.length > 0;

  const initPlayer = useCallback(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");
    setQualityLevels([]);

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHLS && Hls.isSupported()) {
      // HLS Stream
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
        startLevel: -1,
        abrEwmaDefaultEstimate: 500000,
      });
      
      hlsRef.current = hls;

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log("[FmovPlayer] HLS: Media attached, loading:", url.substring(0, 80));
        hls.loadSource(url);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        console.log("[FmovPlayer] HLS: Manifest parsed, levels:", data.levels.length);
        setIsLoading(false);
        onLoad?.();
        
        const levels: QualityLevel[] = data.levels.map((level, index) => ({
          index,
          height: level.height || 0,
          bitrate: level.bitrate || 0,
          label: level.height ? `${level.height}p` : `${Math.round((level.bitrate || 0) / 1000)}kbps`,
        }));
        
        levels.sort((a, b) => b.height - a.height);
        setQualityLevels(levels);
        
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
        const tracks: SubtitleTrack[] = data.subtitleTracks.map((track, index) => ({
          id: index,
          name: track.name || track.lang || `Track ${index + 1}`,
          lang: track.lang || "",
        }));
        setSubtitleTracks(tracks);
      });

      hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_, data) => {
        setCurrentSubtitle(data.id);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error("[FmovPlayer] HLS Error:", data.type, data.details);
        
        if (data.fatal) {
          setIsLoading(false);
          
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (retryCount < 3) {
                hls.startLoad();
                setRetryCount(prev => prev + 1);
              } else {
                setHasError(true);
                setErrorMessage(`Network error: ${data.details}`);
                onError?.();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              if (retryCount < 3) {
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
    } else if (isHLS && video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS (Safari)
      video.src = url;
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        onLoad?.();
        video.play().catch(() => {});
      });
      video.addEventListener("error", () => {
        setIsLoading(false);
        setHasError(true);
        setErrorMessage("Failed to load HLS stream");
        onError?.();
      });
    } else {
      // MP4 or direct video
      console.log("[FmovPlayer] Loading MP4:", url.substring(0, 80));
      video.src = url;
      
      video.addEventListener("loadedmetadata", () => {
        console.log("[FmovPlayer] MP4 loaded, duration:", video.duration);
        setIsLoading(false);
        onLoad?.();
        video.play().catch(() => {});
      });
      
      video.addEventListener("canplay", () => {
        setIsLoading(false);
      });
      
      video.addEventListener("error", (e) => {
        console.error("[FmovPlayer] MP4 Error:", e);
        setIsLoading(false);
        setHasError(true);
        setErrorMessage("Failed to load video");
        onError?.();
      });

      video.load();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url, onLoad, onError, retryCount, isHLS]);

  useEffect(() => {
    const cleanup = initPlayer();
    return cleanup;
  }, [url]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      setProgress(video.currentTime);
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const handleDurationChange = () => setDuration(video.duration);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
    };
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "ArrowLeft":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case "ArrowRight":
          e.preventDefault();
          video.currentTime = Math.min(duration, video.currentTime + 10);
          break;
        case "ArrowUp":
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [duration]);

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

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
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
    hls.currentLevel = levelIndex;
  };

  const setSubtitle = (trackId: number) => {
    const hls = hlsRef.current;
    const video = videoRef.current;
    
    if (hls) {
      hls.subtitleTrack = trackId;
      setCurrentSubtitle(trackId);
    } else if (video) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = i === trackId ? "showing" : "hidden";
      }
      setCurrentSubtitle(trackId);
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
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
    initPlayer();
  };

  const getCurrentQualityLabel = () => {
    if (currentQuality === -1) return "Auto";
    const level = qualityLevels.find(l => l.index === currentQuality);
    return level?.label || "Auto";
  };

  if (hasError) {
    return (
      <div className={cn("relative aspect-video bg-black flex items-center justify-center rounded-lg", className)}>
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <AlertTriangle className="w-12 h-12 text-destructive" />
          <p className="text-white font-medium">Failed to load video</p>
          <p className="text-white/60 text-sm max-w-md">{errorMessage}</p>
          <Button variant="secondary" onClick={retry} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const handleSourceSelect = (index: number) => {
    onSourceChange?.(index);
    setShowSourceList(false);
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative aspect-video bg-black overflow-hidden group rounded-lg",
        isFullscreen && "rounded-none",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Source List Sidebar */}
      {hasSources && (
        <div 
          className={cn(
            "absolute left-0 top-0 bottom-0 w-56 bg-zinc-900/95 backdrop-blur-sm z-30 transition-transform duration-300 border-r border-zinc-700 flex flex-col",
            showSourceList ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between p-3 border-b border-zinc-700">
            <span className="text-white font-medium text-sm">Sources</span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowSourceList(false)}
              className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {sources.map((source, index) => (
                <button
                  key={index}
                  onClick={() => handleSourceSelect(index)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-2 text-sm",
                    currentSourceIndex === index 
                      ? "bg-primary/20 text-white" 
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <div 
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      currentSourceIndex === index ? "bg-green-500" : "bg-zinc-600"
                    )} 
                  />
                  <span className="flex-1 truncate">{source.name}</span>
                  {source.quality && (
                    <span className="text-xs text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded shrink-0">
                      {source.quality}
                    </span>
                  )}
                  {source.noAds && (
                    <span className="text-xs text-green-400 bg-green-500/20 px-1.5 py-0.5 rounded shrink-0">
                      No Ads
                    </span>
                  )}
                  {currentSourceIndex === index && (
                    <span className="text-xs text-muted-foreground shrink-0">Active</span>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
      {/* Loading overlay */}
      {isLoading && isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 pointer-events-none">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      )}

      {/* Initial loading */}
      {isLoading && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-white/70">Loading stream...</p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        crossOrigin="anonymous"
        onClick={togglePlay}
        poster={poster}
        title={title}
      />

      {/* Gradient overlay for controls */}
      <div 
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Top bar - Title */}
      <div 
        className={cn(
          "absolute top-0 left-0 right-0 p-4 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        <h3 className="text-white font-medium text-lg line-clamp-1 drop-shadow-lg">{title}</h3>
      </div>

      {/* Controls */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 p-4 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Progress Bar with Buffer */}
        <div className="relative mb-4 group/progress">
          {/* Buffer indicator */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-white/30 rounded-full transition-all"
            style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
          />
          <Slider
            value={[progress]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer relative z-10 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:opacity-0 group-hover/progress:[&_[role=slider]]:opacity-100 [&_[role=slider]]:transition-opacity"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* Previous */}
            {onPrevious && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onPrevious}
                className="text-white hover:bg-white/20 h-9 w-9"
              >
                <SkipBack className="w-5 h-5" />
              </Button>
            )}

            {/* Play/Pause */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={togglePlay}
              className="text-white hover:bg-white/20 h-10 w-10"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </Button>

            {/* Next */}
            {onNext && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onNext}
                className="text-white hover:bg-white/20 h-9 w-9"
              >
                <SkipForward className="w-5 h-5" />
              </Button>
            )}

            {/* Skip buttons */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => skip(-10)}
              className="text-white hover:bg-white/20 text-xs px-2 hidden sm:flex"
            >
              -10s
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => skip(10)}
              className="text-white hover:bg-white/20 text-xs px-2 hidden sm:flex"
            >
              +10s
            </Button>

            {/* Volume */}
            <div className="flex items-center gap-1 ml-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleMute}
                className="text-white hover:bg-white/20 h-9 w-9"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="w-20 hidden sm:flex"
              />
            </div>

            {/* Time */}
            <span className="text-white text-sm ml-2 tabular-nums">
              {formatTime(progress)} <span className="text-white/50">/</span> {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Source List Toggle */}
            {hasSources && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowSourceList(!showSourceList)}
                className={cn(
                  "text-white hover:bg-white/20 h-9 w-9",
                  showSourceList && "bg-white/20"
                )}
              >
                <List className="w-5 h-5" />
              </Button>
            )}

            {/* Subtitles */}
            {subtitleTracks.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className={cn(
                      "text-white hover:bg-white/20 h-9 w-9",
                      currentSubtitle !== -1 && "text-primary"
                    )}
                  >
                    <Subtitles className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-zinc-900/95 backdrop-blur-sm border-zinc-700 z-50">
                  <DropdownMenuLabel className="text-white/70">Subtitles</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-zinc-700" />
                  <DropdownMenuItem 
                    onClick={() => setSubtitle(-1)}
                    className="flex items-center justify-between text-white hover:bg-white/10"
                  >
                    Off
                    {currentSubtitle === -1 && <Check className="w-4 h-4 ml-2 text-primary" />}
                  </DropdownMenuItem>
                  {subtitleTracks.map((track) => (
                    <DropdownMenuItem 
                      key={track.id}
                      onClick={() => setSubtitle(track.id)}
                      className="flex items-center justify-between text-white hover:bg-white/10"
                    >
                      {track.name} {track.lang && `(${track.lang})`}
                      {currentSubtitle === track.id && <Check className="w-4 h-4 ml-2 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Quality */}
            {(qualityLevels.length > 0 || isHLS) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-white hover:bg-white/20 gap-1 px-2 h-9"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="text-xs hidden sm:inline">{getCurrentQualityLabel()}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-zinc-900/95 backdrop-blur-sm border-zinc-700 z-50">
                  <DropdownMenuLabel className="text-white/70">Quality</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-zinc-700" />
                  <DropdownMenuItem 
                    onClick={() => setQuality(-1)}
                    className="flex items-center justify-between text-white hover:bg-white/10"
                  >
                    Auto
                    {currentQuality === -1 && <Check className="w-4 h-4 ml-2 text-primary" />}
                  </DropdownMenuItem>
                  {qualityLevels.length > 0 ? (
                    qualityLevels.map((level) => (
                      <DropdownMenuItem 
                        key={level.index}
                        onClick={() => setQuality(level.index)}
                        className="flex items-center justify-between text-white hover:bg-white/10"
                      >
                        {level.label}
                        {currentQuality === level.index && <Check className="w-4 h-4 ml-2 text-primary" />}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled className="text-white/50 text-xs">
                      Loading qualities...
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Fullscreen */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20 h-9 w-9"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Center Play Button (when paused and not loading) */}
      {!isPlaying && !isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer z-10"
          onClick={togglePlay}
        >
          <div className="w-20 h-20 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center transition-transform hover:scale-110">
            <Play className="w-10 h-10 text-primary-foreground ml-1" fill="currentColor" />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to detect stream type
export function isFmovStream(url: string): boolean {
  return isHLSStream(url) || isMP4Stream(url);
}