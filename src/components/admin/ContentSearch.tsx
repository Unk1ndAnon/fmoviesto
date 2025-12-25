import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { tmdb, getImageUrl } from "@/lib/tmdb";
import { adminStorage, AdminMovie, CustomEmbed } from "@/lib/admin";
import { validateEmbedUrl } from "@/lib/url-validation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Search, 
  Film, 
  Tv, 
  Plus, 
  Trash2, 
  Save, 
  ExternalLink, 
  X,
  ImageIcon
} from "lucide-react";

interface EditableMovie {
  id?: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  original_title?: string;
  custom_title?: string;
  custom_description?: string;
  featured?: boolean;
  hidden?: boolean;
  custom_poster?: string;
  custom_backdrop?: string;
  embeds: CustomEmbed[];
}

interface ContentSearchProps {
  onSave: () => void;
}

export function ContentSearch({ onSave }: ContentSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"movie" | "tv">("movie");
  const [selectedItem, setSelectedItem] = useState<EditableMovie | null>(null);
  const [newEmbed, setNewEmbed] = useState({
    name: "",
    url: "",
    quality: "",
    language: "",
  });

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

  const handleSelectMovie = async (id: number, type: "movie" | "tv", originalTitle: string) => {
    const existing = await adminStorage.get(id, type);
    if (existing) {
      setSelectedItem({
        id: existing.id,
        tmdb_id: existing.tmdb_id,
        media_type: existing.media_type,
        original_title: existing.original_title || originalTitle,
        custom_title: existing.custom_title,
        custom_description: existing.custom_description,
        featured: existing.featured,
        hidden: existing.hidden,
        custom_poster: existing.custom_poster,
        custom_backdrop: existing.custom_backdrop,
        embeds: existing.embeds || [],
      });
    } else {
      setSelectedItem({
        tmdb_id: id,
        media_type: type,
        original_title: originalTitle,
        embeds: [],
      });
    }
  };

  const handleSave = async () => {
    if (!selectedItem) return;

    const saved = await adminStorage.save({
      tmdb_id: selectedItem.tmdb_id,
      media_type: selectedItem.media_type,
      original_title: selectedItem.original_title,
      custom_title: selectedItem.custom_title,
      custom_description: selectedItem.custom_description,
      featured: selectedItem.featured,
      hidden: selectedItem.hidden,
      custom_poster: selectedItem.custom_poster,
      custom_backdrop: selectedItem.custom_backdrop,
    });

    if (saved) {
      // Save new embeds (those with temp- prefix are new, not yet in DB)
      for (const embed of selectedItem.embeds) {
        if (embed.id.startsWith("temp-")) {
          const success = await adminStorage.addEmbed(selectedItem.tmdb_id, selectedItem.media_type, {
            name: embed.name,
            url: embed.url,
            quality: embed.quality,
            language: embed.language,
          });
          if (!success) {
            console.error("Failed to save embed:", embed.name);
          }
        }
      }
      onSave();
      toast.success("Content saved successfully");
      setSelectedItem(null);
    } else {
      toast.error("Failed to save content");
    }
  };

  const handleAddEmbed = () => {
    if (!selectedItem || !newEmbed.name || !newEmbed.url) {
      toast.error("Please fill in name and URL");
      return;
    }

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
  };

  const handleRemoveEmbed = async (embedId: string) => {
    if (!selectedItem) return;

    if (!embedId.startsWith("temp-")) {
      await adminStorage.removeEmbed(embedId);
    }

    setSelectedItem({
      ...selectedItem,
      embeds: selectedItem.embeds.filter((e) => e.id !== embedId),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Add Content</h1>
        <p className="text-muted-foreground">
          Search and add movies or TV shows with custom settings
        </p>
      </div>

      {/* Search Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search TMDB
          </CardTitle>
          <CardDescription>
            Find movies or TV shows to customize
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Type Toggle */}
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

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for movies or TV shows..."
              className="pl-10"
            />
          </div>

          {/* Search Results Grid */}
          {searchResults?.results && searchResults.results.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
              {searchResults.results.slice(0, 8).map((item: any) => {
                const title = "title" in item ? item.title : item.name;
                const date =
                  "release_date" in item
                    ? item.release_date
                    : item.first_air_date;
                return (
                  <div
                    key={item.id}
                    className="cursor-pointer group"
                    onClick={() => handleSelectMovie(item.id, searchType, title)}
                  >
                    <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted mb-2 relative">
                      {item.poster_path ? (
                        <img
                          src={getImageUrl(item.poster_path, "w185")}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Plus className="w-8 h-8 text-primary-foreground" />
                      </div>
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Edit Content</CardTitle>
                <CardDescription>
                  TMDB ID: {selectedItem.tmdb_id} ({selectedItem.media_type})
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedItem(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customTitle">Custom Title</Label>
                <Input
                  id="customTitle"
                  value={selectedItem.custom_title || ""}
                  onChange={(e) =>
                    setSelectedItem({
                      ...selectedItem,
                      custom_title: e.target.value,
                    })
                  }
                  placeholder="Override TMDB title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customPoster">Custom Poster URL</Label>
                <Input
                  id="customPoster"
                  value={selectedItem.custom_poster || ""}
                  onChange={(e) =>
                    setSelectedItem({
                      ...selectedItem,
                      custom_poster: e.target.value,
                    })
                  }
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customDescription">Custom Description</Label>
              <Textarea
                id="customDescription"
                value={selectedItem.custom_description || ""}
                onChange={(e) =>
                  setSelectedItem({
                    ...selectedItem,
                    custom_description: e.target.value,
                  })
                }
                placeholder="Override TMDB description"
                rows={3}
              />
            </div>

            {/* Toggles */}
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

            {/* Embeds Section */}
            <div className="border-t pt-6">
              <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Custom Embed Sources
              </h4>

              {/* Existing Embeds */}
              {selectedItem.embeds.length > 0 && (
                <div className="space-y-2 mb-4">
                  {selectedItem.embeds.map((embed) => (
                    <div
                      key={embed.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                    >
                      <div className="flex items-center gap-3">
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">
                            {embed.name}
                          </p>
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

              {/* Add New Embed Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border border-dashed">
                <div className="space-y-2">
                  <Label>Source Name</Label>
                  <Input
                    value={newEmbed.name}
                    onChange={(e) =>
                      setNewEmbed({ ...newEmbed, name: e.target.value })
                    }
                    placeholder="e.g., VidSrc Pro"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Embed URL</Label>
                  <Input
                    value={newEmbed.url}
                    onChange={(e) =>
                      setNewEmbed({ ...newEmbed, url: e.target.value })
                    }
                    placeholder="https://embed.example.com/video/123"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quality (optional)</Label>
                  <Input
                    value={newEmbed.quality}
                    onChange={(e) =>
                      setNewEmbed({ ...newEmbed, quality: e.target.value })
                    }
                    placeholder="e.g., 1080p, 4K"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Language (optional)</Label>
                  <Input
                    value={newEmbed.language}
                    onChange={(e) =>
                      setNewEmbed({ ...newEmbed, language: e.target.value })
                    }
                    placeholder="e.g., English"
                  />
                </div>
                <div className="md:col-span-2">
                  <Button
                    variant="outline"
                    onClick={handleAddEmbed}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Embed Source
                  </Button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={handleSave} className="gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setSelectedItem(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
