import { Link } from "react-router-dom";
import { useMovieTags, getTagTypeColor } from "@/hooks/useTags";
import { Badge } from "@/components/ui/badge";

// Feature flag - set to true to enable movie tags
const MOVIE_TAGS_ENABLED = false;

interface MovieTagsProps {
  tmdbId: number;
  mediaType?: "movie" | "tv";
  maxTags?: number;
  showType?: boolean;
}

export function MovieTags({ 
  tmdbId, 
  mediaType = "movie", 
  maxTags = 8,
  showType = false
}: MovieTagsProps) {
  // Feature disabled
  if (!MOVIE_TAGS_ENABLED) {
    return null;
  }
  
  const { data: movieTags, isLoading } = useMovieTags(tmdbId, mediaType);

  if (isLoading || !movieTags?.length) {
    return null;
  }

  const displayTags = movieTags.slice(0, maxTags);

  return (
    <div className="flex flex-wrap gap-2">
      {displayTags.map((mt) => {
        if (!mt.tag) return null;
        
        return (
          <Link
            key={mt.id}
            to={`/tag/${mt.tag.slug}`}
            className="transition-transform hover:scale-105"
          >
            <Badge
              variant="outline"
              className={`${getTagTypeColor(mt.tag.tag_type)} text-xs font-medium capitalize cursor-pointer`}
            >
              {showType && (
                <span className="opacity-60 mr-1">{mt.tag.tag_type}:</span>
              )}
              {mt.tag.name}
            </Badge>
          </Link>
        );
      })}
      {movieTags.length > maxTags && (
        <Badge variant="secondary" className="text-xs">
          +{movieTags.length - maxTags} more
        </Badge>
      )}
    </div>
  );
}
