import { supabase } from "@/integrations/supabase/client";
import { validateEmbedUrl } from "@/lib/url-validation";

export interface CustomEmbed {
  id: string;
  name: string;
  url: string;
  quality?: string;
  language?: string;
  created_at: string;
}

export interface AdminMovie {
  id: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  original_title?: string;
  custom_title?: string;
  custom_description?: string;
  featured?: boolean;
  hidden?: boolean;
  custom_poster?: string;
  custom_backdrop?: string;
  created_at: string;
  updated_at: string;
  embeds?: CustomEmbed[];
}

export const adminStorage = {
  getAll: async (): Promise<AdminMovie[]> => {
    const { data, error } = await supabase
      .from('admin_movies')
      .select('*');
    
    if (error) {
      console.error('Error fetching admin movies:', error);
      return [];
    }

    // Fetch embeds for each movie
    const moviesWithEmbeds = await Promise.all(
      (data || []).map(async (movie) => {
        const { data: embeds } = await supabase
          .from('custom_embeds')
          .select('*')
          .eq('admin_movie_id', movie.id);
        
        return {
          ...movie,
          embeds: embeds || []
        } as AdminMovie;
      })
    );

    return moviesWithEmbeds;
  },

  get: async (tmdbId: number, type: "movie" | "tv"): Promise<AdminMovie | null> => {
    const { data, error } = await supabase
      .from('admin_movies')
      .select('*')
      .eq('tmdb_id', tmdbId)
      .eq('media_type', type)
      .maybeSingle();
    
    if (error || !data) {
      return null;
    }

    // Fetch embeds
    const { data: embeds } = await supabase
      .from('custom_embeds')
      .select('*')
      .eq('admin_movie_id', data.id);

    return {
      ...data,
      embeds: embeds || []
    } as AdminMovie;
  },

  save: async (movie: Omit<AdminMovie, 'id' | 'created_at' | 'updated_at'>): Promise<AdminMovie | null> => {
    const { data, error } = await supabase
      .from('admin_movies')
      .upsert({
        tmdb_id: movie.tmdb_id,
        media_type: movie.media_type,
        original_title: movie.original_title,
        custom_title: movie.custom_title,
        custom_description: movie.custom_description,
        featured: movie.featured,
        hidden: movie.hidden,
        custom_poster: movie.custom_poster,
        custom_backdrop: movie.custom_backdrop
      }, {
        onConflict: 'tmdb_id,media_type'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving admin movie:', error);
      return null;
    }

    return data as AdminMovie;
  },

  delete: async (tmdbId: number, type: "movie" | "tv"): Promise<boolean> => {
    const { error } = await supabase
      .from('admin_movies')
      .delete()
      .eq('tmdb_id', tmdbId)
      .eq('media_type', type);

    if (error) {
      console.error('Error deleting admin movie:', error);
      return false;
    }

    return true;
  },

  addEmbed: async (tmdbId: number, type: "movie" | "tv", embed: { name: string; url: string; quality?: string; language?: string }): Promise<boolean> => {
    console.log('Adding embed:', { tmdbId, type, embed });
    
    // Validate URL for security
    const validation = validateEmbedUrl(embed.url);
    if (!validation.valid) {
      console.error('Invalid embed URL:', validation.error);
      return false;
    }

    // First ensure the admin_movie exists
    let movie = await adminStorage.get(tmdbId, type);
    console.log('Found existing movie:', movie);
    
    if (!movie) {
      console.log('Creating new admin_movie for embed');
      movie = await adminStorage.save({
        tmdb_id: tmdbId,
        media_type: type
      });
    }

    if (!movie) {
      console.error('Failed to get/create admin_movie');
      return false;
    }

    console.log('Inserting embed with admin_movie_id:', movie.id);
    const { data, error } = await supabase
      .from('custom_embeds')
      .insert({
        admin_movie_id: movie.id,
        name: embed.name.trim(),
        url: embed.url.trim(),
        quality: embed.quality?.trim(),
        language: embed.language?.trim()
      })
      .select();

    if (error) {
      console.error('Error adding embed:', error);
      return false;
    }

    console.log('Embed saved successfully:', data);
    return true;
  },

  removeEmbed: async (embedId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('custom_embeds')
      .delete()
      .eq('id', embedId);

    if (error) {
      console.error('Error removing embed:', error);
      return false;
    }

    return true;
  },

  getFeatured: async (): Promise<AdminMovie[]> => {
    const { data, error } = await supabase
      .from('admin_movies')
      .select('*')
      .eq('featured', true);

    if (error) {
      console.error('Error fetching featured movies:', error);
      return [];
    }

    return (data || []) as AdminMovie[];
  },

  getHidden: async (): Promise<number[]> => {
    const { data, error } = await supabase
      .from('admin_movies')
      .select('tmdb_id')
      .eq('hidden', true);

    if (error) {
      console.error('Error fetching hidden movies:', error);
      return [];
    }

    return (data || []).map(m => m.tmdb_id);
  },
};

// Admin authentication using Supabase auth and is_admin() RPC function
export const adminAuth = {
  isAuthenticated: async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    // Check if user has admin role using server-side RPC function
    // This is more secure as it doesn't expose the user_roles table structure
    const { data, error } = await supabase.rpc('is_admin');

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return data === true;
  },

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  logout: async (): Promise<void> => {
    await supabase.auth.signOut();
  },
};
