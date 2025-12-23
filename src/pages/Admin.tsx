import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminStorage, adminAuth, AdminMovie } from "@/lib/admin";
import { useBatchTagging } from "@/hooks/useTags";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { ContentSearch } from "@/components/admin/ContentSearch";
import { ManagedContent } from "@/components/admin/ManagedContent";
import { AITaggingPanel } from "@/components/admin/AITaggingPanel";
import { FailedJobsPanel } from "@/components/admin/FailedJobsPanel";
import { TagManagement } from "@/components/admin/TagManagement";
import { CollectionManagement } from "@/components/admin/CollectionManagement";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, ShieldAlert, Loader2, Menu } from "lucide-react";
import { Link } from "react-router-dom";

export default function Admin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [managedMovies, setManagedMovies] = useState<AdminMovie[]>([]);

  const { stats } = useBatchTagging();

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

  const handleLogout = async () => {
    await adminAuth.logout();
    setIsAdmin(false);
    toast.success("Logged out");
  };

  const refreshManagedMovies = async () => {
    const movies = await adminStorage.getAll();
    setManagedMovies(movies);
  };

  const handleDelete = async (tmdbId: number, type: "movie" | "tv") => {
    const success = await adminStorage.delete(tmdbId, type);
    if (success) {
      await refreshManagedMovies();
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
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Checking permissions...</p>
          </div>
        </div>
      </>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <>
        <SEOHead title="Admin Login" description="Admin panel login" />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
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
                <Button className="w-full">Sign In</Button>
              </Link>
              <p className="text-xs text-muted-foreground text-center">
                Only users with admin role can access this panel
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Not an admin
  if (!isAdmin) {
    return (
      <>
        <SEOHead title="Access Denied" description="Admin access denied" />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
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
        </div>
      </>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <AdminDashboard
            managedMoviesCount={managedMovies.length}
            stats={stats}
            onNavigate={setActiveTab}
          />
        );
      case "search":
        return <ContentSearch onSave={refreshManagedMovies} />;
      case "managed":
        return (
          <ManagedContent
            movies={managedMovies}
            onEdit={(tmdbId, type) => {
              setActiveTab("search");
            }}
            onDelete={handleDelete}
          />
        );
      case "ai-tagging":
        return <AITaggingPanel />;
      case "failed-jobs":
        return <FailedJobsPanel />;
      case "tags":
        return <TagManagement />;
      case "collections":
        return <CollectionManagement />;
      default:
        return null;
    }
  };

  return (
    <>
      <SEOHead title="Admin Panel" description="Manage movies and TV shows" />

      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar
            userEmail={user.email || ""}
            onLogout={handleLogout}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            failedJobsCount={stats?.jobs?.failed || 0}
          />

          <main className="flex-1 overflow-auto">
            {/* Mobile Header */}
            <header className="sticky top-0 z-10 flex items-center h-14 px-4 border-b bg-background/95 backdrop-blur lg:hidden">
              <SidebarTrigger>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SidebarTrigger>
              <h1 className="ml-3 font-semibold">Admin Panel</h1>
            </header>

            {/* Content */}
            <div className="p-6 max-w-7xl mx-auto">{renderContent()}</div>
          </main>
        </div>
      </SidebarProvider>
    </>
  );
}
