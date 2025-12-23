import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface NotificationPreferences {
  id: string;
  user_id: string;
  new_episodes: boolean;
  show_updates: boolean;
  recommendations: boolean;
  system_updates: boolean;
  email_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["notification_preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error) {
        // If no preferences exist, create default ones
        if (error.code === "PGRST116") {
          const { data: newPrefs, error: insertError } = await supabase
            .from("notification_preferences")
            .insert({ user_id: user.id })
            .select()
            .single();
          
          if (insertError) throw insertError;
          return newPrefs as NotificationPreferences;
        }
        throw error;
      }
      
      return data as NotificationPreferences;
    },
    enabled: !!user,
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("notification_preferences")
        .update(updates)
        .eq("user_id", user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification_preferences"] });
      toast.success("Notification preferences updated");
    },
    onError: () => {
      toast.error("Failed to update preferences");
    },
  });

  return { preferences, isLoading, updatePreferences };
}
