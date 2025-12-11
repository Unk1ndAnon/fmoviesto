import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useUserLists";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "@/lib/tmdb";
import { Heart, Star, Play, Trash2, Film, Loader2 } from "lucide-react";

export default function Favorites() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { favorites, isLoading, removeFavorite } = useFavorites();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  return (
    <>
      <SEOHead
        title="My Favorites - fmovies"
        description="View and manage your favorite movies and TV shows."
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 pt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-3 mb-8">
              <Heart className="w-8 h-8 text-primary" fill="currentColor" />
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                My Favorites
              </h1>
              <span className="text-muted-foreground">({favorites.length})</span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : favorites.length === 0 ? (
              <div className="text-center py-20">
                <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  No favorites yet
                </h2>
                <p className="text-muted-foreground mb-6">
                  Start adding movies and TV shows to your favorites!
                </p>
                <Link to="/movies">
                  <Button variant="default">Browse Movies</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {favorites.map((item) => {
                  const slug = generateSlug(item.title);
                  const detailsLink = `/${item.media_type}/${item.tmdb_id}-${slug}`;
                  const watchLink = item.media_type === "movie"
                    ? `/watch/movie/${item.tmdb_id}-${slug}`
                    : `/watch/tv/${item.tmdb_id}-${slug}?s=1&e=1`;

                  return (
                    <div key={item.id} className="group relative">
                      <Link to={detailsLink} className="block">
                        <div className="relative aspect-[2/3] bg-card rounded-lg overflow-hidden">
                          {item.poster_path ? (
                            <img
                              src={getImageUrl(item.poster_path, "w342")}
                              alt={item.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Film className="w-12 h-12" />
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                          <Link
                            to={watchLink}
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                          >
                            <div className="w-14 h-14 rounded-full bg-primary/90 backdrop-blur flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
                              <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
                            </div>
                          </Link>

                          {item.vote_average && (
                            <div className="absolute top-2 left-2 rating-badge high">
                              <Star className="w-3 h-3" fill="currentColor" />
                              {Number(item.vote_average).toFixed(1)}
                            </div>
                          )}

                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-primary/90 text-primary-foreground uppercase">
                            {item.media_type}
                          </span>
                        </div>

                        <div className="pt-3 space-y-1">
                          <h3 className="font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {item.release_date ? new Date(item.release_date).getFullYear() : "N/A"}
                          </p>
                        </div>
                      </Link>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute bottom-12 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeFavorite.mutate({ tmdb_id: item.tmdb_id, media_type: item.media_type })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
