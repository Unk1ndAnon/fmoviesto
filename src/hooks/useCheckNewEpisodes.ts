import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTVFollows } from "./useTVFollows";

const CHECK_INTERVAL = 1000 * 60 * 30; // 30 minutes
const LAST_CHECK_KEY = "last_episode_check";

export function useCheckNewEpisodes() {
  const { user } = useAuth();
  const { follows } = useTVFollows();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || follows.length === 0) return;

    const checkForNewEpisodes = async () => {
      const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
      const now = Date.now();
      
      // Only check if enough time has passed
      if (lastCheck && now - parseInt(lastCheck) < CHECK_INTERVAL) {
        return;
      }

      try {
        console.log("Checking for new episodes...");
        
        const { data, error } = await supabase.functions.invoke("check-new-episodes", {
          body: { user_id: user.id },
        });

        if (error) {
          console.error("Error checking new episodes:", error);
          return;
        }

        console.log("New episode check result:", data);

        if (data?.notifications_created > 0) {
          // Invalidate notifications query to show new notifications
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["tv_follows"] });
        }

        localStorage.setItem(LAST_CHECK_KEY, now.toString());
      } catch (error) {
        console.error("Failed to check for new episodes:", error);
      }
    };

    // Check immediately on mount
    checkForNewEpisodes();

    // Set up interval to check periodically
    const intervalId = setInterval(checkForNewEpisodes, CHECK_INTERVAL);

    return () => clearInterval(intervalId);
  }, [user, follows.length, queryClient]);
}
