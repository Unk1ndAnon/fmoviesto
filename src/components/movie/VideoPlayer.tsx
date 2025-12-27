import React, { useState, useEffect, useMemo } from "react";
import { AlertTriangle, RefreshCw, Play, Server, ChevronDown, X, Info } from "lucide-react";
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
import { HLSPlayer, isHLSUrl } from "./HLSPlayer";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface VideoSource {
  name: string;
  url: string;
  isCustom: boolean;
  isHLS?: boolean;
  noAds?: boolean;
}

interface VideoPlayerProps {
  id: number;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
  title: string;
  backdrop?: string;
  onPlay?: () => void;
  externalControls?: boolean; // When true, don't render server dropdown inside player
  currentSource?: number;
  onSourceChange?: (index: number) => void;
}

// Export hook for getting sources
export function useVideoSources(id: number, type: "movie" | "tv", season?: number, episode?: number) {
  const [adminData, setAdminData] = useState<AdminMovie | null>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const data = await adminStorage.get(id, type);
        setAdminData(data);
      } catch (error) {
        console.warn("Failed to fetch admin data:", error);
        setAdminData(null);
      }
    };
    fetchAdminData();
  }, [id, type]);

  const validCustomEmbeds = useMemo(() => {
    return (adminData?.embeds || []).filter(embed => {
      const validation = validateEmbedUrl(embed.url);
      return validation.valid;
    });
  }, [adminData]);

  const sources: VideoSource[] = useMemo(() => {
    const customSources = validCustomEmbeds.map((embed) => ({
      name: embed.name,
      url: embed.url,
      isCustom: true,
      isHLS: isHLSUrl(embed.url),
    }));
    
    // Filter out movie-only sources when viewing TV shows
    const filteredEmbedSources = EMBED_SOURCES.filter((source) => {
      if (type === "tv" && (source as any).movieOnly) {
        return false;
      }
      return true;
    });
    
    const defaultSources = filteredEmbedSources.map((source) => {
      const url = source.getUrl(id, type, season, episode);
      return {
        name: source.name,
        url: url || "",
        isCustom: false,
        isHLS: false,
        noAds: (source as any).noAds || false,
      };
    }).filter(s => s.url); // Filter out sources with null/empty URLs
    
    // Deduplicate by URL - custom sources take priority
    const customUrls = new Set(customSources.map(s => s.url));
    const filteredDefaults = defaultSources.filter(s => !customUrls.has(s.url));
    
    return [...customSources, ...filteredDefaults];
  }, [validCustomEmbeds, id, type, season, episode]);

  return sources;
}

// Standalone Server Dropdown Component
interface ServerDropdownProps {
  sources: VideoSource[];
  currentSource: number;
  onSelectSource: (index: number) => void;
}

export function ServerDropdown({ sources, currentSource, onSelectSource }: ServerDropdownProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const handleSelect = (index: number) => {
    onSelectSource(index);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          size="sm"
          className="gap-2 bg-card border-border h-9 touch-manipulation"
        >
          <Server className="w-4 h-4" />
          <span className="font-medium">{sources[currentSource]?.name || "Select"}</span>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-48 bg-card border-border z-50"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {sources.map((source, index) => (
          <DropdownMenuItem
            key={index}
            onSelect={() => handleSelect(index)}
            className={cn("cursor-pointer gap-2 touch-manipulation", currentSource === index && "bg-primary/10")}
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full shrink-0",
                currentSource === index ? "bg-green-500" : "bg-muted-foreground/30"
              )}
            />
            <span className="flex-1">{source.name}</span>
            {source.noAds && (
              <span className="text-xs text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded font-medium">No Ads</span>
            )}
            {source.isHLS && (
              <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">HLS</span>
            )}
            {currentSource === index && <span className="text-xs text-muted-foreground">Active</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Server notice component
function ServerNotice({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Alert className="mb-3 bg-muted/50 border-border relative">
      <Info className="h-4 w-4 text-primary" />
      <AlertDescription className="text-sm text-muted-foreground pr-8">
        If the video doesn't load or play, try switching to a different server from the dropdown below.
      </AlertDescription>
      <button
        onClick={onDismiss}
        className="absolute right-2 top-2 p-1 rounded-md hover:bg-background/80 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </Alert>
  );
}

export function VideoPlayer({ 
  id, 
  type, 
  season, 
  episode, 
  title, 
  backdrop, 
  onPlay,
  externalControls = false,
  currentSource: externalSource,
  onSourceChange,
}: VideoPlayerProps) {
  const [internalSource, setInternalSource] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showNotice, setShowNotice] = useState(() => {
    // Check if user has dismissed the notice before
    const dismissed = localStorage.getItem('server-notice-dismissed');
    return !dismissed;
  });

  const handleDismissNotice = () => {
    setShowNotice(false);
    localStorage.setItem('server-notice-dismissed', 'true');
  };
  
  const sources = useVideoSources(id, type, season, episode);
  
  // Use external or internal source control
  const currentSource = externalControls && externalSource !== undefined ? externalSource : internalSource;
  const setCurrentSource = externalControls && onSourceChange ? onSourceChange : setInternalSource;
  
  const currentSourceData = sources[currentSource];
  const currentEmbedUrl = currentSourceData?.url || "";
  const isCurrentHLS = currentSourceData?.isHLS || false;

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

  // Internal Server Dropdown (only used when not externally controlled)
  const InternalServerDropdown = () => (
    <ServerDropdown 
      sources={sources} 
      currentSource={currentSource} 
      onSelectSource={handleSelectSource} 
    />
  );

  // Click to Play overlay
  if (!isPlaying && backdrop) {
    return (
      <div className="w-full">
        {/* Server Dropdown - Above Player (only when not external) */}
        {!externalControls && (
          <div className="mb-3">
            <InternalServerDropdown />
          </div>
        )}

        {/* Server Notice */}
        {showNotice && <ServerNotice onDismiss={handleDismissNotice} />}

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
      {/* Server Dropdown - Above Player (only when not external) */}
      {!externalControls && (
        <div className="mb-3">
          <InternalServerDropdown />
        </div>
      )}

      {/* Server Notice */}
      {showNotice && <ServerNotice onDismiss={handleDismissNotice} />}

      {/* Player Container */}
      <div className="relative aspect-video bg-black overflow-hidden rounded-lg">
        {/* HLS Player for m3u8 URLs */}
        {isCurrentHLS ? (
          <HLSPlayer
            url={currentEmbedUrl}
            title={title}
            onLoad={handleLoad}
            onError={handleError}
            className="w-full h-full"
          />
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
