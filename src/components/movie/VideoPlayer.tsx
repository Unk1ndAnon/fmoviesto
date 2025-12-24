import { useState, useEffect, useMemo } from "react";
import { AlertTriangle, RefreshCw, Play, Server, ChevronDown } from "lucide-react";
import { EMBED_SOURCES, getEmbedUrl } from "@/lib/tmdb";
import { adminStorage, AdminMovie } from "@/lib/admin";
import { validateEmbedUrl } from "@/lib/url-validation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface VideoSource {
  name: string;
  url: string;
  isCustom: boolean;
}

interface VideoPlayerProps {
  id: number;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
  title: string;
  backdrop?: string;
  onPlay?: () => void;
}

// Export hook for getting sources
export function useVideoSources(id: number, type: "movie" | "tv", season?: number, episode?: number) {
  const [adminData, setAdminData] = useState<AdminMovie | null>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      const data = await adminStorage.get(id, type);
      setAdminData(data);
    };
    fetchAdminData();
  }, [id, type]);

  const validCustomEmbeds = useMemo(() => {
    return (adminData?.embeds || []).filter(embed => {
      const validation = validateEmbedUrl(embed.url);
      return validation.valid;
    });
  }, [adminData]);

  const sources: VideoSource[] = useMemo(() => [
    ...validCustomEmbeds.map((embed) => ({
      name: embed.name,
      url: embed.url,
      isCustom: true,
    })),
    ...EMBED_SOURCES.map((source, index) => ({
      name: source.name,
      url: getEmbedUrl(id, type, index, season, episode),
      isCustom: false,
    })),
  ], [validCustomEmbeds, id, type, season, episode]);

  return sources;
}

export function VideoPlayer({ id, type, season, episode, title, backdrop, onPlay }: VideoPlayerProps) {
  const [currentSource, setCurrentSource] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const sources = useVideoSources(id, type, season, episode);
  const currentEmbedUrl = sources[currentSource]?.url || "";

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const tryNextSource = () => {
    if (currentSource < sources.length - 1) {
      setCurrentSource(currentSource + 1);
      setIsLoading(true);
      setHasError(false);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setIsLoading(true);
    onPlay?.();
  };

  const handleSelectSource = (index: number) => {
    setCurrentSource(index);
    if (!isPlaying) {
      handlePlay();
    } else {
      setIsLoading(true);
      setHasError(false);
    }
  };

  // Server Dropdown Component
  const ServerDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-card border-border h-9">
          <Server className="w-4 h-4" />
          <span className="hidden sm:inline">Server:</span>
          <span className="font-medium">{sources[currentSource]?.name || 'Select'}</span>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 bg-card border-border z-50">
        {sources.map((source, index) => (
          <DropdownMenuItem
            key={index}
            onClick={() => handleSelectSource(index)}
            className={cn(
              "cursor-pointer gap-2",
              currentSource === index && "bg-primary/10"
            )}
          >
            <div className={cn(
              "w-2 h-2 rounded-full shrink-0",
              currentSource === index ? "bg-green-500" : "bg-muted-foreground/30"
            )} />
            <span className="flex-1">{source.name}</span>
            {currentSource === index && (
              <span className="text-xs text-muted-foreground">Active</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Click to Play overlay
  if (!isPlaying && backdrop) {
    return (
      <div className="w-full">
        {/* Server Dropdown - Above Player */}
        <div className="mb-3">
          <ServerDropdown />
        </div>

        {/* Player Preview */}
        <div 
          className="relative aspect-video bg-black overflow-hidden rounded-lg cursor-pointer group"
          onClick={handlePlay}
        >
          <img 
            src={backdrop} 
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/90 backdrop-blur flex items-center justify-center transform transition-transform duration-300 group-hover:scale-110">
              <Play className="w-10 h-10 text-primary-foreground ml-1" fill="currentColor" />
            </div>
            <p className="mt-4 text-lg font-medium text-white">Click to Play</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Server Dropdown - Above Player */}
      <div className="mb-3">
        <ServerDropdown />
      </div>

      {/* Player Container */}
      <div className="relative aspect-video bg-black overflow-hidden rounded-lg">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Loading player...</p>
            </div>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-4 text-center px-4">
              <AlertTriangle className="w-12 h-12 text-destructive" />
              <p className="text-foreground font-medium">Failed to load video</p>
              <p className="text-muted-foreground text-sm">
                This server might be unavailable. Try another server.
              </p>
              <Button variant="outline" onClick={tryNextSource} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Next Server
              </Button>
            </div>
          </div>
        )}

        <iframe
          src={currentEmbedUrl}
          className={cn(
            "w-full h-full",
            (isLoading || hasError) && "invisible"
          )}
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          onLoad={handleLoad}
          onError={handleError}
          title={title}
        />
      </div>
    </div>
  );
}
