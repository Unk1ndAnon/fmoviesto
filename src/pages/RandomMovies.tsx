import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { MovieGrid } from "@/components/movie/MovieGrid";
import { Shuffle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RandomMovies() {
  const [randomPage, setRandomPage] = useState(() => Math.floor(Math.random() * 500) + 1);

  const { data, isLoading } = useQuery({
    queryKey: ["randomMovies", randomPage],
    queryFn: () => tmdb.getPopular(randomPage),
  });

  const handleShuffle = () => {
    const newPage = Math.floor(Math.random() * 500) + 1;
    setRandomPage(newPage);
  };

  return (
    <>
      <SEOHead
        title="Random Movies - Fmovies"
        description="Discover random movies to watch. Let fate decide your next movie night with our random movie picker."
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 pt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Shuffle className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold">Random Movies</h1>
              </div>
              <Button onClick={handleShuffle} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Shuffle
              </Button>
            </div>

            <p className="text-muted-foreground mb-8">
              Can't decide what to watch? Let us pick some random movies for you!
            </p>

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[2/3] bg-card rounded-lg" />
                    <div className="h-4 bg-card rounded mt-2 w-3/4" />
                  </div>
                ))}
              </div>
            ) : (
              <MovieGrid items={data?.results || []} type="movie" />
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
