import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tmdb, getImageUrl, Movie, TVShow } from "@/lib/tmdb";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MovieCard } from "@/components/movie/MovieCard";
import { SEOHead } from "@/components/seo/SEOHead";

export default function ActorMovies() {
  const { slug } = useParams<{ slug: string }>();
  
  // Check if slug is a numeric ID (from PopularPeople page)
  const personId = slug && /^\d+$/.test(slug) ? parseInt(slug, 10) : null;

  const { data: person, isLoading: personLoading } = useQuery({
    queryKey: ["person", personId],
    queryFn: () => tmdb.getPersonDetails(personId!),
    enabled: !!personId,
  });

  const { data: credits, isLoading: creditsLoading } = useQuery({
    queryKey: ["personCredits", personId],
    queryFn: () => tmdb.getPersonCredits(personId!),
    enabled: !!personId,
  });

  const isLoading = personLoading || creditsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24">
          <div className="h-48 bg-card animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Person not found</p>
      </div>
    );
  }

  const movies = credits?.cast?.filter((c) => c.media_type === "movie" && c.poster_path) || [];
  const tvShows = credits?.cast?.filter((c) => c.media_type === "tv" && c.poster_path) || [];

  return (
    <>
      <SEOHead
        title={`${person.name} - Movies & TV Shows`}
        description={person.biography?.slice(0, 160) || `Explore movies and TV shows featuring ${person.name}`}
        image={getImageUrl(person.profile_path, "w500")}
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
          {/* Actor Info */}
          <div className="flex items-center gap-6 mb-8">
            {person.profile_path && (
              <img
                src={getImageUrl(person.profile_path, "w185")}
                alt={person.name}
                className="w-24 h-24 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-foreground">{person.name}</h1>
              {person.known_for_department && (
                <p className="text-muted-foreground">{person.known_for_department}</p>
              )}
            </div>
          </div>

          {/* Movies */}
          {movies.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-foreground mb-4">Movies ({movies.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {movies.slice(0, 18).map((item) => (
                  <MovieCard
                    key={item.id}
                    item={{
                      id: item.id,
                      title: item.title || "",
                      original_title: item.title || "",
                      overview: "",
                      poster_path: item.poster_path,
                      backdrop_path: null,
                      release_date: item.release_date || "",
                      vote_average: item.vote_average,
                      vote_count: 0,
                    } as Movie}
                    type="movie"
                  />
                ))}
              </div>
            </section>
          )}

          {/* TV Shows */}
          {tvShows.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">TV Shows ({tvShows.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {tvShows.slice(0, 18).map((item) => (
                  <MovieCard
                    key={item.id}
                    item={{
                      id: item.id,
                      name: item.name || "",
                      original_name: item.name || "",
                      overview: "",
                      poster_path: item.poster_path,
                      backdrop_path: null,
                      first_air_date: item.first_air_date || "",
                      vote_average: item.vote_average,
                      vote_count: 0,
                    } as TVShow}
                    type="tv"
                  />
                ))}
              </div>
            </section>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
}
