import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { getImageUrl } from "@/lib/tmdb";
import { generateSlug } from "@/lib/slug";
import { cn } from "@/lib/utils";

function NotificationItem({ notification, onMarkRead, onDelete, onNavigate }: { 
  notification: Notification; 
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: () => void;
}) {
  const getNotificationUrl = () => {
    if (!notification.tmdb_id) return null;
    
    if (notification.type === "new_episode" && notification.media_type === "tv") {
      const slug = generateSlug(notification.title);
      const season = notification.season_number || 1;
      const episode = notification.episode_number || 1;
      return `/watch/tv/${notification.tmdb_id}/${slug}?s=${season}&e=${episode}`;
    }
    
    if (notification.media_type === "tv") {
      const slug = generateSlug(notification.title);
      return `/tv/${notification.tmdb_id}/${slug}`;
    }
    
    if (notification.media_type === "movie") {
      const slug = generateSlug(notification.title);
      return `/movie/${notification.tmdb_id}/${slug}`;
    }
    
    return null;
  };

  const url = getNotificationUrl();

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkRead(notification.id);
    }
    onNavigate();
  };

  return (
    <div className={cn(
      "flex gap-3 p-3 border-b border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer",
      !notification.is_read && "bg-primary/5"
    )}>
      {notification.poster_path ? (
        <img 
          src={getImageUrl(notification.poster_path, "w92")} 
          alt="" 
          className="w-12 h-16 object-cover rounded"
        />
      ) : (
        <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
          <Bell className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0" onClick={handleClick}>
        {url ? (
          <Link 
            to={url}
            className="font-medium text-sm hover:text-primary line-clamp-1"
          >
            {notification.title}
          </Link>
        ) : (
          <span className="font-medium text-sm line-clamp-1">{notification.title}</span>
        )}
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {new Date(notification.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        {!notification.is_read && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={() => onMarkRead(notification.id)}
          >
            <Check className="w-3 h-3" />
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(notification.id)}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => markAllAsRead.mutate()}
              >
                <Check className="w-3 h-3 mr-1" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => clearAll.mutate()}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-[350px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Bell className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem 
                key={notification.id} 
                notification={notification}
                onMarkRead={(id) => markAsRead.mutate(id)}
                onDelete={(id) => deleteNotification.mutate(id)}
                onNavigate={() => setOpen(false)}
              />
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
