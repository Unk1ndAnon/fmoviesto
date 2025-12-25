import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { AlertTriangle, RefreshCw, Volume2, VolumeX, Maximize, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface HLSPlayerProps {
  url: string;
  title: string;
  onLoad?: () => void;
  onError?: () => void;
  className?: string;
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
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
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
        lowLatencyMode: true,
      });
      
      hlsRef.current = hls;

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(url);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        onLoad?.();
        video.play().catch(() => {
          // Autoplay might be blocked, that's ok
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setIsLoading(false);
          setHasError(true);
          setErrorMessage(data.details || "Failed to load video");
          onError?.();
          
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error("HLS network error:", data.details);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error("HLS media error:", data.details);
              hls.recoverMediaError();
              break;
            default:
              console.error("HLS fatal error:", data.details);
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
  }, [url, onLoad, onError]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setProgress(video.currentTime);
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
    // Re-trigger the effect by updating the video source
    if (videoRef.current && hlsRef.current) {
      hlsRef.current.loadSource(url);
    }
  };

  if (hasError) {
    return (
      <div className={cn("relative aspect-video bg-black flex items-center justify-center", className)}>
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <AlertTriangle className="w-12 h-12 text-destructive" />
          <p className="text-foreground font-medium">Failed to load video</p>
          <p className="text-muted-foreground text-sm">{errorMessage}</p>
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
        onClick={togglePlay}
        title={title}
      />

      {/* Custom Controls */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Progress Bar */}
        <Slider
          value={[progress]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="mb-3 cursor-pointer"
        />

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
