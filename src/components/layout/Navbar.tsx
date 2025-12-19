import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, Menu, X, Film, Tv, Home, ChevronDown, TrendingUp, LayoutGrid, Sparkles, Play, Calendar, Star, Clapperboard, Users, Shuffle, Heart, Bookmark, LogIn, LogOut, User, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { tmdb, Genre, getImageUrl } from "@/lib/tmdb";
import { useAuth } from "@/contexts/AuthContext";
import { adminAuth } from "@/lib/admin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

function UserMenu() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      adminAuth.isAuthenticated().then(setIsAdmin);
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  if (loading) {
    return <div className="w-9 h-9 rounded-full bg-secondary animate-pulse" />;
  }

  if (!user) {
    return (
      <Link to="/auth">
        <Button variant="ghost" size="sm" className="gap-2">
          <LogIn className="w-4 h-4" />
          <span className="hidden sm:inline">Sign In</span>
        </Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <User className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link to="/profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            My Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/favorites" className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            My Favorites
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/watchlist" className="flex items-center gap-2">
            <Bookmark className="w-4 h-4" />
            My Watchlist
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/admin" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Admin Panel
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut()}
          className="flex items-center gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const movieCategories = [
  { title: "Discover", description: "Uncover hidden gems and new releases in the world of cinema.", href: "/movies", icon: Sparkles, isNew: true },
  { title: "Popular", description: "Dive into the world of popular movies that have captured hearts.", href: "/movies?category=popular", icon: TrendingUp },
  { title: "Now Playing", description: "Catch the latest movies now playing in theaters near you.", href: "/movies?category=now-playing", icon: Play },
  { title: "Upcoming", description: "Be the first to watch the latest movies before they hit big screen.", href: "/movies?category=upcoming", icon: Calendar },
  { title: "Top Rated", description: "Explore the pinnacle of cinematic excellence with our collection.", href: "/movies?category=top-rated", icon: Star },
  { title: "Anime", description: "Embark on an epic journey with our handpicked collection of anime.", href: "/movies?genre=16", icon: Clapperboard },
];

const tvCategories = [
  { title: "Discover", description: "Unearth new TV shows and hidden gems in television.", href: "/tv", icon: Sparkles, isNew: true },
  { title: "Popular", description: "Dive into the world of popular TV shows that captured hearts.", href: "/tv?category=popular", icon: TrendingUp },
  { title: "Trending", description: "Don't miss out on the latest trending shows everyone's watching.", href: "/tv?category=trending", icon: Play },
  { title: "Top Rated", description: "Explore the pinnacle of television excellence with top picks.", href: "/tv?category=top-rated", icon: Star },
  { title: "Anime TV Shows", description: "Dive into the vast world of anime series, from hits to classics.", href: "/tv?genre=16", icon: Clapperboard },
];

const trendingCategories = [
  { title: "Movies", description: "Stay on the pulse of what's hot in the movie scene.", href: "/movies?category=trending", icon: Film },
  { title: "Shows", description: "Catch up with the world and see what TV shows are trending.", href: "/tv?category=trending", icon: Tv },
];

