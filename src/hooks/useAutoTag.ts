import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseAutoTagOptions {
  tmdbId: number | undefined;
  mediaType: "movie" | "tv";
  enabled?: boolean;
}

export function useAutoTag({ tmdbId, mediaType, enabled = true }: UseAutoTagOptions) {
  const triggeredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!tmdbId || !enabled) return;

    const key = `${mediaType}-${tmdbId}`;
    
    // Prevent duplicate triggers in the same session
    if (triggeredRef.current.has(key)) return;

    const autoTag = async () => {
      try {
        // Check if already tagged
        const { data: meta } = await supabase
          .from("movie_meta")
          .select("tagged_at")
          .eq("tmdb_id", tmdbId)
          .eq("media_type", mediaType)
          .maybeSingle();

        if (meta?.tagged_at) {
          // Already tagged, skip
          return;
        }

        // Mark as triggered to prevent duplicate calls
        triggeredRef.current.add(key);

        // Trigger background tagging (fire and forget)
        console.log(`Auto-tagging ${mediaType} ${tmdbId}...`);
        
        const { error } = await supabase.functions.invoke("batch-tag-movies", {
          body: { action: "tag_single", tmdb_id: tmdbId, media_type: mediaType }
        });

        if (error) {
          console.error("Auto-tag error:", error);
          // Remove from triggered set so it can retry
          triggeredRef.current.delete(key);
        } else {
          console.log(`Auto-tagged ${mediaType} ${tmdbId} successfully`);
        }
      } catch (err) {
        console.error("Auto-tag failed:", err);
        triggeredRef.current.delete(key);
      }
    };

    // Delay slightly to not block initial page load
    const timeout = setTimeout(autoTag, 2000);

    return () => clearTimeout(timeout);
  }, [tmdbId, mediaType, enabled]);
}
