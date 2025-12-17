import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";

// Lazy load all other pages for code splitting
const Movies = lazy(() => import("./pages/Movies"));
const TVShows = lazy(() => import("./pages/TVShows"));
const MovieDetails = lazy(() => import("./pages/MovieDetails"));
const TVDetails = lazy(() => import("./pages/TVDetails"));
const Watch = lazy(() => import("./pages/Watch"));
const Search = lazy(() => import("./pages/Search"));
const Admin = lazy(() => import("./pages/Admin"));
const ActorMovies = lazy(() => import("./pages/ActorMovies"));
const Privacy = lazy(() => import("./pages/Privacy"));
const DMCA = lazy(() => import("./pages/DMCA"));
const Terms = lazy(() => import("./pages/Terms"));
const Sitemap = lazy(() => import("./pages/Sitemap"));
const SitemapXml = lazy(() => import("./pages/SitemapXml"));
const Auth = lazy(() => import("./pages/Auth"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Watchlist = lazy(() => import("./pages/Watchlist"));
const PopularPeople = lazy(() => import("./pages/PopularPeople"));
const RandomMovies = lazy(() => import("./pages/RandomMovies"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/movies" element={<Movies />} />
              <Route path="/tv" element={<TVShows />} />
              <Route path="/movie/:slug" element={<MovieDetails />} />
              <Route path="/tvshow/:slug" element={<TVDetails />} />
              <Route path="/watch/:slug" element={<Watch />} />
              <Route path="/watch/:slug/:seasonEpisode" element={<Watch />} />
              <Route path="/search" element={<Search />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/actor/:id" element={<ActorMovies />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/people" element={<PopularPeople />} />
              <Route path="/random" element={<RandomMovies />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/dmca" element={<DMCA />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/sitemap" element={<Sitemap />} />
              <Route path="/sitemap.xml" element={<SitemapXml />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
