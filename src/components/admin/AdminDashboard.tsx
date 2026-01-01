import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Film, 
  ArrowRight,
  Loader2,
  FolderHeart,
} from "lucide-react";

interface AdminDashboardProps {
  managedMoviesCount: number;
  isLoading?: boolean;
  onNavigate: (tab: string) => void;
}

export function AdminDashboard({ 
  managedMoviesCount, 
  isLoading,
  onNavigate 
}: AdminDashboardProps) {
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
            onClick={() => onNavigate("collections")}
          >
            <span className="flex items-center gap-2">
              <FolderHeart className="w-4 h-4" />
              Manage Collections
            </span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
