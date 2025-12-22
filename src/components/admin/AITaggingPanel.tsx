import { useState } from "react";
import { Link } from "react-router-dom";
import { useBatchTagging } from "@/hooks/useTags";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Tag, 
  Loader2, 
  Play, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink,
  Sparkles,
  TrendingUp
} from "lucide-react";

export function AITaggingPanel() {
  const { queueFromTMDB, processJobs, stats, isLoading } = useBatchTagging();
  const [queueLimit, setQueueLimit] = useState("20");
  const [processLimit, setProcessLimit] = useState("5");
  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie");
  const [source, setSource] = useState<"trending" | "popular">("trending");

  const handleQueue = async () => {
    try {
      const result = await queueFromTMDB.mutateAsync({
        limit: parseInt(queueLimit),
        mediaType,
        source,
      });
      toast.success(`Queued ${result.queued} ${mediaType}s from TMDB ${source}`);
    } catch (error) {
      toast.error("Failed to queue from TMDB");
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

  const totalJobs = stats?.jobs
    ? (stats.jobs.pending || 0) +
      (stats.jobs.processing || 0) +
      (stats.jobs.completed || 0) +
      (stats.jobs.failed || 0)
    : 0;
  const completedPercent =
    totalJobs > 0 ? ((stats?.jobs?.completed || 0) / totalJobs) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          AI Tagging
        </h1>
        <p className="text-muted-foreground">
          Automatically tag movies and TV shows using AI
        </p>
      </div>

      {/* Stats Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Statistics Overview
          </CardTitle>
          <CardDescription>
            Current tagging job status and overall stats
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
                    <span className="text-muted-foreground">
                      Processing Progress
                    </span>
                    <span className="font-medium">
                      {completedPercent.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={completedPercent} className="h-2" />
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-muted-foreground">
                      Pending
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-amber-500">
                    {stats?.jobs?.pending || 0}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">
                      Processing
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-blue-500">
                    {stats?.jobs?.processing || 0}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">
                      Completed
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-green-500">
                    {stats?.jobs?.completed || 0}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-muted-foreground">
                      Failed
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-red-500">
                    {stats?.jobs?.failed || 0}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Tagged
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {stats?.tagged_movies || 0}
                  </p>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="flex items-center gap-6 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Unique Tags</p>
                  <p className="text-xl font-semibold">
                    {stats?.total_tags || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Tag Assignments
                  </p>
                  <p className="text-xl font-semibold">
                    {stats?.total_movie_tags || 0}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Queue from TMDB */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Queue from TMDB
            </CardTitle>
            <CardDescription>
              Fetch trending or popular content from TMDB and queue for tagging
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mediaType">Content Type</Label>
                <Select
                  value={mediaType}
                  onValueChange={(v) => setMediaType(v as "movie" | "tv")}
                >
                  <SelectTrigger id="mediaType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="movie">Movies</SelectItem>
                    <SelectItem value="tv">TV Shows</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select
                  value={source}
                  onValueChange={(v) =>
                    setSource(v as "trending" | "popular")
                  }
                >
                  <SelectTrigger id="source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trending">Trending</SelectItem>
                    <SelectItem value="popular">Popular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="queueLimit">Number to queue</Label>
              <Input
                id="queueLimit"
                type="number"
                value={queueLimit}
                onChange={(e) => setQueueLimit(e.target.value)}
                min="1"
                max="100"
              />
            </div>
            <Button
              onClick={handleQueue}
              disabled={queueFromTMDB.isPending}
              className="w-full gap-2"
            >
              {queueFromTMDB.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Queue from TMDB
            </Button>
          </CardContent>
        </Card>

        {/* Process Jobs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Play className="w-5 h-5" />
              Process Jobs
            </CardTitle>
            <CardDescription>
              Run AI tagging on queued items (uses Lovable AI)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
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
              disabled={
                processJobs.isPending || (stats?.jobs?.pending || 0) === 0
              }
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
            {(stats?.jobs?.pending || 0) === 0 && (
              <p className="text-xs text-muted-foreground text-center">
                No pending jobs to process
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
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
