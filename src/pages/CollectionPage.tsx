import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { CollectionJsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/seo/InternalLinks";
import { MovieCard } from "@/components/movie/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useCollectionMovies } from "@/hooks/useCollections";
import { tmdb, Movie } from "@/lib/tmdb";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";

type SortOption = "popularity" | "rating" | "year-desc" | "year-asc" | "title";

interface MovieWithDetails extends Movie {
  _loadedFromTmdb?: boolean;
}

export default function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const [sortBy, setSortBy] = useState<SortOption>("popularity");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [displayCount, setDisplayCount] = useState(24);

  const { data: collection, isLoading: collectionLoading } = useCollection(slug);
  const { data: collectionMovies, isLoading: moviesLoading } = useCollectionMovies(collection?.id);

  // Fetch movie genres
  const { data: genres } = useQuery({
    queryKey: ["movie-genres"],
    queryFn: () => tmdb.getMovieGenres(),
  });

  // Fetch movie details from TMDB
  const { data: movies, isLoading: detailsLoading } = useQuery({
    queryKey: ["collection-details", collectionMovies],
    queryFn: async () => {
      if (!collectionMovies || collectionMovies.length === 0) return [];
      
      const moviePromises = collectionMovies.map(async (cm) => {
        try {
          const movie = await tmdb.getMovieDetails(cm.tmdb_id);
          return { ...movie, _featured: cm.is_featured } as MovieWithDetails & { _featured: boolean };
        } catch {
          return null;
        }
      });
      
      const results = await Promise.all(moviePromises);
      return results.filter((m): m is MovieWithDetails & { _featured: boolean } => m !== null);
    },
    enabled: !!collectionMovies && collectionMovies.length > 0,
  });

  // Extract unique years for filter
  const years = useMemo(() => {
    if (!movies) return [];
    const yearSet = new Set<number>();
    movies.forEach((m) => {
      const year = new Date(m.release_date).getFullYear();
      if (year && !isNaN(year)) yearSet.add(year);
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [movies]);

  // Filter and sort movies
  const filteredMovies = useMemo(() => {
    if (!movies) return [];

    let result = [...movies];

    // Apply filters
    if (yearFilter !== "all") {
      result = result.filter((m) => {
        const year = new Date(m.release_date).getFullYear();
        return String(year) === yearFilter;
      });
    }

    if (genreFilter !== "all") {
      result = result.filter((m) => 
        m.genres?.some((g) => String(g.id) === genreFilter)
      );
    }

    if (ratingFilter !== "all") {
      const minRating = parseFloat(ratingFilter);
      result = result.filter((m) => m.vote_average >= minRating);
    }

    // Apply sorting
    switch (sortBy) {
      case "popularity":
        result.sort((a, b) => b.vote_count - a.vote_count);
        break;
      case "rating":
        result.sort((a, b) => b.vote_average - a.vote_average);
        break;
      case "year-desc":
        result.sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime());
        break;
      case "year-asc":
        result.sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime());
        break;
      case "title":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return result;
  }, [movies, sortBy, yearFilter, genreFilter, ratingFilter]);

  const displayedMovies = filteredMovies.slice(0, displayCount);
  const hasMore = displayCount < filteredMovies.length;

  const isLoading = collectionLoading || moviesLoading || detailsLoading;

  if (collectionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-6 w-96 mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-lg">
                <Skeleton className="w-full h-full" />
              </div>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Collection Not Found</h1>
          <p className="text-muted-foreground mb-8">The collection you're looking for doesn't exist.</p>
          <Link to="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const seoTitle = collection.seo_title || `${collection.name} - Watch Free Online`;
  const seoDescription = collection.seo_description || collection.description || `Watch the best ${collection.name.toLowerCase()} for free. Stream ${movies?.length || 0}+ movies online in HD quality with no signup required.`;
  const canonicalUrl = `https://fmov.online/collection/${collection.slug}`;
  const coverImage = collection.cover_image || (movies?.[0]?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movies[0].backdrop_path}` : undefined);

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Collections", href: "/collections" },
    { label: collection.name },
  ];

  return (
    <>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        url={canonicalUrl}
        image={coverImage}
        type="website"
        keywords={`${collection.name}, ${collection.name.toLowerCase()} movies, watch ${collection.name.toLowerCase()} online free, stream ${collection.name.toLowerCase()}, best ${collection.name.toLowerCase()} movies`}
      />
      <CollectionJsonLd 
        name={seoTitle}
        description={seoDescription}
        image={coverImage}
        url={canonicalUrl}
        breadcrumbs={breadcrumbs}
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 container mx-auto px-4 py-8">
          {/* Breadcrumbs for SEO */}
          <Breadcrumbs items={breadcrumbs} />

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
              {slug === "christmas-movies" && <span>🎄</span>}
              {collection.name}
            </h1>
            {collection.description && (
              <p className="text-muted-foreground text-lg max-w-3xl">{collection.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {filteredMovies.length} {filteredMovies.length === 1 ? "movie" : "movies"}
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-8 items-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popularity">Popularity</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="year-desc">Newest First</SelectItem>
                <SelectItem value="year-asc">Oldest First</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
              </SelectContent>
            </Select>

            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={genreFilter} onValueChange={setGenreFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {genres?.genres?.map((genre) => (
                  <SelectItem key={genre.id} value={String(genre.id)}>{genre.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="8">8+ ⭐</SelectItem>
                <SelectItem value="7">7+ ⭐</SelectItem>
                <SelectItem value="6">6+ ⭐</SelectItem>
                <SelectItem value="5">5+ ⭐</SelectItem>
              </SelectContent>
            </Select>

            {(yearFilter !== "all" || genreFilter !== "all" || ratingFilter !== "all") && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setYearFilter("all");
                  setGenreFilter("all");
                  setRatingFilter("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Movie Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {detailsLoading ? (
              Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-lg">
                  <Skeleton className="w-full h-full" />
                </div>
              ))
            ) : (
              displayedMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  item={movie}
                  type="movie"
                  className="w-full"
                />
              ))
            )}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={() => setDisplayCount((prev) => prev + 24)}
                variant="outline"
                size="lg"
              >
                Load More ({filteredMovies.length - displayCount} remaining)
              </Button>
            </div>
          )}

          {/* Internal Links */}
          <div className="mt-12 border-t border-border pt-8">
            <h2 className="text-lg font-semibold mb-4">Related Collections</h2>
            <div className="flex flex-wrap gap-2">
              <Link to="/movies" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                All Movies
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/genres" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Browse by Genre
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/tags" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Browse by Tags
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
