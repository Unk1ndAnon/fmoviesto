import { useState, useEffect, useMemo } from "react";
import { AlertTriangle, RefreshCw, Play, Server } from "lucide-react";
import { EMBED_SOURCES, getEmbedUrl } from "@/lib/tmdb";
import { adminStorage, AdminMovie } from "@/lib/admin";
import { validateEmbedUrl } from "@/lib/url-validation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  showServerSidebar?: boolean;
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

// Server Sidebar Component
interface ServerSidebarProps {
  sources: VideoSource[];
  currentSource: number;
  onSelectSource: (index: number) => void;
  onClose?: () => void;
}

export function ServerSidebar({ sources, currentSource, onSelectSource }: ServerSidebarProps) {
  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <Server className="w-5 h-5 text-primary" />
        <span className="font-semibold text-foreground">Servers</span>
        <span className="ml-auto text-xs text-muted-foreground">{sources.length}</span>
      </div>

      {/* Server List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sources.map((source, index) => (
            <button
              key={index}
              onClick={() => onSelectSource(index)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                currentSource === index
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary text-foreground"
              )}
            >
              <div className={cn(
                "w-2.5 h-2.5 rounded-full shrink-0",
                currentSource === index 
                  ? "bg-green-400 animate-pulse" 
                  : "bg-muted-foreground/30"
              )} />
              <span className="text-sm font-medium truncate">{source.name}</span>
              {currentSource === index && (
                <span className="ml-auto text-xs opacity-70">Active</span>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export function VideoPlayer({ id, type, season, episode, title, backdrop, onPlay, showServerSidebar = true }: VideoPlayerProps) {
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

  // Click to Play overlay
  if (!isPlaying && backdrop) {
    return (
      <div className="flex gap-4">
        {/* Server Sidebar */}
        {showServerSidebar && (
          <div className="hidden lg:block w-48 shrink-0 rounded-lg overflow-hidden border border-border">
            <ServerSidebar
              sources={sources}
              currentSource={currentSource}
              onSelectSource={handleSelectSource}
            />
          </div>
        )}
        
        {/* Player Area */}
        <div className="flex-1">
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
          
          {/* Mobile Server Info */}
          <div className="lg:hidden flex items-center gap-2 mt-3 text-sm text-muted-foreground">
            <Server className="w-4 h-4" />
            <span>Server: <span className="text-foreground font-medium">{sources[currentSource]?.name}</span></span>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {/* Server Sidebar */}
      {showServerSidebar && (
        <div className="hidden lg:block w-48 shrink-0 rounded-lg overflow-hidden border border-border max-h-[calc(56.25vw*0.6)] lg:max-h-[400px]">
          <ServerSidebar
            sources={sources}
            currentSource={currentSource}
            onSelectSource={handleSelectSource}
          />
        </div>
      )}
      
      {/* Player Area */}
      <div className="flex-1">
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

        {/* Mobile Server Info */}
        <div className="lg:hidden flex items-center gap-2 mt-3 text-sm text-muted-foreground">
          <Server className="w-4 h-4" />
          <span>Server: <span className="text-foreground font-medium">{sources[currentSource]?.name}</span></span>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
