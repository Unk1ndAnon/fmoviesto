import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCollections, Collection } from "@/hooks/useCollections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Film, 
  Search, 
  Loader2,
  Star,
  Eye,
  EyeOff,
  Sparkles
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CollectionMovie {
  id: string;
  tmdb_id: number;
  media_type: string;
  is_featured: boolean;
  display_order: number;
}

export function CollectionManagement() {
  const queryClient = useQueryClient();
  const { data: collections, isLoading } = useCollections();
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [searchTmdbId, setSearchTmdbId] = useState("");
  const [isAddingMovie, setIsAddingMovie] = useState(false);

  // Fetch movies for selected collection
  const { data: collectionMovies, isLoading: moviesLoading } = useQuery({
    queryKey: ["admin-collection-movies", selectedCollection?.id],
    queryFn: async () => {
      if (!selectedCollection) return [];
      const { data, error } = await supabase
        .from("collection_movies")
        .select("*")
        .eq("collection_id", selectedCollection.id)
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      return data as CollectionMovie[];
    },
    enabled: !!selectedCollection,
  });

  // Toggle collection published status
  const togglePublished = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from("collections")
        .update({ is_published })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Collection updated");
    },
    onError: () => {
      toast.error("Failed to update collection");
    },
  });

  // Add movie to collection
  const addMovie = useMutation({
    mutationFn: async ({ collectionId, tmdbId }: { collectionId: string; tmdbId: number }) => {
      const { error } = await supabase
        .from("collection_movies")
        .insert({
          collection_id: collectionId,
          tmdb_id: tmdbId,
          media_type: "movie",
          display_order: (collectionMovies?.length || 0) + 1,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-collection-movies"] });
      setSearchTmdbId("");
      setIsAddingMovie(false);
      toast.success("Movie added to collection");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Movie already in collection");
      } else {
        toast.error("Failed to add movie");
      }
    },
  });

  // Remove movie from collection
  const removeMovie = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("collection_movies")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-collection-movies"] });
      toast.success("Movie removed from collection");
    },
    onError: () => {
      toast.error("Failed to remove movie");
    },
  });

  // Toggle movie featured status
  const toggleFeatured = useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }) => {
      const { error } = await supabase
        .from("collection_movies")
        .update({ is_featured })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-collection-movies"] });
      toast.success("Movie updated");
    },
    onError: () => {
      toast.error("Failed to update movie");
    },
  });

  // Populate Christmas movies
  const populateChristmas = useMutation({
    mutationFn: async () => {
      const christmasMovies = [
        "Home Alone", "Home Alone 2: Lost in New York", "It's a Wonderful Life", "Die Hard",
        "Love Actually", "Elf", "How the Grinch Stole Christmas", "The Polar Express",
        "A Christmas Carol", "Miracle on 34th Street", "National Lampoon's Christmas Vacation",
        "White Christmas", "A Charlie Brown Christmas", "Arthur Christmas", "Klaus",
        "The Santa Clause", "Bad Santa", "Jingle All the Way", "The Holiday",
        "Rudolph the Red-Nosed Reindeer", "A Christmas Story", "Scrooged", "Batman Returns",
        "Die Hard 2", "Lethal Weapon", "Last Christmas", "Four Christmases", "Fred Claus",
        "Jack Frost", "Serendipity", "While You Were Sleeping", "Noelle", "The Night Before",
        "The Muppet Christmas Carol", "Prancer", "A Boy Called Christmas", "The Grinch",
        "Rise of the Guardians", "Frozen", "Mickey's Christmas Carol", "Frosty the Snowman",
        "Christmas with the Kranks", "The Man Who Invented Christmas", "The Star",
        "Shrek the Halls", "Happiest Season", "Let It Snow", "A Christmas Prince",
        "The Princess Switch", "Love Hard", "The Knight Before Christmas",
        "Falling for Christmas", "Office Christmas Party", "Almost Christmas", "Gremlins",
        "Krampus", "The Family Man", "Deck the Halls", "Trading Places", "Tokyo Godfathers",
        "Rare Exports: A Christmas Tale"
      ];

      const { data, error } = await supabase.functions.invoke("populate-collection", {
        body: {
          collection_slug: "christmas-movies",
          movies: christmasMovies,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-collection-movies"] });
      queryClient.invalidateQueries({ queryKey: ["christmas-movies"] });
      toast.success(`Added ${data.summary.added} movies to collection`);
    },
    onError: (error) => {
      console.error("Populate error:", error);
      toast.error("Failed to populate collection");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Collection Management</h2>
      </div>

      {/* Collections List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {collections?.map((collection) => (
          <Card 
            key={collection.id} 
            className={`cursor-pointer transition-all ${
              selectedCollection?.id === collection.id 
                ? "ring-2 ring-primary" 
                : "hover:border-primary/50"
            }`}
            onClick={() => setSelectedCollection(collection)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {collection.slug === "christmas-movies" && <span>🎄</span>}
                    {collection.name}
                  </CardTitle>
                  <CardDescription className="mt-1">{collection.slug}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={collection.is_published ? "default" : "secondary"}>
                    {collection.is_published ? "Published" : "Draft"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={collection.is_published}
                    onCheckedChange={(checked) => 
                      togglePublished.mutate({ id: collection.id, is_published: checked })
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Label className="text-sm text-muted-foreground">
                    {collection.is_published ? "Visible" : "Hidden"}
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Collection Details */}
      {selectedCollection && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Film className="w-5 h-5" />
                Movies in {selectedCollection.name}
              </CardTitle>
              <div className="flex gap-2">
                {selectedCollection.slug === "christmas-movies" && (
                  <Button
                    variant="outline"
                    onClick={() => populateChristmas.mutate()}
                    disabled={populateChristmas.isPending}
                  >
                    {populateChristmas.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Populate Christmas Movies
                  </Button>
                )}
                <Dialog open={isAddingMovie} onOpenChange={setIsAddingMovie}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Movie
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Movie to Collection</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>TMDB ID</Label>
                        <Input
                          type="number"
                          placeholder="Enter TMDB movie ID"
                          value={searchTmdbId}
                          onChange={(e) => setSearchTmdbId(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Find the TMDB ID from themoviedb.org
                        </p>
                      </div>
                      <Button
                        className="w-full"
                        disabled={!searchTmdbId || addMovie.isPending}
                        onClick={() => 
                          addMovie.mutate({
                            collectionId: selectedCollection.id,
                            tmdbId: parseInt(searchTmdbId),
                          })
                        }
                      >
                        {addMovie.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        Add Movie
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {moviesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : collectionMovies && collectionMovies.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Order</TableHead>
                    <TableHead>TMDB ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collectionMovies.map((movie) => (
                    <TableRow key={movie.id}>
                      <TableCell>{movie.display_order}</TableCell>
                      <TableCell className="font-mono">{movie.tmdb_id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{movie.media_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={movie.is_featured}
                          onCheckedChange={(checked) => 
                            toggleFeatured.mutate({ id: movie.id, is_featured: checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMovie.mutate(movie.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Film className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No movies in this collection yet</p>
                {selectedCollection.slug === "christmas-movies" && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => populateChristmas.mutate()}
                    disabled={populateChristmas.isPending}
                  >
                    {populateChristmas.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Auto-populate with Christmas Movies
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
