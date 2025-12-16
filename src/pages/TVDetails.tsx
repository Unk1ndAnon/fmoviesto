import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tmdb, getImageUrl, getBackdropUrl } from "@/lib/tmdb";
import { slugToTitle, generateSlug, getWatchTVUrl, getTVShowUrl } from "@/lib/slug";
import { generateTVKeywords } from "@/lib/seo-keywords";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MovieRow } from "@/components/movie/MovieRow";
import { SEOHead } from "@/components/seo/SEOHead";
import { TVShowJsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Star, Calendar, Film } from "lucide-react";

export default function TVDetails() {
  const { slug } = useParams<{ slug: string }>();
  const searchTitle = slugToTitle(slug || "");
  const [selectedSeason, setSelectedSeason] = useState(1);

  // Search for TV show by title to get TMDB ID
  const { data: searchResult, isLoading: isSearching } = useQuery({
    queryKey: ["tvSearch", searchTitle],
    queryFn: () => tmdb.searchTVByTitle(searchTitle),
    enabled: !!searchTitle,
  });

  // Fetch full TV details once we have the ID
  const { data: show, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["tv", searchResult?.id],
    queryFn: () => tmdb.getTVDetails(searchResult!.id),
    enabled: !!searchResult?.id,
  });

  const { data: seasonData } = useQuery({
    queryKey: ["tvSeason", searchResult?.id, selectedSeason],
    queryFn: () => tmdb.getSeasonDetails(searchResult!.id, selectedSeason),
    enabled: !!searchResult?.id && selectedSeason > 0,
  });

  const isLoading = isSearching || isLoadingDetails;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="h-[60vh] bg-card animate-pulse" />
      </div>
    );
  }

  if (!show) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">TV Show not found</p>
      </div>
    );
  }

  const showSlug = generateSlug(show.name);

  const trailer = show.videos?.results?.find(
    (v) => v.type === "Trailer" && v.site === "YouTube"
  );

  const cast = show.credits?.cast?.slice(0, 8) || [];
  const seasons = show.seasons?.filter((s) => s.season_number > 0) || [];

  const seoKeywords = generateTVKeywords({
    title: show.name,
    year: show.first_air_date?.split("-")[0],
    genres: show.genres?.map(g => g.name) || [],
    cast: cast.map(c => c.name),
    seasons: show.number_of_seasons,
    latestSeason: show.number_of_seasons,
  });

  return (
    <>
      <SEOHead
        title={`${show.name} (${show.first_air_date?.split("-")[0]})`}
        description={show.overview}
        image={getBackdropUrl(show.backdrop_path)}
        type="video.tv_show"
        keywords={seoKeywords}
      />
      <TVShowJsonLd show={show} />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        {/* Hero */}
        <section className="relative min-h-[60vh] md:min-h-[70vh]">
          {show.backdrop_path && (
            <>
              <img
                src={getBackdropUrl(show.backdrop_path)}
                alt={show.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 hero-gradient" />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
            </>
          )}

          <div className="relative container mx-auto px-4 pt-32 pb-12">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Poster with Play Button */}
              <Link to={getWatchTVUrl(show.name, 1, 1)} className="flex-shrink-0 relative group/poster">
                <img
                  src={getImageUrl(show.poster_path, "w342")}
                  alt={show.name}
                  className="w-48 md:w-64 rounded-lg shadow-2xl mx-auto md:mx-0 transition-transform duration-300 group-hover/poster:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 group-hover/poster:opacity-100 transition-opacity duration-300 rounded-lg">
                  <div className="w-16 h-16 rounded-full bg-primary/90 backdrop-blur flex items-center justify-center">
                    <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
                  </div>
                </div>
              </Link>

              {/* Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-2">
                    {show.name}
                  </h1>
                  {show.tagline && (
                    <p className="text-lg text-muted-foreground italic">
                      "{show.tagline}"
                    </p>
                  )}
                </div>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="rating-badge high">
                    <Star className="w-3 h-3" fill="currentColor" />
                    {show.vote_average?.toFixed(1)}
                  </div>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Film className="w-4 h-4" />
                    {show.number_of_seasons} Seasons
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {show.first_air_date}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs">
                    {show.status}
                  </span>
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-2">
                  {show.genres?.map((genre) => (
                    <Link
                      key={genre.id}
                      to={`/tv?genre=${genre.id}`}
                      className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      {genre.name}
                    </Link>
                  ))}
                </div>

                {/* Overview */}
                <p className="text-muted-foreground leading-relaxed max-w-2xl">
                  {show.overview}
                </p>

                {/* Actions */}
                <div className="flex flex-wrap gap-4 pt-4">
                  <Link to={getWatchTVUrl(show.name, 1, 1)}>
                    <Button variant="hero" size="lg" className="gap-2">
                      <Play className="w-5 h-5" fill="currentColor" />
                      Watch Now
                    </Button>
                  </Link>
                  {trailer && (
                    <a
                      href={`https://www.youtube.com/watch?v=${trailer.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="glass" size="lg" className="gap-2">
                        <Play className="w-5 h-5" />
                        Watch Trailer
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Episodes */}
        <section className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-foreground">Episodes</h2>
            <Select
              value={String(selectedSeason)}
              onValueChange={(v) => setSelectedSeason(parseInt(v))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Season" />
              </SelectTrigger>
              <SelectContent>
                {seasons.map((season) => (
                  <SelectItem key={season.season_number} value={String(season.season_number)}>
                    Season {season.season_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {seasonData?.episodes?.map((episode) => (
              <Link
                key={episode.id}
                to={getWatchTVUrl(show.name, selectedSeason, episode.episode_number)}
                className="flex gap-4 p-4 rounded-lg bg-card hover:bg-cinema-hover transition-colors group"
              >
                <div className="flex-shrink-0 w-40 aspect-video rounded overflow-hidden bg-secondary">
                  {episode.still_path ? (
                    <img
                      src={getImageUrl(episode.still_path, "w300")}
                      alt={episode.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Film className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-muted-foreground">
                      E{episode.episode_number}
                    </span>
                    {episode.vote_average > 0 && (
                      <div className="rating-badge text-[10px]">
                        <Star className="w-2 h-2" fill="currentColor" />
                        {episode.vote_average.toFixed(1)}
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {episode.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {episode.overview || "No description available."}
                  </p>
                  {episode.runtime && (
                    <span className="text-xs text-muted-foreground mt-2 inline-block">
                      {episode.runtime} min
                    </span>
                  )}
                </div>
                <div className="flex items-center">
                  <Play className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Cast */}
        {cast.length > 0 && (
          <section className="container mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Cast</h2>
            <div className="flex flex-wrap gap-2">
              {cast.map((person) => {
                const actorSlug = generateSlug(person.name);
                return (
                  <Link
                    key={person.id}
                    to={`/actor/${actorSlug}`}
                    className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {person.name}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Similar */}
        <section className="container mx-auto px-4">
          {show.similar?.results && show.similar.results.length > 0 && (
            <MovieRow
              title="Similar Shows"
              items={show.similar.results}
              type="tv"
            />
          )}
        </section>

        <Footer />
      </div>
    </>
  );
}
