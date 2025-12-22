import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Save, Trash2, Merge, Tag, Loader2, X, Check, AlertTriangle } from "lucide-react";
import { getTagTypeColor } from "@/hooks/useTags";

interface TagData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tag_type: string;
  source: string | null;
  movie_count: number | null;
  is_featured: boolean | null;
  noindex: boolean | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string | null;
}

export function TagManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<TagData | null>(null);
  const [editedTag, setEditedTag] = useState<Partial<TagData>>({});
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Fetch all tags
  const { data: tags, isLoading } = useQuery({
    queryKey: ["adminTags", searchQuery, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("tags")
        .select("*")
        .order("movie_count", { ascending: false });

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      if (typeFilter !== "all") {
        query = query.eq("tag_type", typeFilter);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as TagData[];
    },
  });

  // Update tag mutation
  const updateTag = useMutation({
    mutationFn: async (tag: Partial<TagData> & { id: string }) => {
      const { id, ...updateData } = tag;
      
      // Generate slug from name if name changed
      if (updateData.name) {
        updateData.slug = updateData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }

      const { error } = await supabase
        .from("tags")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTags"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Tag updated successfully");
      setSelectedTag(null);
      setEditedTag({});
    },
    onError: (error) => {
      toast.error("Failed to update tag: " + error.message);
    },
  });

  // Delete tag mutation
  const deleteTag = useMutation({
    mutationFn: async (tagId: string) => {
      // First delete all movie_tags associations
      await supabase.from("movie_tags").delete().eq("tag_id", tagId);
      
      // Then delete the tag
      const { error } = await supabase.from("tags").delete().eq("id", tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTags"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Tag deleted successfully");
      setSelectedTag(null);
    },
    onError: (error) => {
      toast.error("Failed to delete tag: " + error.message);
    },
  });

  // Merge tags mutation
  const mergeTags = useMutation({
    mutationFn: async ({ sourceId, targetId }: { sourceId: string; targetId: string }) => {
      // Update all movie_tags to point to target tag
      const { error: updateError } = await supabase
        .from("movie_tags")
        .update({ tag_id: targetId })
        .eq("tag_id", sourceId);

      if (updateError) throw updateError;

      // Get counts for both tags
      const { count: sourceCount } = await supabase
        .from("movie_tags")
        .select("*", { count: "exact", head: true })
        .eq("tag_id", targetId);

      // Update target tag movie count
      await supabase
        .from("tags")
        .update({ movie_count: sourceCount || 0 })
        .eq("id", targetId);

      // Delete the source tag
      const { error: deleteError } = await supabase
        .from("tags")
        .delete()
        .eq("id", sourceId);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTags"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Tags merged successfully");
      setMergeDialogOpen(false);
      setSelectedTag(null);
      setMergeTargetId("");
    },
    onError: (error) => {
      toast.error("Failed to merge tags: " + error.message);
    },
  });

  const handleSelectTag = (tag: TagData) => {
    setSelectedTag(tag);
    setEditedTag({
      name: tag.name,
      description: tag.description,
      tag_type: tag.tag_type,
      is_featured: tag.is_featured,
      noindex: tag.noindex,
      seo_title: tag.seo_title,
      seo_description: tag.seo_description,
    });
  };

  const handleSave = () => {
    if (!selectedTag) return;
    updateTag.mutate({ id: selectedTag.id, ...editedTag });
  };

  const handleDelete = () => {
    if (!selectedTag) return;
    if (window.confirm(`Delete tag "${selectedTag.name}"? This will remove it from all movies.`)) {
      deleteTag.mutate(selectedTag.id);
    }
  };

  const handleMerge = () => {
    if (!selectedTag || !mergeTargetId) return;
    mergeTags.mutate({ sourceId: selectedTag.id, targetId: mergeTargetId });
  };

  const mergeTargetOptions = tags?.filter(t => t.id !== selectedTag?.id) || [];

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Tag Management
          </CardTitle>
          <CardDescription>
            Edit tag names, descriptions, SEO metadata, and merge duplicates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tags..."
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="genre">Genre</SelectItem>
                <SelectItem value="mood">Mood</SelectItem>
                <SelectItem value="theme">Theme</SelectItem>
                <SelectItem value="setting">Setting</SelectItem>
                <SelectItem value="style">Style</SelectItem>
                <SelectItem value="audience">Audience</SelectItem>
                <SelectItem value="ai">AI Generated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tag List */}
          <ScrollArea className="h-[300px] border rounded-lg p-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : tags && tags.length > 0 ? (
              <div className="space-y-1">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedTag?.id === tag.id
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => handleSelectTag(tag)}
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={`text-xs ${getTagTypeColor(tag.tag_type)}`}>
                        {tag.tag_type}
                      </Badge>
                      <span className="font-medium">{tag.name}</span>
                      {tag.is_featured && (
                        <Badge variant="outline" className="text-xs">Featured</Badge>
                      )}
                      {tag.noindex && (
                        <Badge variant="secondary" className="text-xs">NoIndex</Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {tag.movie_count || 0} items
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No tags found
              </div>
            )}
          </ScrollArea>

          <div className="text-sm text-muted-foreground">
            Showing {tags?.length || 0} tags
          </div>
        </CardContent>
      </Card>

      {/* Edit Panel */}
      {selectedTag && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Edit Tag: {selectedTag.name}</CardTitle>
                <CardDescription>
                  Slug: {selectedTag.slug} • {selectedTag.movie_count || 0} movies
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedTag(null);
                  setEditedTag({});
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tagName">Tag Name</Label>
                <Input
                  id="tagName"
                  value={editedTag.name || ""}
                  onChange={(e) => setEditedTag({ ...editedTag, name: e.target.value })}
                  placeholder="Tag name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagType">Tag Type</Label>
                <Select
                  value={editedTag.tag_type || "ai"}
                  onValueChange={(v) => setEditedTag({ ...editedTag, tag_type: v })}
                >
                  <SelectTrigger id="tagType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="genre">Genre</SelectItem>
                    <SelectItem value="mood">Mood</SelectItem>
                    <SelectItem value="theme">Theme</SelectItem>
                    <SelectItem value="setting">Setting</SelectItem>
                    <SelectItem value="style">Style</SelectItem>
                    <SelectItem value="audience">Audience</SelectItem>
                    <SelectItem value="ai">AI Generated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagDescription">Description</Label>
              <Textarea
                id="tagDescription"
                value={editedTag.description || ""}
                onChange={(e) => setEditedTag({ ...editedTag, description: e.target.value })}
                placeholder="Tag description for display on tag pages"
                rows={2}
              />
            </div>

            {/* SEO Settings */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">SEO Settings</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="seoTitle">SEO Title (optional)</Label>
                  <Input
                    id="seoTitle"
                    value={editedTag.seo_title || ""}
                    onChange={(e) => setEditedTag({ ...editedTag, seo_title: e.target.value })}
                    placeholder="Custom title for search engines"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seoDescription">SEO Description (optional)</Label>
                  <Textarea
                    id="seoDescription"
                    value={editedTag.seo_description || ""}
                    onChange={(e) => setEditedTag({ ...editedTag, seo_description: e.target.value })}
                    placeholder="Custom meta description for search engines"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-6 border-t pt-4">
              <div className="flex items-center gap-3">
                <Switch
                  id="featured"
                  checked={editedTag.is_featured || false}
                  onCheckedChange={(c) => setEditedTag({ ...editedTag, is_featured: c })}
                />
                <Label htmlFor="featured">Featured Tag</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="noindex"
                  checked={editedTag.noindex || false}
                  onCheckedChange={(c) => setEditedTag({ ...editedTag, noindex: c })}
                />
                <Label htmlFor="noindex">NoIndex (hide from search engines)</Label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 border-t pt-4">
              <Button
                onClick={handleSave}
                disabled={updateTag.isPending}
                className="gap-2"
              >
                {updateTag.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => setMergeDialogOpen(true)}
                className="gap-2"
              >
                <Merge className="w-4 h-4" />
                Merge Into Another Tag
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteTag.isPending}
                className="gap-2"
              >
                {deleteTag.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete Tag
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Merge Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Merge Tag
            </DialogTitle>
            <DialogDescription>
              Merge "{selectedTag?.name}" into another tag. All movies with this tag will be
              reassigned to the target tag, and this tag will be deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select target tag</Label>
              <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose tag to merge into..." />
                </SelectTrigger>
                <SelectContent>
                  {mergeTargetOptions.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.name} ({tag.movie_count || 0} movies)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mergeTargetId && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <strong>Preview:</strong> {selectedTag?.movie_count || 0} movies will be moved from
                "{selectedTag?.name}" to "{mergeTargetOptions.find(t => t.id === mergeTargetId)?.name}".
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMerge}
              disabled={!mergeTargetId || mergeTags.isPending}
              className="gap-2"
            >
              {mergeTags.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Confirm Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
