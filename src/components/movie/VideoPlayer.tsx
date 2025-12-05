import { useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { EMBED_SOURCES, getEmbedUrl } from "@/lib/tmdb";
import { adminStorage } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  id: number;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
  title: string;
}

export function VideoPlayer({ id, type, season, episode, title }: VideoPlayerProps) {
  const [currentSource, setCurrentSource] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Get custom embeds from admin storage
  const adminData = adminStorage.get(id, type);
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

  return (
    <div className="w-full">
      {/* Server Tabs - Above Player */}
      <div className="bg-card/80 backdrop-blur rounded-t-lg border border-border border-b-0 p-4">
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
                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                currentSource === index
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/80 text-secondary-foreground hover:bg-secondary"
              )}
            >
              {source.name}
            </button>
          ))}
        </div>
      </div>

      {/* Player Container */}
      <div className="relative aspect-video bg-black overflow-hidden border-x border-border">
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
                This server might be unavailable. Try another server above.
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

      {/* Server Notice - Below Player */}
      <div className="bg-card/80 backdrop-blur rounded-b-lg border border-border border-t-0 p-4">
        <p className="text-sm text-center text-muted-foreground">
          If current server doesn't work please try other servers above.
        </p>
      </div>
    </div>
  );
}
