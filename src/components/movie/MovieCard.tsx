import { Link } from "react-router-dom";
import { Star, Play } from "lucide-react";
import { Movie, TVShow, getImageUrl } from "@/lib/tmdb";
import { getMovieUrl, getTVShowUrl } from "@/lib/slug";
import { cn } from "@/lib/utils";

interface MovieCardProps {
  item: Movie | TVShow;
  type: "movie" | "tv";
  className?: string;
}

export function MovieCard({ item, type, className }: MovieCardProps) {
  const title = type === "movie" ? (item as Movie).title : (item as TVShow).name;
  const releaseDate = type === "movie" ? (item as Movie).release_date : (item as TVShow).first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : "N/A";
  const rating = item.vote_average?.toFixed(1) || "N/A";
  const isHighRating = item.vote_average >= 7;

  const url = type === "movie" ? getMovieUrl(title) : getTVShowUrl(title);

  return (
    <Link
      to={url}
      className={cn("movie-card group block", className)}
    >
      <div className="relative aspect-[2/3] bg-secondary rounded-lg overflow-hidden">
        {/* Poster */}
        <img
          src={getImageUrl(item.poster_path, "w342")}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-14 h-14 rounded-full bg-primary/90 backdrop-blur flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
          </div>
        </div>

        {/* Rating Badge */}
        <div className="absolute top-2 left-2">
          <div
            className={cn(
              "rating-badge",
              isHighRating && "high"
            )}
          >
            <Star className="w-3 h-3" fill="currentColor" />
            {rating}
          </div>
        </div>

        {/* Quality Badge */}
        <div className="absolute top-2 right-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/90 text-primary-foreground">
            HD
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="pt-3 space-y-1">
        <h3 className="font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">{year}</p>
      </div>
    </Link>
  );
}
