import { useParams, Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tmdb, getBackdropUrl } from "@/lib/tmdb";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { VideoPlayer } from "@/components/movie/VideoPlayer";
import { MovieRow } from "@/components/movie/MovieRow";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Info, Star, Calendar, Clock } from "lucide-react";

export default function Watch() {
  const { id, type } = useParams<{ id: string; type?: string }>();
  const [searchParams] = useSearchParams();
  
  const isTV = type === "tv";
  const itemId = parseInt(id?.split("-")[0] || "0");
  const season = parseInt(searchParams.get("s") || "1");
  const episode = parseInt(searchParams.get("e") || "1");

  const { data: movie, isLoading: movieLoading } = useQuery({
    queryKey: ["movie", itemId],
    queryFn: () => tmdb.getMovieDetails(itemId),
    enabled: !!itemId && !isTV,
  });

  const { data: show, isLoading: showLoading } = useQuery({
    queryKey: ["tv", itemId],
    queryFn: () => tmdb.getTVDetails(itemId),
    enabled: !!itemId && isTV,
  });

  const isLoading = isTV ? showLoading : movieLoading;
  const item = isTV ? show : movie;
  const title = isTV ? (show?.name || "") : (movie?.title || "");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 container mx-auto px-4">
          <div className="aspect-video bg-card animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Content not found</p>
      </div>
    );
  }

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const detailsLink = isTV ? `/tv/${itemId}-${slug}` : `/movie/${itemId}-${slug}`;

  return (
    <>
      <SEOHead
        title={`Watch ${title}${isTV ? ` S${season}E${episode}` : ""} - Free HD Streaming`}
        description={`Watch ${title} online for free in HD quality. ${item.overview?.slice(0, 100)}...`}
        image={getBackdropUrl(item.backdrop_path)}
        type={isTV ? "video.tv_show" : "video.movie"}
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 pt-20">
          <div className="container mx-auto px-4 py-8">
            {/* Back Button */}
            <Link to={detailsLink} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Details
            </Link>

            {/* Player */}
            <div className="mb-8">
              <VideoPlayer
                id={itemId}
                type={isTV ? "tv" : "movie"}
                season={isTV ? season : undefined}
                episode={isTV ? episode : undefined}
                title={title}
              />
            </div>

            {/* Movie Info */}
            <div className="flex flex-col md:flex-row gap-6 mb-8 p-6 rounded-lg bg-card">
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                  {title}
                  {isTV && (
                    <span className="text-lg font-normal text-muted-foreground ml-2">
                      Season {season}, Episode {episode}
                    </span>
                  )}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
                  <div className="rating-badge high">
                    <Star className="w-3 h-3" fill="currentColor" />
                    {item.vote_average?.toFixed(1)}
                  </div>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {isTV ? show?.first_air_date : movie?.release_date}
                  </span>
                  {!isTV && movie?.runtime && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                    </span>
                  )}
                </div>

                <p className="text-muted-foreground line-clamp-3 mb-4">
                  {item.overview}
                </p>

                <Link to={detailsLink}>
                  <Button variant="cinema" size="sm" className="gap-2">
                    <Info className="w-4 h-4" />
                    More Info
                  </Button>
                </Link>
              </div>
            </div>

            {/* Episode Navigation for TV */}
            {isTV && show?.seasons && (
              <div className="mb-8 p-6 rounded-lg bg-card">
                <h3 className="font-semibold text-foreground mb-4">More Episodes</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((ep) => (
                    <Link
                      key={ep}
                      to={`/watch/tv/${itemId}-${slug}?s=${season}&e=${ep}`}
                    >
                      <Button
                        variant={ep === episode ? "default" : "cinema"}
                        size="sm"
                      >
                        E{ep}
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Similar */}
            {!isTV && movie?.similar?.results && movie.similar.results.length > 0 && (
              <MovieRow
                title="You May Also Like"
                items={movie.similar.results}
                type="movie"
              />
            )}

            {isTV && show?.similar?.results && show.similar.results.length > 0 && (
              <MovieRow
                title="Similar Shows"
                items={show.similar.results}
                type="tv"
              />
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