const streamingServices = [
  { title: "Netflix", description: "Dive into Netflix's vast library of original series, blockbuster movies.", href: "/movies?network=213", icon: "N" },
  { title: "Disney", description: "Enter the enchanting world of Disney Plus, where you can find favorites.", href: "/movies?network=2739", icon: "D" },
  { title: "Apple TV+", description: "Discover Apple TV+'s lineup of critically acclaimed series.", href: "/movies?network=2552", icon: "A" },
  { title: "Amazon Prime", description: "Explore Amazon Prime's diverse offerings, including exclusives.", href: "/movies?network=1024", icon: "P" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { data: movieGenres } = useQuery({
    queryKey: ["movieGenres"],
    queryFn: tmdb.getMovieGenres,
  });

  const { data: tvGenres } = useQuery({
    queryKey: ["tvGenres"],
    queryFn: tmdb.getTVGenres,
  });

  

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled ? "glass border-b border-border/50" : "bg-gradient-to-b from-background/80 to-transparent"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Logo />

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center">
            <NavigationMenu>
              <NavigationMenuList>
                {/* Home */}
                <NavigationMenuItem>
                  <Link to="/">
                    <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                      <Home className="w-4 h-4 mr-2" />
                      Home
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>

                {/* Movies */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent">
                    <Film className="w-4 h-4 mr-2" />
                    Movies
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[600px] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Film className="w-5 h-5" />
                        <h3 className="font-semibold">Movies</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Embark on a cinematic adventure with our vast collection of movies. From timeless classics to the latest blockbusters.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {movieCategories.map((category) => (
                          <Link
                            key={category.title}
                            to={category.href}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary transition-colors group"
                          >
                            <category.icon className="w-5 h-5 mt-0.5 text-muted-foreground group-hover:text-primary" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{category.title}</span>
                                {category.isNew && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-primary text-primary-foreground">NEW</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{category.description}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                      <div className="border-t border-border mt-4 pt-4">
                        <div className="grid grid-cols-2 gap-2">
                          {streamingServices.slice(0, 2).map((service) => (
                            <Link
                              key={service.title}
                              to={service.href}
                              className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary transition-colors group"
                            >
                              <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-xs font-bold">
                                {service.icon}
                              </div>
                              <div>
                                <span className="font-medium text-sm">{service.title}</span>
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{service.description}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* TV Shows */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent">
                    <Tv className="w-4 h-4 mr-2" />
                    Shows
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[600px] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Tv className="w-5 h-5" />
                        <h3 className="font-semibold">Shows</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Embark on a journey through the world of TV shows. From the latest hits to timeless classics.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {tvCategories.map((category) => (
                          <Link
                            key={category.title}
                            to={category.href}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary transition-colors group"
                          >
                            <category.icon className="w-5 h-5 mt-0.5 text-muted-foreground group-hover:text-primary" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{category.title}</span>
                                {category.isNew && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-primary text-primary-foreground">NEW</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{category.description}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                      <div className="border-t border-border mt-4 pt-4">
                        <div className="grid grid-cols-2 gap-2">
                          {streamingServices.slice(2, 4).map((service) => (
                            <Link
                              key={service.title}
                              to={service.href}
                              className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary transition-colors group"
                            >
                              <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-xs font-bold">
                                {service.icon}
                              </div>
                              <div>
                                <span className="font-medium text-sm">{service.title}</span>
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{service.description}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Trending */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Trending
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[400px] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-5 h-5" />
                        <h3 className="font-semibold">Trending</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Stay in the know with the latest trends in movies and TV shows. Discover what's popular.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {trendingCategories.map((category) => (
                          <Link
                            key={category.title}
                            to={category.href}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary transition-colors group"
                          >
                            <category.icon className="w-5 h-5 mt-0.5 text-muted-foreground group-hover:text-primary" />
                            <div>
                              <span className="font-medium text-sm">{category.title}</span>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{category.description}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* More */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent">
                    <LayoutGrid className="w-4 h-4 mr-2" />
                    More
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[600px] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <LayoutGrid className="w-5 h-5" />
                        <h3 className="font-semibold">More</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Explore additional features and content to enhance your entertainment experience.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          to="/people"
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary transition-colors group"
                        >
                          <Users className="w-5 h-5 mt-0.5 text-muted-foreground group-hover:text-primary" />
                          <div>
                            <span className="font-medium text-sm">Popular People</span>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">Discover popular actors, actresses, and celebrities in the entertainment industry.</p>
                          </div>
                        </Link>
                        <Link
                          to="/random"
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary transition-colors group"
                        >
                          <Shuffle className="w-5 h-5 mt-0.5 text-muted-foreground group-hover:text-primary" />
                          <div>
                            <span className="font-medium text-sm">Random Movies</span>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">Can't decide what to watch? Let us pick some random movies for you!</p>
                          </div>
                        </Link>
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-2">
            {/* Desktop Search */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 lg:w-64 pl-10 bg-secondary/50 border-border/50 focus:bg-secondary"
                />
              </div>
            </form>

            {/* User Menu */}
            <UserMenu />

            {/* Mobile Search Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              <Search className="w-5 h-5" />
            </Button>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Search */}
        {isSearchOpen && (
          <div className="md:hidden py-4 border-t border-border/50 animate-fade-in">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search movies, TV shows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 bg-secondary border-border"
                  autoFocus
                />
              </div>
            </form>
          </div>
        )}

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border/50 animate-fade-in max-h-[80vh] overflow-y-auto">
            <div className="flex flex-col gap-1">
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === "/"
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Home className="w-5 h-5" />
                Home
              </Link>
              
              <Link
                to="/movies"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === "/movies"
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Film className="w-5 h-5" />
                Movies
              </Link>
              
              <Link
                to="/tv"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === "/tv"
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Tv className="w-5 h-5" />
                TV Shows
              </Link>
              
              {/* Mobile Genres */}
              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Movie Genres</p>
                <div className="flex flex-wrap gap-2">
                  {movieGenres?.genres?.slice(0, 8).map((genre) => (
                    <Button
                      key={genre.id}
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        navigate(`/movies?genre=${genre.id}`);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      {genre.name}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">TV Genres</p>
                <div className="flex flex-wrap gap-2">
                  {tvGenres?.genres?.slice(0, 8).map((genre) => (
                    <Button
                      key={genre.id}
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        navigate(`/tv?genre=${genre.id}`);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      {genre.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}