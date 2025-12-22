import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Film, Tv, User, X, Loader2 } from "lucide-react";
import { tmdb, getImageUrl } from "@/lib/tmdb";
import { getMovieUrl, getTVShowUrl } from "@/lib/slug";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface LiveSearchProps {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  onNavigate?: () => void;
  autoFocus?: boolean;
}

export function LiveSearch({ 
  className, 
  inputClassName,
  placeholder = "Search movies, TV shows, people...",
  onNavigate,
  autoFocus = false
}: LiveSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["liveSearch", debouncedQuery],
    queryFn: () => tmdb.searchMulti(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 1000 * 60 * 5,
  });

  const results = data?.results || [];
  const movies = results.filter((r: any) => r.media_type === "movie").slice(0, 4);
  const tvShows = results.filter((r: any) => r.media_type === "tv").slice(0, 4);
  const people = results.filter((r: any) => r.media_type === "person").slice(0, 3);

  const hasResults = movies.length > 0 || tvShows.length > 0 || people.length > 0;
  const showDropdown = isOpen && debouncedQuery.length >= 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
      setQuery("");
      onNavigate?.();
    }
  };

  const handleItemClick = () => {
    setIsOpen(false);
    setQuery("");
    onNavigate?.();
  };

  const clearSearch = () => {
    setQuery("");
    setDebouncedQuery("");
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className={cn("pl-10 pr-8", inputClassName)}
            autoFocus={autoFocus}
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* Dropdown Results */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && !hasResults && debouncedQuery.length >= 2 && (
            <div className="py-8 text-center text-muted-foreground">
              <p>No results found for "{debouncedQuery}"</p>
            </div>
          )}

          {!isLoading && hasResults && (
            <div className="divide-y divide-border">
              {/* Movies */}
              {movies.length > 0 && (
                <div className="p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    <Film className="w-3 h-3" />
                    Movies
                  </div>
                  <div className="space-y-1">
                    {movies.map((movie: any) => (
                      <Link
                        key={movie.id}
                        to={getMovieUrl(movie.title)}
                        onClick={handleItemClick}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
                      >
                        {movie.poster_path ? (
                          <img
                            src={getImageUrl(movie.poster_path, "w92")}
                            alt={movie.title}
                            className="w-10 h-14 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                            <Film className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{movie.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {movie.release_date?.split("-")[0] || "Unknown"}
                            {movie.vote_average > 0 && ` • ${movie.vote_average.toFixed(1)}`}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* TV Shows */}
              {tvShows.length > 0 && (
                <div className="p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    <Tv className="w-3 h-3" />
                    TV Shows
                  </div>
                  <div className="space-y-1">
                    {tvShows.map((show: any) => (
                      <Link
                        key={show.id}
                        to={getTVShowUrl(show.name)}
                        onClick={handleItemClick}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
                      >
                        {show.poster_path ? (
                          <img
                            src={getImageUrl(show.poster_path, "w92")}
                            alt={show.name}
                            className="w-10 h-14 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                            <Tv className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{show.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {show.first_air_date?.split("-")[0] || "Unknown"}
                            {show.vote_average > 0 && ` • ${show.vote_average.toFixed(1)}`}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* People */}
              {people.length > 0 && (
                <div className="p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    <User className="w-3 h-3" />
                    People
                  </div>
                  <div className="space-y-1">
                    {people.map((person: any) => (
                      <Link
                        key={person.id}
                        to={`/person/${person.id}`}
                        onClick={handleItemClick}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
                      >
                        {person.profile_path ? (
                          <img
                            src={getImageUrl(person.profile_path, "w92")}
                            alt={person.name}
                            className="w-10 h-10 object-cover rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{person.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {person.known_for_department}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* View All Results */}
              <div className="p-3">
                <button
                  onClick={handleSubmit}
                  className="w-full py-2 px-4 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  View all results for "{query}"
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
