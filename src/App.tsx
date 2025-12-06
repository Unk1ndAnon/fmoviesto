import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Movies from "./pages/Movies";
import TVShows from "./pages/TVShows";
import MovieDetails from "./pages/MovieDetails";
import TVDetails from "./pages/TVDetails";
import Watch from "./pages/Watch";
import Search from "./pages/Search";
import Admin from "./pages/Admin";
import ActorMovies from "./pages/ActorMovies";
import Privacy from "./pages/Privacy";
import DMCA from "./pages/DMCA";
import Terms from "./pages/Terms";
import Sitemap from "./pages/Sitemap";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/tv" element={<TVShows />} />
          <Route path="/movie/:id" element={<MovieDetails />} />
          <Route path="/tv/:id" element={<TVDetails />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/watch/tv/:id" element={<Watch />} />
          <Route path="/search" element={<Search />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/actor/:id" element={<ActorMovies />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/dmca" element={<DMCA />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/sitemap" element={<Sitemap />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
