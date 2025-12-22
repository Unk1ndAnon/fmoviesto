import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { tmdb, getImageUrl } from "@/lib/tmdb";
import { adminStorage, adminAuth, AdminMovie, CustomEmbed } from "@/lib/admin";
import { validateEmbedUrl } from "@/lib/url-validation";
import { useAuth } from "@/contexts/AuthContext";
import { useBatchTagging } from "@/hooks/useTags";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Lock, Search, Plus, Trash2, Film, Tv, ExternalLink, Save, ShieldAlert, Tag, Loader2, Play, CheckCircle, XCircle, Clock } from "lucide-react";

interface EditableMovie {
  id?: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  custom_title?: string;
  custom_description?: string;
  featured?: boolean;
  hidden?: boolean;
  custom_poster?: string;
  custom_backdrop?: string;
  embeds: CustomEmbed[];
}

// AI Tagging Panel Component
function AITaggingPanel() {
  const { queueMovies, processJobs, stats, isLoading } = useBatchTagging();
  const [queueLimit, setQueueLimit] = useState("50");
  const [processLimit, setProcessLimit] = useState("5");

  const handleQueue = async () => {
    try {
      const result = await queueMovies.mutateAsync(parseInt(queueLimit));
      toast.success(`Queued ${result.queued} movies for tagging`);
    } catch (error) {
      toast.error("Failed to queue movies");
    }
  };

  const handleProcess = async () => {
    try {
      const result = await processJobs.mutateAsync(parseInt(processLimit));
      toast.success(`Processed ${result.processed} jobs`);
    } catch (error) {
      toast.error("Failed to process jobs");
    }
  };

  const totalJobs = stats?.jobs ? 
    (stats.jobs.pending || 0) + (stats.jobs.processing || 0) + (stats.jobs.completed || 0) + (stats.jobs.failed || 0) : 0;
  const completedPercent = totalJobs > 0 ? ((stats?.jobs?.completed || 0) / totalJobs) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            AI Tagging Statistics
          </CardTitle>
          <CardDescription>
            Monitor and control AI-powered tag generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Progress Bar */}
              {totalJobs > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Processing Progress</span>
                    <span className="font-medium">{completedPercent.toFixed(0)}%</span>
                  </div>
                  <Progress value={completedPercent} className="h-2" />
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-muted-foreground">Pending</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-500">{stats?.jobs?.pending || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">Processing</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-500">{stats?.jobs?.processing || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Completed</span>
                  </div>
                  <p className="text-2xl font-bold text-green-500">{stats?.jobs?.completed || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-muted-foreground">Failed</span>
                  </div>
                  <p className="text-2xl font-bold text-red-500">{stats?.jobs?.failed || 0}</p>
                </div>
              </div>

              {/* Total Tags */}
              <div className="flex items-center gap-6 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Total Tags</p>
                  <p className="text-xl font-semibold">{stats?.total_tags || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Movie-Tag Links</p>
                  <p className="text-xl font-semibold">{stats?.total_movie_tags || 0}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Queue Movies */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Queue Movies</CardTitle>
            <CardDescription>
              Add movies from admin_movies table to the tagging queue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="queueLimit">Number of movies to queue</Label>
              <Input
                id="queueLimit"
                type="number"
                value={queueLimit}
                onChange={(e) => setQueueLimit(e.target.value)}
                min="1"
                max="500"
              />
            </div>
            <Button 
              onClick={handleQueue}
              disabled={queueMovies.isPending}
              className="w-full gap-2"
            >
              {queueMovies.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Queue Movies
            </Button>
          </CardContent>
        </Card>

        {/* Process Jobs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Process Jobs</CardTitle>
            <CardDescription>
              Run AI tagging on queued movies (uses Lovable AI credits)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="processLimit">Jobs to process per batch</Label>
              <Input
                id="processLimit"
                type="number"
                value={processLimit}
                onChange={(e) => setProcessLimit(e.target.value)}
                min="1"
                max="20"
              />
            </div>
            <Button 
              onClick={handleProcess}
              disabled={processJobs.isPending || (stats?.jobs?.pending || 0) === 0}
              className="w-full gap-2"
              variant="default"
            >
              {processJobs.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Process Jobs
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Browse Tags Link */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Browse Generated Tags</h3>
              <p className="text-sm text-muted-foreground">
                View and manage all AI-generated tags
              </p>
            </div>
            <Link to="/tags">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                View Tags
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"movie" | "tv">("movie");
  const [selectedItem, setSelectedItem] = useState<EditableMovie | null>(null);
  const [managedMovies, setManagedMovies] = useState<AdminMovie[]>([]);

  // New embed form
  const [newEmbed, setNewEmbed] = useState({
    name: "",
    url: "",
    quality: "",
    language: "",
  });

  useEffect(() => {
    const checkAdmin = async () => {
      setIsCheckingAdmin(true);
      const isAdminUser = await adminAuth.isAuthenticated();
      setIsAdmin(isAdminUser);
      
      if (isAdminUser) {
        const movies = await adminStorage.getAll();
        setManagedMovies(movies);
      }
      setIsCheckingAdmin(false);
    };
    
    checkAdmin();
  }, [user]);

  const { data: searchResults } = useQuery({
    queryKey: ["adminSearch", searchQuery, searchType],
    queryFn: async () => {
      if (searchType === "movie") {
        return tmdb.searchMovies(searchQuery);
      }
      return tmdb.searchTV(searchQuery);
    },
    enabled: searchQuery.length > 2 && isAdmin,
  });

  const handleLogout = async () => {
    await adminAuth.logout();
    setIsAdmin(false);
    toast.success("Logged out");
  };

  const handleSelectMovie = async (id: number, type: "movie" | "tv") => {
    const existing = await adminStorage.get(id, type);
    if (existing) {
      setSelectedItem({
        id: existing.id,
        tmdb_id: existing.tmdb_id,
        media_type: existing.media_type,
        custom_title: existing.custom_title,
        custom_description: existing.custom_description,
        featured: existing.featured,
        hidden: existing.hidden,
        custom_poster: existing.custom_poster,
        custom_backdrop: existing.custom_backdrop,
        embeds: existing.embeds || []
      });
    } else {
      setSelectedItem({
        tmdb_id: id,
        media_type: type,
        embeds: [],
      });
    }
  };

  const handleSave = async () => {
    if (!selectedItem) return;

    const saved = await adminStorage.save({
      tmdb_id: selectedItem.tmdb_id,
      media_type: selectedItem.media_type,
      custom_title: selectedItem.custom_title,
      custom_description: selectedItem.custom_description,
      featured: selectedItem.featured,
      hidden: selectedItem.hidden,
      custom_poster: selectedItem.custom_poster,
      custom_backdrop: selectedItem.custom_backdrop
    });

    if (saved) {
      // Save embeds
      for (const embed of selectedItem.embeds) {
        if (!embed.id.includes('-')) {
          // New embed (temp ID)
          await adminStorage.addEmbed(selectedItem.tmdb_id, selectedItem.media_type, {
            name: embed.name,
            url: embed.url,
            quality: embed.quality,
            language: embed.language
          });
        }
      }

      const movies = await adminStorage.getAll();
      setManagedMovies(movies);
      toast.success("Changes saved");
    } else {
      toast.error("Failed to save changes");
    }
  };

  const handleAddEmbed = () => {
    if (!selectedItem || !newEmbed.name || !newEmbed.url) {
      toast.error("Please fill in name and URL");
      return;
    }

    // Validate URL for security
    const validation = validateEmbedUrl(newEmbed.url);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid URL");
      return;
    }

    const tempEmbed: CustomEmbed = {
      id: `temp-${Date.now()}`,
      name: newEmbed.name.trim(),
      url: newEmbed.url.trim(),
      quality: newEmbed.quality?.trim() || undefined,
      language: newEmbed.language?.trim() || undefined,
      created_at: new Date().toISOString(),
    };

    setSelectedItem({
      ...selectedItem,
      embeds: [...selectedItem.embeds, tempEmbed],
    });

    setNewEmbed({ name: "", url: "", quality: "", language: "" });
    toast.success("Embed added (save to persist)");
  };

  const handleRemoveEmbed = async (embedId: string) => {
    if (!selectedItem) return;

    // If it's not a temp ID, delete from database
    if (!embedId.startsWith('temp-')) {
      await adminStorage.removeEmbed(embedId);
    }

    setSelectedItem({
      ...selectedItem,
      embeds: selectedItem.embeds.filter((e) => e.id !== embedId),
    });
  };

  const handleDelete = async (tmdbId: number, type: "movie" | "tv") => {
    const success = await adminStorage.delete(tmdbId, type);
    if (success) {
      const movies = await adminStorage.getAll();
      setManagedMovies(movies);
      if (selectedItem?.tmdb_id === tmdbId) {
        setSelectedItem(null);
      }
      toast.success("Deleted");
    } else {
      toast.error("Failed to delete");
    }
  };

  // Loading state
  if (isCheckingAdmin) {
    return (
      <>
        <SEOHead title="Admin Panel" description="Admin panel" />
        <div className="min-h-screen bg-background">
          <Navbar />
          <main className="pt-20 flex items-center justify-center min-h-[80vh]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Checking permissions...</p>
            </div>
          </main>
        </div>
      </>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <>
        <SEOHead title="Admin Login" description="Admin panel login" />
        <div className="min-h-screen bg-background">
          <Navbar />
          <main className="pt-20 flex items-center justify-center min-h-[80vh]">
            <Card className="w-full max-w-md mx-4">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>Admin Login Required</CardTitle>
                <CardDescription>
                  Please sign in with an admin account to access this panel
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link to="/auth">
                  <Button className="w-full">
                    Sign In
                  </Button>
                </Link>
                <p className="text-xs text-muted-foreground text-center">
                  Only users with admin role can access this panel
                </p>
              </CardContent>
            </Card>
          </main>
        </div>
      </>
    );
  }

  // Not an admin
  if (!isAdmin) {
    return (
      <>
        <SEOHead title="Access Denied" description="Admin access denied" />
        <div className="min-h-screen bg-background">
          <Navbar />
          <main className="pt-20 flex items-center justify-center min-h-[80vh]">
            <Card className="w-full max-w-md mx-4">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <ShieldAlert className="w-8 h-8 text-destructive" />
                </div>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>
                  Your account does not have admin privileges
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Logged in as: {user.email}
                </p>
                <Button variant="outline" className="w-full" onClick={handleLogout}>
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead title="Admin Panel" description="Manage movies and TV shows" />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 pt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
                <p className="text-sm text-muted-foreground mt-1">Logged in as: {user.email}</p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>

            <Tabs defaultValue="search" className="space-y-6">
              <TabsList>
                <TabsTrigger value="search">Search & Add</TabsTrigger>
                <TabsTrigger value="managed">Managed Content ({managedMovies.length})</TabsTrigger>
                <TabsTrigger value="ai-tagging">AI Tagging</TabsTrigger>
              </TabsList>

              {/* Search Tab */}
              <TabsContent value="search" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Search Content</CardTitle>
                    <CardDescription>
                      Search for movies or TV shows to add custom embeds and settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Button
                        variant={searchType === "movie" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSearchType("movie")}
                        className="gap-2"
                      >
                        <Film className="w-4 h-4" />
                        Movies
                      </Button>
                      <Button
                        variant={searchType === "tv" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSearchType("tv")}
                        className="gap-2"
                      >
                        <Tv className="w-4 h-4" />
                        TV Shows
                      </Button>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for movies or TV shows..."
                        className="pl-10"
                      />
                    </div>

                    {/* Search Results */}
                    {searchResults?.results && searchResults.results.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                        {searchResults.results.slice(0, 8).map((item: any) => {
                          const title = "title" in item ? item.title : item.name;
                          const date = "release_date" in item ? item.release_date : item.first_air_date;
                          return (
                            <div
                              key={item.id}
                              className="cursor-pointer group"
                              onClick={() => handleSelectMovie(item.id, searchType)}
                            >
                              <div className="aspect-[2/3] rounded-lg overflow-hidden bg-card mb-2">
                                <img
                                  src={getImageUrl(item.poster_path, "w185")}
                                  alt={title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              </div>
                              <p className="text-sm font-medium text-foreground line-clamp-1">
                                {title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {date?.split("-")[0]}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Edit Panel */}
                {selectedItem && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Edit Content</CardTitle>
                      <CardDescription>
                        TMDB ID: {selectedItem.tmdb_id} ({selectedItem.media_type})
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Settings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="customTitle">Custom Title (optional)</Label>
                          <Input
                            id="customTitle"
                            value={selectedItem.custom_title || ""}
                            onChange={(e) =>
                              setSelectedItem({ ...selectedItem, custom_title: e.target.value })
                            }
                            placeholder="Override TMDB title"
                          />
                        </div>
                        <div>
                          <Label htmlFor="customPoster">Custom Poster URL (optional)</Label>
                          <Input
                            id="customPoster"
                            value={selectedItem.custom_poster || ""}
                            onChange={(e) =>
                              setSelectedItem({ ...selectedItem, custom_poster: e.target.value })
                            }
                            placeholder="https://..."
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="customDescription">Custom Description (optional)</Label>
                        <Textarea
                          id="customDescription"
                          value={selectedItem.custom_description || ""}
                          onChange={(e) =>
                            setSelectedItem({ ...selectedItem, custom_description: e.target.value })
                          }
                          placeholder="Override TMDB description"
                          rows={3}
                        />
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Switch
                            id="featured"
                            checked={selectedItem.featured || false}
                            onCheckedChange={(checked) =>
                              setSelectedItem({ ...selectedItem, featured: checked })
                            }
                          />
                          <Label htmlFor="featured">Featured</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="hidden"
                            checked={selectedItem.hidden || false}
                            onCheckedChange={(checked) =>
                              setSelectedItem({ ...selectedItem, hidden: checked })
                            }
                          />
                          <Label htmlFor="hidden">Hidden</Label>
                        </div>
                      </div>

                      {/* Embeds */}
                      <div>
                        <h4 className="font-medium text-foreground mb-4">Custom Embed Sources</h4>
                        
                        {/* Existing Embeds */}
                        {selectedItem.embeds.length > 0 && (
                          <div className="space-y-2 mb-4">
                            {selectedItem.embeds.map((embed) => (
                              <div
                                key={embed.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-secondary"
                              >
                                <div className="flex items-center gap-3">
                                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium text-foreground">{embed.name}</p>
                                    <p className="text-xs text-muted-foreground truncate max-w-xs">
                                      {embed.url}
                                    </p>
                                  </div>
                                  {embed.quality && (
                                    <span className="px-2 py-0.5 rounded text-xs bg-primary/20 text-primary">
                                      {embed.quality}
                                    </span>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveEmbed(embed.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add New Embed */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border border-border">
                          <div>
                            <Label>Source Name</Label>
                            <Input
                              value={newEmbed.name}
                              onChange={(e) => setNewEmbed({ ...newEmbed, name: e.target.value })}
                              placeholder="e.g., VidSrc Pro"
                            />
                          </div>
                          <div>
                            <Label>Embed URL</Label>
                            <Input
                              value={newEmbed.url}
                              onChange={(e) => setNewEmbed({ ...newEmbed, url: e.target.value })}
                              placeholder="https://embed.example.com/video/123"
                            />
                          </div>
                          <div>
                            <Label>Quality (optional)</Label>
                            <Input
                              value={newEmbed.quality}
                              onChange={(e) => setNewEmbed({ ...newEmbed, quality: e.target.value })}
                              placeholder="e.g., 1080p, 4K"
                            />
                          </div>
                          <div>
                            <Label>Language (optional)</Label>
                            <Input
                              value={newEmbed.language}
                              onChange={(e) => setNewEmbed({ ...newEmbed, language: e.target.value })}
                              placeholder="e.g., English, Serbian"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Button onClick={handleAddEmbed} className="gap-2">
                              <Plus className="w-4 h-4" />
                              Add Embed Source
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Save Button */}
                      <div className="flex gap-4">
                        <Button onClick={handleSave} className="gap-2">
                          <Save className="w-4 h-4" />
                          Save Changes
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedItem(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Managed Content Tab */}
              <TabsContent value="managed">
                <Card>
                  <CardHeader>
                    <CardTitle>Managed Content</CardTitle>
                    <CardDescription>
                      View and edit all movies and TV shows with custom settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {managedMovies.length === 0 ? (
                      <div className="text-center py-12">
                        <Film className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No managed content yet</p>
                        <p className="text-sm text-muted-foreground">
                          Search for movies or TV shows to add custom settings
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {managedMovies.map((movie) => (
                          <div
                            key={movie.id}
                            className="p-4 rounded-lg border border-border bg-card hover:bg-secondary/50 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium text-foreground">
                                  {movie.custom_title || `TMDB #${movie.tmdb_id}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {movie.media_type.toUpperCase()} • ID: {movie.tmdb_id}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                {movie.featured && (
                                  <span className="px-2 py-0.5 rounded text-xs bg-primary/20 text-primary">
                                    Featured
                                  </span>
                                )}
                                {movie.hidden && (
                                  <span className="px-2 py-0.5 rounded text-xs bg-destructive/20 text-destructive">
                                    Hidden
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {movie.embeds?.length || 0} custom embeds
                            </p>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSelectMovie(movie.tmdb_id, movie.media_type)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(movie.tmdb_id, movie.media_type)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* AI Tagging Tab */}
              <TabsContent value="ai-tagging">
                <AITaggingPanel />
              </TabsContent>
            </Tabs>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
