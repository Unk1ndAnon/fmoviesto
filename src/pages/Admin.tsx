import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { tmdb, getImageUrl } from "@/lib/tmdb";
import { adminStorage, adminAuth, AdminMovie, CustomEmbed } from "@/lib/admin";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Lock, Search, Plus, Trash2, Edit, Film, Tv, ExternalLink, Save } from "lucide-react";

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"movie" | "tv">("movie");
  const [selectedItem, setSelectedItem] = useState<AdminMovie | null>(null);
  const [managedMovies, setManagedMovies] = useState<AdminMovie[]>([]);

  // New embed form
  const [newEmbed, setNewEmbed] = useState({
    name: "",
    url: "",
    quality: "",
    language: "",
  });

  useEffect(() => {
    setIsAuthenticated(adminAuth.isAuthenticated());
    setManagedMovies(adminStorage.getAll());
  }, []);

  const { data: searchResults } = useQuery({
    queryKey: ["adminSearch", searchQuery, searchType],
    queryFn: async () => {
      if (searchType === "movie") {
        return tmdb.searchMovies(searchQuery);
      }
      return tmdb.searchTV(searchQuery);
    },
    enabled: searchQuery.length > 2,
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminAuth.login(password)) {
      setIsAuthenticated(true);
      toast.success("Successfully logged in");
    } else {
      toast.error("Invalid password");
    }
  };

  const handleLogout = () => {
    adminAuth.logout();
    setIsAuthenticated(false);
    toast.success("Logged out");
  };

  const handleSelectMovie = (id: number, type: "movie" | "tv", title: string) => {
    const existing = adminStorage.get(id, type);
    if (existing) {
      setSelectedItem(existing);
    } else {
      setSelectedItem({
        tmdbId: id,
        type,
        embeds: [],
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleSave = () => {
    if (selectedItem) {
      adminStorage.save(selectedItem);
      setManagedMovies(adminStorage.getAll());
      toast.success("Changes saved");
    }
  };

  const handleAddEmbed = () => {
    if (!selectedItem || !newEmbed.name || !newEmbed.url) {
      toast.error("Please fill in name and URL");
      return;
    }

    const embed = {
      id: crypto.randomUUID(),
      movieId: selectedItem.tmdbId,
      name: newEmbed.name,
      url: newEmbed.url,
      quality: newEmbed.quality,
      language: newEmbed.language,
      addedAt: new Date().toISOString(),
    } as CustomEmbed;

    setSelectedItem({
      ...selectedItem,
      embeds: [...selectedItem.embeds, embed],
    });

    setNewEmbed({ name: "", url: "", quality: "", language: "" });
    toast.success("Embed added");
  };

  const handleRemoveEmbed = (embedId: string) => {
    if (selectedItem) {
      setSelectedItem({
        ...selectedItem,
        embeds: selectedItem.embeds.filter((e) => e.id !== embedId),
      });
    }
  };

  const handleDelete = (tmdbId: number, type: "movie" | "tv") => {
    adminStorage.delete(tmdbId, type);
    setManagedMovies(adminStorage.getAll());
    if (selectedItem?.tmdbId === tmdbId) {
      setSelectedItem(null);
    }
    toast.success("Deleted");
  };

  if (!isAuthenticated) {
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
                <CardTitle>Admin Login</CardTitle>
                <CardDescription>
                  Enter the admin password to access the panel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Login
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Default password: admin123
                </p>
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
              <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>

            <Tabs defaultValue="search" className="space-y-6">
              <TabsList>
                <TabsTrigger value="search">Search & Add</TabsTrigger>
                <TabsTrigger value="managed">Managed Content ({managedMovies.length})</TabsTrigger>
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
                        variant={searchType === "movie" ? "default" : "cinema"}
                        size="sm"
                        onClick={() => setSearchType("movie")}
                        className="gap-2"
                      >
                        <Film className="w-4 h-4" />
                        Movies
                      </Button>
                      <Button
                        variant={searchType === "tv" ? "default" : "cinema"}
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
                              onClick={() => handleSelectMovie(item.id, searchType, title)}
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
                        TMDB ID: {selectedItem.tmdbId} ({selectedItem.type})
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Settings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="customTitle">Custom Title (optional)</Label>
                          <Input
                            id="customTitle"
                            value={selectedItem.customTitle || ""}
                            onChange={(e) =>
                              setSelectedItem({ ...selectedItem, customTitle: e.target.value })
                            }
                            placeholder="Override TMDB title"
                          />
                        </div>
                        <div>
                          <Label htmlFor="customPoster">Custom Poster URL (optional)</Label>
                          <Input
                            id="customPoster"
                            value={selectedItem.customPoster || ""}
                            onChange={(e) =>
                              setSelectedItem({ ...selectedItem, customPoster: e.target.value })
                            }
                            placeholder="https://..."
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="customDescription">Custom Description (optional)</Label>
                        <Textarea
                          id="customDescription"
                          value={selectedItem.customDescription || ""}
                          onChange={(e) =>
                            setSelectedItem({ ...selectedItem, customDescription: e.target.value })
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
                      All movies and TV shows with custom settings or embeds
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {managedMovies.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No managed content yet. Search and add content above.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {managedMovies.map((item) => (
                          <div
                            key={`${item.type}-${item.tmdbId}`}
                            className="flex items-center justify-between p-4 rounded-lg bg-secondary"
                          >
                            <div className="flex items-center gap-4">
                              {item.type === "movie" ? (
                                <Film className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <Tv className="w-5 h-5 text-muted-foreground" />
                              )}
                              <div>
                                <p className="font-medium text-foreground">
                                  {item.customTitle || `TMDB ID: ${item.tmdbId}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.embeds.length} custom embeds
                                  {item.featured && " • Featured"}
                                  {item.hidden && " • Hidden"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedItem(item)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(item.tmdbId, item.type)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
