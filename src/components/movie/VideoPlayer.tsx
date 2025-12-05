import { useState } from "react";
import { AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";
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
      {/* Player Container */}
      <div className="relative aspect-video bg-card rounded-lg overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Loading player...</p>
            </div>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-card">
            <div className="flex flex-col items-center gap-4 text-center px-4">
              <AlertTriangle className="w-12 h-12 text-destructive" />
              <p className="text-foreground font-medium">Failed to load video</p>
              <p className="text-muted-foreground text-sm">
                This source might be unavailable. Try another source below.
              </p>
              <Button variant="outline" onClick={tryNextSource} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Next Source
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

      {/* Source Selector */}
      <div className="mt-4">
        <p className="text-sm text-muted-foreground mb-2">Select Server:</p>
        <div className="flex flex-wrap gap-2">
          {allSources.map((source, index) => (
            <Button
              key={index}
              variant={currentSource === index ? "default" : "cinema"}
              size="sm"
              onClick={() => {
                setCurrentSource(index);
                setIsLoading(true);
                setHasError(false);
              }}
              className="gap-2"
            >
              {source.isCustom && <ExternalLink className="w-3 h-3" />}
              {source.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="mt-4 text-xs text-muted-foreground/60 text-center">
        If the video doesn't play, try selecting a different server above. 
        All videos are hosted by third-party providers.
      </p>
    </div>
  );
}
