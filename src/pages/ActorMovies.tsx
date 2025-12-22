import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tmdb, getImageUrl, Movie, TVShow } from "@/lib/tmdb";
import { slugToTitle } from "@/lib/slug";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MovieCard } from "@/components/movie/MovieCard";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Film, Tv, User, Calendar, MapPin, ChevronDown, ChevronUp } from "lucide-react";

export default function ActorMovies() {
  const { id } = useParams<{ id: string }>();
  const [showFullBio, setShowFullBio] = useState(false);
  
  // Check if id is numeric (direct ID) or a slug (name-based)
  const isNumericId = id && /^\d+$/.test(id);
  const directPersonId = isNumericId ? parseInt(id, 10) : null;
  const searchName = !isNumericId && id ? slugToTitle(id) : null;

  // Search for person by name if we have a slug
  const { data: searchResult } = useQuery({
    queryKey: ["personSearch", searchName],
    queryFn: () => tmdb.searchPerson(searchName!),
    enabled: !!searchName,
  });

  const personId = directPersonId || searchResult?.id;

  const { data: person, isLoading: personLoading } = useQuery({
    queryKey: ["personFull", personId],
    queryFn: () => tmdb.getPersonFull(personId!),
    enabled: !!personId,
  });

  const { data: credits, isLoading: creditsLoading } = useQuery({
    queryKey: ["personCredits", personId],
    queryFn: () => tmdb.getPersonCredits(personId!),
    enabled: !!personId,
  });

  const isLoading = personLoading || creditsLoading;

  // Show loading state
  if (isLoading || (!directPersonId && searchName && !searchResult)) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-48 h-72 bg-card animate-pulse rounded-xl shrink-0" />
            <div className="flex-1 space-y-4">
              <div className="h-10 w-64 bg-card animate-pulse rounded" />
              <div className="h-6 w-32 bg-card animate-pulse rounded" />
              <div className="h-24 w-full bg-card animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show not found when data fetch completed with no result
  if (!person) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Person not found</p>
        </div>
        <Footer />
      </div>
    );
  }

  // Separate cast and crew credits
  const castMovies = credits?.cast?.filter((c) => c.media_type === "movie" && c.poster_path) || [];
  const castTV = credits?.cast?.filter((c) => c.media_type === "tv" && c.poster_path) || [];
  
  // Sort by popularity/vote average
  const sortedCastMovies = [...castMovies].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
  const sortedCastTV = [...castTV].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const calculateAge = (birthday?: string, deathday?: string) => {
    if (!birthday) return null;
    const birth = new Date(birthday);
    const end = deathday ? new Date(deathday) : new Date();
    let age = end.getFullYear() - birth.getFullYear();
    const m = end.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(person.birthday, person.deathday);
  const bioPreviewLength = 500;
  const hasBio = person.biography && person.biography.length > 0;
  const bioIsLong = hasBio && person.biography.length > bioPreviewLength;

  return (
    <>
      <SEOHead
        title={`${person.name} - Movies & TV Shows Filmography`}
        description={person.biography?.slice(0, 160) || `Explore the complete filmography of ${person.name}, including movies and TV shows.`}
        image={getImageUrl(person.profile_path, "w780")}
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
          {/* Person Header */}
          <div className="flex flex-col md:flex-row gap-8 mb-12">
            {/* Profile Image */}
            <div className="shrink-0">
              {person.profile_path ? (
                <img
                  src={getImageUrl(person.profile_path, "w500")}
                  alt={person.name}
                  className="w-48 md:w-64 rounded-xl shadow-2xl mx-auto md:mx-0"
                />
              ) : (
                <div className="w-48 md:w-64 aspect-[2/3] rounded-xl bg-muted flex items-center justify-center mx-auto md:mx-0">
                  <User className="w-20 h-20 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Person Info */}
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                {person.name}
              </h1>
              
              {person.known_for_department && (
                <p className="text-lg text-primary mb-4">
                  {person.known_for_department}
                </p>
              )}

              {/* Meta Info */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
                {person.birthday && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {formatDate(person.birthday)}
                      {age && !person.deathday && ` (${age} years old)`}
                    </span>
                  </div>
                )}
                {person.deathday && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground/60">
                      – {formatDate(person.deathday)} ({age} years old)
                    </span>
                  </div>
                )}
                {person.place_of_birth && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{person.place_of_birth}</span>
                  </div>
                )}
              </div>

              {/* Biography */}
              {hasBio && (
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-foreground mb-2">Biography</h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {showFullBio || !bioIsLong 
                      ? person.biography 
                      : `${person.biography.slice(0, bioPreviewLength)}...`}
                  </p>
                  {bioIsLong && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFullBio(!showFullBio)}
                      className="mt-2 gap-1"
                    >
                      {showFullBio ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Read more
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{castMovies.length}</p>
                  <p className="text-muted-foreground">Movies</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{castTV.length}</p>
                  <p className="text-muted-foreground">TV Shows</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filmography Tabs */}
          <Tabs defaultValue="movies" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="movies" className="gap-2">
                <Film className="w-4 h-4" />
                Movies ({castMovies.length})
              </TabsTrigger>
              <TabsTrigger value="tv" className="gap-2">
                <Tv className="w-4 h-4" />
                TV Shows ({castTV.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="movies">
              {sortedCastMovies.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {sortedCastMovies.map((item) => (
                    <MovieCard
                      key={`movie-${item.id}`}
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
              ) : (
                <div className="text-center py-12">
                  <Film className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No movies found</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tv">
              {sortedCastTV.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {sortedCastTV.map((item) => (
                    <MovieCard
                      key={`tv-${item.id}`}
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
              ) : (
                <div className="text-center py-12">
                  <Tv className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No TV shows found</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>

        <Footer />
      </div>
    </>
  );
}
