import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Hls from "hls.js";
import { AlertTriangle, RefreshCw, Volume2, VolumeX, Maximize, Pause, Play, Settings, Subtitles, Check, Loader2 } from "lucide-react";
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
import { MeowSubtitle } from "@/hooks/useMeowStream";

interface MeowHLSPlayerProps {
  url: string;
  title: string;
  subtitles?: MeowSubtitle[];
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

export function MeowHLSPlayer({ url, title, subtitles = [], onLoad, onError, className }: MeowHLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert relative proxy URLs to absolute Supabase URLs
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  
  const resolvedUrl = useMemo(() => {
    if (url.startsWith('/functions/v1/')) {
      return `${supabaseUrl}${url}`;
    }
    return url;
  }, [url, supabaseUrl]);

  const resolvedSubtitles = useMemo(() => {
    return subtitles.map(sub => ({
      ...sub,
      url: sub.url.startsWith('/functions/v1/')
        ? `${supabaseUrl}${sub.url}`
        : sub.url,
    }));
  }, [subtitles, supabaseUrl]);
  
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
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const [currentSubtitle, setCurrentSubtitle] = useState<number>(-1);
  const [retryCount, setRetryCount] = useState(0);

  // Add external subtitles to video
  useEffect(() => {
    const video = videoRef.current;
    if (!video || resolvedSubtitles.length === 0) return;

    // Clear existing tracks
    while (video.textTracks.length > 0) {
      const track = video.textTracks[0];
      if (track.mode) track.mode = 'disabled';
    }

    // Add subtitle tracks
    resolvedSubtitles.forEach((sub, index) => {
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = sub.label;
      track.srclang = sub.lang;
      track.src = sub.url;
      if (index === 0) track.default = true;
      video.appendChild(track);
    });
  }, [resolvedSubtitles]);

  const initHls = useCallback(() => {
    const video = videoRef.current;
    if (!video || !resolvedUrl) return;

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
        startLevel: -1,
        abrEwmaDefaultEstimate: 500000,
      });
      
      hlsRef.current = hls;

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log("[MeowHLS] Media attached, loading source:", resolvedUrl);
        hls.loadSource(resolvedUrl);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        console.log("[MeowHLS] Manifest parsed, levels:", data.levels.length);
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

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error("[MeowHLS] Error:", data.type, data.details, data);
        
        if (data.fatal) {
          setIsLoading(false);
          
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (retryCount < 3) {
                console.log("[MeowHLS] Attempting to recover from network error...");
                hls.startLoad();
                setRetryCount(prev => prev + 1);
              } else {
                setHasError(true);
                setErrorMessage(`Network error: ${data.details}. The stream may be unavailable.`);
                onError?.();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              if (retryCount < 3) {
                console.log("[MeowHLS] Attempting to recover from media error...");
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
      video.src = resolvedUrl;
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        onLoad?.();
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
  }, [resolvedUrl, onLoad, onError, retryCount]);

  useEffect(() => {
    const cleanup = initHls();
    return cleanup;
  }, [resolvedUrl]);

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
    hls.currentLevel = levelIndex;
  };

  const setSubtitleTrack = (trackIndex: number) => {
    const video = videoRef.current;
    if (!video) return;
    
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = i === trackIndex ? "showing" : "hidden";
    }
    setCurrentSubtitle(trackIndex);
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
          <p className="text-foreground font-medium">Failed to load MeowTV stream</p>
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
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-muted-foreground">Loading MeowTV stream...</p>
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
        {/* Progress Bar */}
        <div className="relative mb-3">
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
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={togglePlay}
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>

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

            <span className="text-white text-sm">
              {formatTime(progress)} / {formatTime(duration)}
            </span>

            {/* MeowTV Badge */}
            <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded font-medium">
              MeowTV
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* External Subtitles */}
            {subtitles.length > 0 && (
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
                    onClick={() => setSubtitleTrack(-1)}
                    className="flex items-center justify-between"
                  >
                    Off
                    {currentSubtitle === -1 && <Check className="w-4 h-4 ml-2" />}
                  </DropdownMenuItem>
                  {subtitles.map((sub, index) => (
                    <DropdownMenuItem 
                      key={index}
                      onClick={() => setSubtitleTrack(index)}
                      className="flex items-center justify-between"
                    >
                      {sub.label} ({sub.lang})
                      {currentSubtitle === index && <Check className="w-4 h-4 ml-2" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Quality */}
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
                {qualityLevels.map((level) => (
                  <DropdownMenuItem 
                    key={level.index}
                    onClick={() => setQuality(level.index)}
                    className="flex items-center justify-between"
                  >
                    {level.label}
                    {currentQuality === level.index && <Check className="w-4 h-4 ml-2" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

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

      {/* Center Play Button */}
      {!isPlaying && !isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-20 h-20 rounded-full bg-emerald-500/90 backdrop-blur flex items-center justify-center">
            <Play className="w-10 h-10 text-white ml-1" fill="currentColor" />
          </div>
        </div>
      )}
    </div>
  );
}
