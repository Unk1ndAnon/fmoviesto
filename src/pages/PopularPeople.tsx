import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { tmdb, getImageUrl } from "@/lib/tmdb";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/seo/InternalLinks";
import { Link } from "react-router-dom";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PopularPeople() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["popularPeople", page],
    queryFn: () => tmdb.getPopularPeople(page),
  });

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Popular People" },
  ];

  return (
    <>
      <SEOHead
        title="Popular People - Fmovies"
        description="Discover popular actors, actresses, and celebrities. Browse their filmography and find movies and TV shows they've appeared in."
      />
      <BreadcrumbJsonLd items={breadcrumbs} />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 pt-20">
          <div className="container mx-auto px-4 py-8">
            <Breadcrumbs items={breadcrumbs} />
            
            <div className="flex items-center gap-3 mb-8 mt-4">
              <Users className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">Popular People</h1>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[2/3] bg-card rounded-lg" />
                    <div className="h-4 bg-card rounded mt-2 w-3/4" />
                    <div className="h-3 bg-card rounded mt-1 w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {data?.results?.map((person) => (
                    <Link
                      key={person.id}
                      to={`/actor/${person.id}`}
                      className="group"
                    >
                      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-card relative">
                        {person.profile_path ? (
                          <img
                            src={getImageUrl(person.profile_path, "w780")}
                            alt={person.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Users className="w-12 h-12" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h3 className="mt-2 font-medium text-sm group-hover:text-primary transition-colors line-clamp-1">
                        {person.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {person.known_for_department}
                      </p>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-center gap-4 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
