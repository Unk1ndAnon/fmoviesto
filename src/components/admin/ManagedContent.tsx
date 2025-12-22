import { useState } from "react";
import { Link } from "react-router-dom";
import { AdminMovie } from "@/lib/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Film, 
  Tv, 
  Search, 
  Edit, 
  Trash2, 
  ExternalLink, 
  Star,
  EyeOff,
  Grid,
  List
} from "lucide-react";

interface ManagedContentProps {
  movies: AdminMovie[];
  onEdit: (tmdbId: number, type: "movie" | "tv") => void;
  onDelete: (tmdbId: number, type: "movie" | "tv") => void;
}

export function ManagedContent({ movies, onEdit, onDelete }: ManagedContentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [typeFilter, setTypeFilter] = useState<"all" | "movie" | "tv">("all");

  const filteredMovies = movies.filter((movie) => {
    const matchesSearch =
      !searchQuery ||
      movie.custom_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movie.tmdb_id.toString().includes(searchQuery);
    const matchesType = typeFilter === "all" || movie.media_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getMediaPath = (movie: AdminMovie) => {
    return movie.media_type === "movie"
      ? `/movie/${movie.tmdb_id}`
      : `/tv/${movie.tmdb_id}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Managed Content</h1>
          <p className="text-muted-foreground">
            {movies.length} items with custom settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or TMDB ID..."
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={typeFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("all")}
              >
                All
              </Button>
              <Button
                variant={typeFilter === "movie" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("movie")}
                className="gap-1"
              >
                <Film className="w-4 h-4" />
                Movies
              </Button>
              <Button
                variant={typeFilter === "tv" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("tv")}
                className="gap-1"
              >
                <Tv className="w-4 h-4" />
                TV Shows
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {filteredMovies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Film className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {movies.length === 0
                ? "No managed content yet"
                : "No content matches your filters"}
            </p>
            <p className="text-sm text-muted-foreground">
              {movies.length === 0
                ? "Search for movies or TV shows to add custom settings"
                : "Try adjusting your search or filters"}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMovies.map((movie) => (
            <Card
              key={movie.id}
              className="overflow-hidden hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {movie.media_type === "movie" ? (
                      <Film className="w-4 h-4 text-primary" />
                    ) : (
                      <Tv className="w-4 h-4 text-primary" />
                    )}
                    <Badge variant="outline" className="text-xs">
                      {movie.media_type.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    {movie.featured && (
                      <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    {movie.hidden && (
                      <Badge variant="secondary">
                        <EyeOff className="w-3 h-3 mr-1" />
                        Hidden
                      </Badge>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
                  {movie.custom_title || `TMDB #${movie.tmdb_id}`}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  ID: {movie.tmdb_id}
                </p>

                {movie.embeds && movie.embeds.length > 0 && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {movie.embeds.length} custom embed
                    {movie.embeds.length > 1 ? "s" : ""}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(movie.tmdb_id, movie.media_type)}
                    className="flex-1 gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </Button>
                  <Link to={getMediaPath(movie)} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1">
                      <ExternalLink className="w-3 h-3" />
                      View
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Delete this item? All custom settings will be removed."
                        )
                      ) {
                        onDelete(movie.tmdb_id, movie.media_type);
                      }
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="divide-y">
                {filteredMovies.map((movie) => (
                  <div
                    key={movie.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        {movie.media_type === "movie" ? (
                          <Film className="w-5 h-5 text-primary" />
                        ) : (
                          <Tv className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {movie.custom_title || `TMDB #${movie.tmdb_id}`}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {movie.media_type}
                          </Badge>
                          {movie.featured && (
                            <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-xs">
                              Featured
                            </Badge>
                          )}
                          {movie.hidden && (
                            <Badge variant="secondary" className="text-xs">
                              Hidden
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ID: {movie.tmdb_id} •{" "}
                          {movie.embeds?.length || 0} embeds
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(movie.tmdb_id, movie.media_type)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Link to={getMediaPath(movie)}>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm("Delete this item?")) {
                            onDelete(movie.tmdb_id, movie.media_type);
                          }
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
