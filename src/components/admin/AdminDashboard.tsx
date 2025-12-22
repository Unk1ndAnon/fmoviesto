import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Film, 
  Tv, 
  Tag, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  ArrowRight,
  Loader2,
  Eye
} from "lucide-react";

interface DashboardStats {
  jobs?: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  tagged_movies?: number;
  total_tags?: number;
  total_movie_tags?: number;
  auto_tagged?: {
    movies: number;
    tv_shows: number;
    total: number;
  };
}

interface AdminDashboardProps {
  managedMoviesCount: number;
  stats?: DashboardStats;
  isLoading?: boolean;
  onNavigate: (tab: string) => void;
}

export function AdminDashboard({ 
  managedMoviesCount, 
  stats, 
  isLoading,
  onNavigate 
}: AdminDashboardProps) {
  const totalJobs = stats?.jobs 
    ? (stats.jobs.pending || 0) + (stats.jobs.processing || 0) + (stats.jobs.completed || 0) + (stats.jobs.failed || 0) 
    : 0;
  const completedPercent = totalJobs > 0 ? ((stats?.jobs?.completed || 0) / totalJobs) * 100 : 0;

  const quickStats = [
    { 
      label: "Managed Content", 
      value: managedMoviesCount, 
      icon: Film, 
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      action: () => onNavigate("managed")
    },
    { 
      label: "Tagged Items", 
      value: stats?.tagged_movies || 0, 
      icon: Sparkles, 
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      action: () => onNavigate("ai-tagging")
    },
    { 
      label: "Total Tags", 
      value: stats?.total_tags || 0, 
      icon: Tag, 
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
      action: () => onNavigate("tags")
    },
    { 
      label: "Tag Assignments", 
      value: stats?.total_movie_tags || 0, 
      icon: TrendingUp, 
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      action: null
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your content management system</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, i) => (
          <Card 
            key={i} 
            className={`${stat.border} cursor-pointer hover:shadow-md transition-all`}
            onClick={() => stat.action?.()}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                {stat.action && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Auto-Tagging Stats & Job Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Auto-Tagging on Page View */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Auto-Tagged on Page View
            </CardTitle>
            <CardDescription>Content tagged automatically when users view pages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Film className="w-6 h-6 text-blue-500 mb-2" />
                <p className="text-2xl font-bold text-blue-500">{stats?.auto_tagged?.movies || 0}</p>
                <p className="text-xs text-muted-foreground">Movies</p>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <Tv className="w-6 h-6 text-purple-500 mb-2" />
                <p className="text-2xl font-bold text-purple-500">{stats?.auto_tagged?.tv_shows || 0}</p>
                <p className="text-xs text-muted-foreground">TV Shows</p>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <Sparkles className="w-6 h-6 text-green-500 mb-2" />
                <p className="text-2xl font-bold text-green-500">{stats?.auto_tagged?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Items are tagged 2 seconds after a user views the detail page
            </p>
          </CardContent>
        </Card>

        {/* Job Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Tagging Jobs Status
            </CardTitle>
            <CardDescription>Current AI tagging job queue status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {totalJobs > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{completedPercent.toFixed(0)}%</span>
                </div>
                <Progress value={completedPercent} className="h-2" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Clock className="w-4 h-4 text-amber-500" />
                <div>
                  <p className="text-lg font-semibold text-amber-500">{stats?.jobs?.pending || 0}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Loader2 className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-lg font-semibold text-blue-500">{stats?.jobs?.processing || 0}</p>
                  <p className="text-xs text-muted-foreground">Processing</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-lg font-semibold text-green-500">{stats?.jobs?.completed || 0}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
              <div 
                className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 cursor-pointer hover:bg-red-500/20 transition-colors"
                onClick={() => onNavigate("failed-jobs")}
              >
                <XCircle className="w-4 h-4 text-red-500" />
                <div>
                  <p className="text-lg font-semibold text-red-500">{stats?.jobs?.failed || 0}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Common admin tasks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-between"
            onClick={() => onNavigate("search")}
          >
            <span className="flex items-center gap-2">
              <Film className="w-4 h-4" />
              Add New Content
            </span>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-between"
            onClick={() => onNavigate("ai-tagging")}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Queue TMDB Content
            </span>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-between"
            onClick={() => onNavigate("tags")}
          >
            <span className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Manage Tags
            </span>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Link to="/tags" className="block">
            <Button 
              variant="outline" 
              className="w-full justify-between"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                View Public Tags
              </span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
