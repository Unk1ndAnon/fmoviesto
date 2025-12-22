import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  RefreshCw, 
  Trash2, 
  AlertCircle, 
  Eye, 
  Loader2, 
  Film, 
  Tv,
  Clock,
  RotateCcw
} from "lucide-react";

interface FailedJob {
  id: string;
  tmdb_id: number;
  media_type: string;
  status: string;
  error_message: string | null;
  retries: number | null;
  created_at: string | null;
  processed_at: string | null;
}

export function FailedJobsPanel() {
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<FailedJob | null>(null);

  // Fetch failed jobs
  const { data: failedJobs, isLoading } = useQuery({
    queryKey: ["failedJobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tag_jobs")
        .select("*")
        .eq("status", "failed")
        .order("processed_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as FailedJob[];
    },
    refetchInterval: 10000,
  });

  // Retry single job mutation
  const retryJob = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from("tag_jobs")
        .update({ 
          status: "pending", 
          error_message: null,
          retries: 0
        })
        .eq("id", jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["failedJobs"] });
      queryClient.invalidateQueries({ queryKey: ["tagJobStats"] });
      toast.success("Job queued for retry");
    },
    onError: (error) => {
      toast.error("Failed to retry job: " + error.message);
    },
  });

  // Retry all failed jobs mutation
  const retryAllJobs = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tag_jobs")
        .update({ 
          status: "pending", 
          error_message: null,
          retries: 0
        })
        .eq("status", "failed");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["failedJobs"] });
      queryClient.invalidateQueries({ queryKey: ["tagJobStats"] });
      toast.success("All failed jobs queued for retry");
    },
    onError: (error) => {
      toast.error("Failed to retry jobs: " + error.message);
    },
  });

  // Delete job mutation
  const deleteJob = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from("tag_jobs")
        .delete()
        .eq("id", jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["failedJobs"] });
      queryClient.invalidateQueries({ queryKey: ["tagJobStats"] });
      toast.success("Job deleted");
      setSelectedJob(null);
    },
    onError: (error) => {
      toast.error("Failed to delete job: " + error.message);
    },
  });

  // Delete all failed jobs
  const deleteAllJobs = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tag_jobs")
        .delete()
        .eq("status", "failed");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["failedJobs"] });
      queryClient.invalidateQueries({ queryKey: ["tagJobStats"] });
      toast.success("All failed jobs deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete jobs: " + error.message);
    },
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-destructive" />
            Failed Jobs
          </h1>
          <p className="text-muted-foreground">
            {failedJobs?.length || 0} failed tagging jobs
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => retryAllJobs.mutate()}
            disabled={retryAllJobs.isPending || !failedJobs?.length}
            className="gap-2"
          >
            {retryAllJobs.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            Retry All
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (window.confirm("Delete all failed jobs? This cannot be undone.")) {
                deleteAllJobs.mutate();
              }
            }}
            disabled={deleteAllJobs.isPending || !failedJobs?.length}
            className="gap-2"
          >
            {deleteAllJobs.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Delete All
          </Button>
        </div>
      </div>

      {/* Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Failed Tagging Jobs</CardTitle>
          <CardDescription>
            Jobs that encountered errors during AI tagging
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : failedJobs && failedJobs.length > 0 ? (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {failedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-destructive/10">
                        {job.media_type === "movie" ? (
                          <Film className="w-5 h-5 text-destructive" />
                        ) : (
                          <Tv className="w-5 h-5 text-destructive" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            TMDB #{job.tmdb_id}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {job.media_type}
                          </Badge>
                          {job.retries && job.retries > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {job.retries} retries
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1 max-w-md">
                          {job.error_message || "Unknown error"}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(job.processed_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedJob(job)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => retryJob.mutate(job.id)}
                        disabled={retryJob.isPending}
                      >
                        {retryJob.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteJob.mutate(job.id)}
                        disabled={deleteJob.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No failed jobs</p>
              <p className="text-sm">All tagging jobs are running smoothly</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Details Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Job Details
            </DialogTitle>
            <DialogDescription>
              TMDB #{selectedJob?.tmdb_id} ({selectedJob?.media_type})
            </DialogDescription>
          </DialogHeader>

          {selectedJob && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(selectedJob.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Processed</p>
                  <p className="font-medium">{formatDate(selectedJob.processed_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Retries</p>
                  <p className="font-medium">{selectedJob.retries || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="destructive">{selectedJob.status}</Badge>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-sm mb-2">Error Message</p>
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <pre className="text-sm text-destructive whitespace-pre-wrap break-all font-mono">
                    {selectedJob.error_message || "No error message available"}
                  </pre>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    retryJob.mutate(selectedJob.id);
                    setSelectedJob(null);
                  }}
                  disabled={retryJob.isPending}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Job
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteJob.mutate(selectedJob.id)}
                  disabled={deleteJob.isPending}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Job
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
