import React, { useState, useEffect, useMemo } from "react";
import { AlertTriangle, RefreshCw, Play, Server, ChevronDown } from "lucide-react";
import { EMBED_SOURCES } from "@/lib/tmdb";
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
import { FmovPlayer, isFmovStream } from "./FmovPlayer";

const STREAMS_API_BASE = "http://twkg0oc0co8c8g8gskkkc48k.80.240.19.37.sslip.io";

export interface VideoSource {
  name: string;
  url: string;
  isCustom: boolean;
  isHLS?: boolean;
  noAds?: boolean;
  quality?: string;
  provider?: string;
  isApiStream?: boolean; // Streams from external API
}

interface StreamsApiResponse {
  success: boolean;
  tmdbId: string;
  count: number;
  streams: Array<{
    title: string;
    name?: string;
    url: string;
    quality: string;
    provider: string;
  }>;
}

interface VideoPlayerProps {
  id: number;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
  title: string;
  backdrop?: string;
  onPlay?: () => void;
  externalControls?: boolean;
  currentSource?: number;
  onSourceChange?: (index: number) => void;
}

// Fetch streams from external API
async function fetchStreamsFromApi(
  id: number, 
  type: "movie" | "tv", 
  title: string,
  season?: number, 
  episode?: number
): Promise<VideoSource[]> {
  try {
    let endpoint = `${STREAMS_API_BASE}/api/streams/${type}/${id}`;
    if (type === "tv" && season && episode) {
      endpoint = `${STREAMS_API_BASE}/api/streams/tv/${id}/${season}/${episode}`;
    }
    
    // Add title as query parameter for MeowTV
    const url = new URL(endpoint);
    url.searchParams.set('title', title);
    
    const response = await fetch(url.toString(), { 
      signal: AbortSignal.timeout(15000) 
    });
    
    if (!response.ok) return [];
    
    const data: StreamsApiResponse = await response.json();
    
    if (!data.success || !data.streams?.length) return [];
    
    return data.streams.map(stream => ({
      name: stream.name || stream.title,
      url: stream.url,
      isCustom: false,
      isHLS: stream.url.includes('m3u8-proxy') || stream.url.includes('.m3u8'),
      noAds: true,
      quality: stream.quality,
      provider: stream.provider,
      isApiStream: true, // Mark as API stream for FmovPlayer
    }));
  } catch (error) {
    console.warn("Failed to fetch streams from API:", error);
    return [];
  }
}

// Export hook for getting sources
export function useVideoSources(id: number, type: "movie" | "tv", title: string, season?: number, episode?: number) {
  const [adminData, setAdminData] = useState<AdminMovie | null>(null);
  const [apiStreams, setApiStreams] = useState<VideoSource[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(true);

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

  // Fetch from streams API
  useEffect(() => {
    if (!title) return;
    setIsLoadingApi(true);
    fetchStreamsFromApi(id, type, title, season, episode)
      .then(streams => {
        setApiStreams(streams);
        setIsLoadingApi(false);
      })
      .catch(() => {
        setApiStreams([]);
        setIsLoadingApi(false);
      });
  }, [id, type, title, season, episode]);

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
    }).filter(s => s.url);
    
    // Deduplicate by URL - API streams first, then custom, then defaults
    const allSources = [...apiStreams, ...customSources, ...defaultSources];
    const seenUrls = new Set<string>();
    const uniqueSources: VideoSource[] = [];
    
    for (const source of allSources) {
      if (!seenUrls.has(source.url)) {
        seenUrls.add(source.url);
        uniqueSources.push(source);
      }
    }
    
    return uniqueSources;
  }, [validCustomEmbeds, apiStreams, id, type, season, episode]);

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
        className="w-56 max-h-80 overflow-y-auto bg-card border-border z-50"
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
            <span className="flex-1 truncate">{source.name}</span>
            {source.quality && (
              <span className="text-xs text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-medium">{source.quality}</span>
            )}
            {source.noAds && (
              <span className="text-xs text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded font-medium">No Ads</span>
            )}
            {source.isHLS && !source.quality && (
              <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">HLS</span>
            )}
            {currentSource === index && <span className="text-xs text-muted-foreground">Active</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
  
  const sources = useVideoSources(id, type, title, season, episode);
  
  // Use external or internal source control
  const currentSource = externalControls && externalSource !== undefined ? externalSource : internalSource;
  const setCurrentSource = externalControls && onSourceChange ? onSourceChange : setInternalSource;
  
  const currentSourceData = sources[currentSource];
  const currentEmbedUrl = currentSourceData?.url || "";
  const isCurrentHLS = currentSourceData?.isHLS || false;
  const isCurrentApiStream = currentSourceData?.isApiStream || false;

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

      {/* Player Container */}
      <div className="relative aspect-video bg-black overflow-hidden rounded-lg">
        {isCurrentApiStream ? (
          // Use FmovPlayer for API streams (HLS and MP4)
          <FmovPlayer
            url={currentEmbedUrl}
            title={title}
            poster={backdrop}
            onLoad={handleLoad}
            onError={handleError}
            className="w-full h-full"
          />
        ) : isCurrentHLS ? (
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
