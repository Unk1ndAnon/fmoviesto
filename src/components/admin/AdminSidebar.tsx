import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Search, 
  Film, 
  Tag, 
  Sparkles, 
  AlertCircle,
  LogOut,
  Settings,
  ChevronLeft,
  FolderHeart,
  Link2
} from "lucide-react";

interface AdminSidebarProps {
  userEmail: string;
  onLogout: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  failedJobsCount?: number;
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "search", label: "Add Content", icon: Search },
  { id: "managed", label: "Managed Content", icon: Film },
  { id: "collections", label: "Collections", icon: FolderHeart },
  { id: "ai-tagging", label: "AI Tagging", icon: Sparkles },
  { id: "failed-jobs", label: "Failed Jobs", icon: AlertCircle },
  { id: "tags", label: "Tag Management", icon: Tag },
  { id: "referrers", label: "Referrer Analytics", icon: Link2 },
];

export function AdminSidebar({ 
  userEmail, 
  onLogout, 
  activeTab, 
  onTabChange,
  failedJobsCount = 0 
}: AdminSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar className="border-r border-border/50" collapsible="icon">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-foreground truncate">Admin Panel</h2>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`
                      transition-all duration-200
                      ${activeTab === item.id 
                        ? "bg-primary/10 text-primary border-l-2 border-primary" 
                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      }
                    `}
                  >
                    <item.icon className="w-4 h-4" />
                    {!collapsed && (
                      <span className="flex-1">{item.label}</span>
                    )}
                    {!collapsed && item.id === "failed-jobs" && failedJobsCount > 0 && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-destructive text-destructive-foreground">
                        {failedJobsCount}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
