import { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw, Play } from "lucide-react";
import { EMBED_SOURCES, getEmbedUrl } from "@/lib/tmdb";
import { adminStorage, AdminMovie } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  id: number;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
  title: string;
  backdrop?: string;
  onPlay?: () => void;
}

export function VideoPlayer({ id, type, season, episode, title, backdrop, onPlay }: VideoPlayerProps) {
  const [currentSource, setCurrentSource] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [adminData, setAdminData] = useState<AdminMovie | null>(null);

  // Fetch custom embeds from admin storage
  useEffect(() => {
    const fetchAdminData = async () => {
      const data = await adminStorage.get(id, type);
      setAdminData(data);
    };
    fetchAdminData();
  }, [id, type]);

  const customEmbeds = adminData?.embeds || [];

  const allSources = [
    ...customEmbeds.map((embed) => ({
      name: embed.name,
      url: embed.url,
      isCustom: true,
    })),
    ...EMBED_SOURCES.map((source, index) => ({
      name: source.name,
      url: getEmbedUrl(id, type, index, season, episode),
      isCustom: false,
    })),
  ];

  const currentEmbedUrl = allSources[currentSource]?.url || "";

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const tryNextSource = () => {
    if (currentSource < allSources.length - 1) {
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

  // Click to Play overlay
  if (!isPlaying && backdrop) {
    return (
      <div className="w-full">
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
        
        {/* Server Tabs - Below Preview */}
        <div className="bg-card/80 backdrop-blur rounded-lg border border-border mt-4 p-4">
          <p className="text-sm text-muted-foreground mb-3">{allSources.length} servers available</p>
          <div className="flex flex-wrap gap-2">
            {allSources.map((source, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSource(index);
                  handlePlay();
                }}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all border",
                  currentSource === index
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/80 text-secondary-foreground border-border hover:bg-secondary"
                )}
              >
                {source.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
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
                This server might be unavailable. Try another server below.
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

      {/* Server Tabs - Below Player */}
      <div className="bg-card/80 backdrop-blur rounded-lg border border-border mt-4 p-4">
        <p className="text-sm text-muted-foreground mb-3">{allSources.length} servers available</p>
        <div className="flex flex-wrap gap-2">
          {allSources.map((source, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentSource(index);
                setIsLoading(true);
                setHasError(false);
              }}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all border",
                currentSource === index
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/80 text-secondary-foreground border-border hover:bg-secondary"
              )}
            >
              {source.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
