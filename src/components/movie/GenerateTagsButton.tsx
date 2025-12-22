import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Check } from "lucide-react";
import { useBatchTagging, useMovieTagStatus } from "@/hooks/useTags";
import { adminAuth } from "@/lib/admin";
import { toast } from "sonner";

interface GenerateTagsButtonProps {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
}

export function GenerateTagsButton({ tmdbId, mediaType, title }: GenerateTagsButtonProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { tagSingle } = useBatchTagging();
  const { data: tagStatus, refetch: refetchStatus } = useMovieTagStatus(tmdbId, mediaType);

  useEffect(() => {
    adminAuth.isAuthenticated().then((result) => {
      setIsAdmin(result);
      setIsChecking(false);
    });
  }, []);

  const handleGenerateTags = async () => {
    try {
      const result = await tagSingle.mutateAsync({ tmdbId, mediaType });
      
      if (result.success) {
        toast.success(`Generated ${result.tag_count} tags for "${title}"`);
        refetchStatus();
      } else {
        toast.error("Failed to generate tags");
      }
    } catch (error) {
      console.error("Error generating tags:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate tags");
    }
  };

  // Don't show button if not admin or still checking
  if (isChecking || !isAdmin) {
    return null;
  }

  const isTagged = tagStatus?.tagged_at != null;
  const isGenerating = tagSingle.isPending;

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 rounded-full border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/80"
      onClick={handleGenerateTags}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating...
        </>
      ) : isTagged ? (
        <>
          <Sparkles className="w-4 h-4" />
          Regenerate Tags
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          Generate AI Tags
        </>
      )}
    </Button>
  );
}
