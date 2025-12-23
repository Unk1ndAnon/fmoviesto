import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTag, useMoviesByTag, useTags } from "@/hooks/useTags";
import { tmdb, getImageUrl, Movie, TVShow } from "@/lib/tmdb";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/seo/InternalLinks";
import { MovieCard } from "@/components/movie/MovieCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Tag as TagIcon, Film, Tv } from "lucide-react";
import { generateTagSEO } from "@/lib/tag-seo";

const PAGE_SIZE = 24;

export default function TagPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1", 10);

  const { data: tag, isLoading: isLoadingTag } = useTag(slug);
  const { data: moviesByTag, isLoading: isLoadingMovies } = useMoviesByTag(
    tag?.id,
    page,
    PAGE_SIZE
  );

  // Fetch actual movie details for each tagged movie
  const { data: movieDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["tagMovieDetails", tag?.id, page, moviesByTag?.movies],
    queryFn: async () => {
      if (!moviesByTag?.movies?.length) return [];
      
      const details = await Promise.all(
        moviesByTag.movies.map(async (m) => {
          try {
            if (m.media_type === "tv") {
              return { ...(await tmdb.getTVDetails(m.tmdb_id)), media_type: "tv" };
            }
            return { ...(await tmdb.getMovieDetails(m.tmdb_id)), media_type: "movie" };
          } catch (e) {
            console.error(`Failed to fetch details for ${m.tmdb_id}:`, e);
            return null;
          }
        })
      );
      
      return details.filter(Boolean);
    },
    enabled: !!moviesByTag?.movies?.length,
  });

  // Related tags (same type)
  const { data: relatedTags } = useTags({
    type: tag?.tag_type,
    minMovieCount: 3,
    limit: 10
  });

  const handlePageChange = (newPage: number) => {
    setSearchParams({ page: String(newPage) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isLoadingTag) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!tag) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Tag not found</h1>
          <p className="text-muted-foreground mb-4">This tag doesn't exist or has no content.</p>
          <Link to="/tags">
            <Button>Browse all tags</Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalPages = moviesByTag?.totalPages || 1;
  const filteredRelatedTags = relatedTags?.filter(t => t.id !== tag.id).slice(0, 8);

  // Auto-generated SEO metadata
  const seo = generateTagSEO({
    name: tag.name,
    tagType: tag.tag_type,
    movieCount: tag.movie_count || 0,
    description: tag.description,
    seoTitle: tag.seo_title,
    seoDescription: tag.seo_description,
  });

  const pageTitle = page > 1 ? `${seo.title} - Page ${page}` : seo.title;

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Tags", href: "/tags" },
    { label: tag.name },
  ];

  return (
    <>
      <SEOHead
        title={pageTitle}
        description={seo.description}
        keywords={seo.keywords}
      />
      <BreadcrumbJsonLd items={breadcrumbs} />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
          {/* Header */}
          <header className="mb-8">
            <Breadcrumbs items={breadcrumbs} />

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <TagIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold capitalize">
                  {tag.name}
                </h1>
                <p className="text-muted-foreground">
                  {tag.movie_count} {tag.movie_count === 1 ? "title" : "titles"} 
                  <span className="mx-2">•</span>
                  <span className="capitalize">{tag.tag_type}</span>
                </p>
              </div>
            </div>

            {tag.description && (
              <p className="text-muted-foreground max-w-2xl mb-6">
                {tag.description}
              </p>
            )}

            {/* Related Tags */}
            {filteredRelatedTags && filteredRelatedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground mr-2">Related:</span>
                {filteredRelatedTags.map((t) => (
                  <Link key={t.id} to={`/tag/${t.slug}`}>
                    <Badge variant="secondary" className="capitalize hover:bg-primary hover:text-primary-foreground transition-colors">
                      {t.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </header>

          {/* Movies Grid */}
          {isLoadingDetails ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : movieDetails && movieDetails.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {movieDetails.map((item: any) => (
                  <MovieCard
                    key={`${item.media_type}-${item.id}`}
                    item={item}
                    type={item.media_type as "movie" | "tv"}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav className="flex justify-center items-center gap-2 mt-12" aria-label="Pagination">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </nav>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No content found for this tag yet.</p>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
}
