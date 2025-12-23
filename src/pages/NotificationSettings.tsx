import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Tv, Sparkles, Mail, Info, ArrowLeft, Settings } from "lucide-react";

export default function NotificationSettings() {
  const { user } = useAuth();
  const { preferences, isLoading, updatePreferences } = useNotificationPreferences();

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SEOHead 
          title="Notification Settings - Sign in Required"
          description="Sign in to manage your notification preferences."
        />
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-center">
          <Bell className="w-16 h-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Sign in to manage notifications</h1>
          <p className="text-muted-foreground mb-6">Customize what notifications you receive</p>
          <Link to="/auth">
            <Button>Sign In</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const handleToggle = (key: keyof typeof preferences, value: boolean) => {
    if (!preferences) return;
    updatePreferences.mutate({ [key]: value });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead 
        title="Notification Settings"
        description="Manage your notification preferences and control what updates you receive."
      />
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <Link 
            to="/profile" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Profile
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Notification Settings</h1>
              <p className="text-muted-foreground">Choose what notifications you want to receive</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-60" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-6 w-12" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : preferences ? (
          <div className="space-y-4">
            {/* New Episodes */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Tv className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">New Episodes</CardTitle>
                    <CardDescription>
                      Get notified when shows you follow release new episodes
                    </CardDescription>
                  </div>
                  <Switch
                    id="new_episodes"
                    checked={preferences.new_episodes}
                    onCheckedChange={(checked) => handleToggle("new_episodes", checked)}
                    disabled={updatePreferences.isPending}
                  />
                </div>
              </CardHeader>
            </Card>

            {/* Show Updates */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Bell className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Show Updates</CardTitle>
                    <CardDescription>
                      Updates about status changes for shows you follow (renewed, cancelled, etc.)
                    </CardDescription>
                  </div>
                  <Switch
                    id="show_updates"
                    checked={preferences.show_updates}
                    onCheckedChange={(checked) => handleToggle("show_updates", checked)}
                    disabled={updatePreferences.isPending}
                  />
                </div>
              </CardHeader>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Recommendations</CardTitle>
                    <CardDescription>
                      Personalized movie and TV show recommendations based on your taste
                    </CardDescription>
                  </div>
                  <Switch
                    id="recommendations"
                    checked={preferences.recommendations}
                    onCheckedChange={(checked) => handleToggle("recommendations", checked)}
                    disabled={updatePreferences.isPending}
                  />
                </div>
              </CardHeader>
            </Card>

            {/* System Updates */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Info className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">System Updates</CardTitle>
                    <CardDescription>
                      Important updates about new features and improvements
                    </CardDescription>
                  </div>
                  <Switch
                    id="system_updates"
                    checked={preferences.system_updates}
                    onCheckedChange={(checked) => handleToggle("system_updates", checked)}
                    disabled={updatePreferences.isPending}
                  />
                </div>
              </CardHeader>
            </Card>

            {/* Email Notifications */}
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      Email Notifications
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-normal">
                        Coming Soon
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Receive notifications via email for important updates
                    </CardDescription>
                  </div>
                  <Switch
                    id="email_notifications"
                    checked={preferences.email_notifications}
                    onCheckedChange={(checked) => handleToggle("email_notifications", checked)}
                    disabled={true}
                  />
                </div>
              </CardHeader>
            </Card>
          </div>
        ) : null}

        {/* Info box */}
        <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Tip:</strong> You can access notifications by clicking the bell icon 
            in the top navigation bar. Notifications are checked automatically when you open the app.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
