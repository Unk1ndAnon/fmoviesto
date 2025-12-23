import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TVFollow {
  id: string;
  user_id: string;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  last_season: number | null;
  last_episode: number | null;
  last_air_date: string | null;
  updated_at: string;
}

interface TMDBEpisode {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  air_date: string;
}

interface TMDBSeason {
  episodes: TMDBEpisode[];
}

interface TMDBShow {
  id: number;
  name: string;
  poster_path: string | null;
  number_of_seasons: number;
  last_episode_to_air?: {
    id: number;
    name: string;
    episode_number: number;
    season_number: number;
    air_date: string;
  };
  next_episode_to_air?: {
    id: number;
    name: string;
    episode_number: number;
    season_number: number;
    air_date: string;
  };
}

async function fetchTMDB<T>(endpoint: string): Promise<T | null> {
  try {
    const url = `${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error(`TMDB fetch error for ${endpoint}:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get request body to check if it's for a specific user
    let userId: string | null = null;
    try {
      const body = await req.json();
      userId = body?.user_id || null;
    } catch {
      // No body, check all users
    }

    // Get all TV follows (or for specific user)
    let query = supabase.from("tv_follows").select("*");
    if (userId) {
      query = query.eq("user_id", userId);
    }
    
    const { data: follows, error: followsError } = await query;
    
    if (followsError) {
      console.error("Error fetching follows:", followsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch follows" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!follows || follows.length === 0) {
      return new Response(
        JSON.stringify({ message: "No follows to check", notifications_created: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking ${follows.length} follows for new episodes`);

    let notificationsCreated = 0;
    const updatedFollows: string[] = [];

    // Group follows by tmdb_id to avoid duplicate API calls
    const uniqueShows = new Map<number, TVFollow[]>();
    for (const follow of follows) {
      const existing = uniqueShows.get(follow.tmdb_id) || [];
      existing.push(follow);
      uniqueShows.set(follow.tmdb_id, existing);
    }

    for (const [tmdbId, userFollows] of uniqueShows) {
      const show = await fetchTMDB<TMDBShow>(`/tv/${tmdbId}`);
      if (!show) continue;

      const lastEpisode = show.last_episode_to_air;
      if (!lastEpisode) continue;

      for (const follow of userFollows) {
        // Check if there's a new episode
        const followLastSeason = follow.last_season || 1;
        const followLastEpisode = follow.last_episode || 0;
        const followLastAirDate = follow.last_air_date ? new Date(follow.last_air_date) : null;

        const isNewEpisode = 
          lastEpisode.season_number > followLastSeason ||
          (lastEpisode.season_number === followLastSeason && lastEpisode.episode_number > followLastEpisode);

        const lastEpisodeAirDate = lastEpisode.air_date ? new Date(lastEpisode.air_date) : null;
        const isNewerByDate = followLastAirDate && lastEpisodeAirDate && lastEpisodeAirDate > followLastAirDate;

        if (isNewEpisode || isNewerByDate) {
          // Check if notification already exists for this episode
          const { data: existingNotification } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", follow.user_id)
            .eq("tmdb_id", tmdbId)
            .eq("season_number", lastEpisode.season_number)
            .eq("episode_number", lastEpisode.episode_number)
            .single();

          if (!existingNotification) {
            // Create notification
            const { error: notifError } = await supabase.from("notifications").insert({
              user_id: follow.user_id,
              type: "new_episode",
              title: follow.title,
              message: `S${lastEpisode.season_number}E${lastEpisode.episode_number} - ${lastEpisode.name} is now available!`,
              tmdb_id: tmdbId,
              media_type: "tv",
              season_number: lastEpisode.season_number,
              episode_number: lastEpisode.episode_number,
              poster_path: show.poster_path || follow.poster_path,
            });

            if (!notifError) {
              notificationsCreated++;
              console.log(`Created notification for ${follow.title} S${lastEpisode.season_number}E${lastEpisode.episode_number} for user ${follow.user_id}`);
            } else {
              console.error("Error creating notification:", notifError);
            }
          }

          // Update the follow with latest episode info
          const { error: updateError } = await supabase
            .from("tv_follows")
            .update({
              last_season: lastEpisode.season_number,
              last_episode: lastEpisode.episode_number,
              last_air_date: lastEpisode.air_date,
            })
            .eq("id", follow.id);

          if (!updateError) {
            updatedFollows.push(follow.id);
          }
        }
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Created ${notificationsCreated} notifications, updated ${updatedFollows.length} follows`);

    return new Response(
      JSON.stringify({ 
        message: "Check completed", 
        notifications_created: notificationsCreated,
        follows_updated: updatedFollows.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in check-new-episodes function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
