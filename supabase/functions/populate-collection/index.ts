import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Input validation
const MAX_SLUG_LENGTH = 100;
const MAX_MOVIES = 100;
const MAX_TITLE_LENGTH = 200;
const SLUG_PATTERN = /^[a-z0-9-]+$/;

interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  popularity: number;
}

function validateInput(body: any): { valid: boolean; error?: string } {
  if (!body.collection_slug || typeof body.collection_slug !== 'string') {
    return { valid: false, error: "Missing or invalid collection_slug" };
  }
  if (body.collection_slug.length > MAX_SLUG_LENGTH) {
    return { valid: false, error: `collection_slug must be max ${MAX_SLUG_LENGTH} characters` };
  }
  if (!SLUG_PATTERN.test(body.collection_slug)) {
    return { valid: false, error: "collection_slug must contain only lowercase letters, numbers, and hyphens" };
  }
  if (!body.movies || !Array.isArray(body.movies)) {
    return { valid: false, error: "movies must be an array" };
  }
  if (body.movies.length > MAX_MOVIES) {
    return { valid: false, error: `movies array cannot exceed ${MAX_MOVIES} items` };
  }
  for (const movie of body.movies) {
    if (typeof movie !== 'string' || movie.length === 0 || movie.length > MAX_TITLE_LENGTH) {
      return { valid: false, error: `Each movie title must be a string between 1 and ${MAX_TITLE_LENGTH} characters` };
    }
  }
  return { valid: true };
}

async function verifyAdmin(req: Request): Promise<{ isAdmin: boolean; error?: string }> {
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { isAdmin: false, error: "Missing authorization header" };
  }
  
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false }
  });
  
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return { isAdmin: false, error: "Unauthorized" };
  }
  
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) {
    return { isAdmin: false, error: "Forbidden: Admin access required" };
  }
  
  return { isAdmin: true };
}

async function searchMovie(title: string): Promise<TMDBSearchResult | null> {
  const response = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&page=1`
  );
  const data = await response.json();
  return data.results?.[0] || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin access
    const { isAdmin, error: authError } = await verifyAdmin(req);
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: authError }),
        { status: authError === "Unauthorized" ? 401 : 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    
    // Validate input
    const validation = validateInput(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { collection_slug, movies } = body;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get collection ID
    const { data: collection, error: collectionError } = await supabase
      .from("collections")
      .select("id")
      .eq("slug", collection_slug)
      .single();

    if (collectionError || !collection) {
      return new Response(
        JSON.stringify({ error: "Collection not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { title: string; status: string; tmdb_id?: number }[] = [];

    // Search and add each movie
    for (let i = 0; i < movies.length; i++) {
      const movieTitle = movies[i];
      
      try {
        const tmdbResult = await searchMovie(movieTitle);
        
        if (!tmdbResult) {
          results.push({ title: movieTitle, status: "not_found" });
          continue;
        }

        // Insert into collection_movies (upsert to handle duplicates)
        const { error: insertError } = await supabase
          .from("collection_movies")
          .upsert({
            collection_id: collection.id,
            tmdb_id: tmdbResult.id,
            media_type: "movie",
            display_order: i,
            is_featured: i < 12, // First 12 are featured
          }, {
            onConflict: "collection_id,tmdb_id,media_type"
          });

        if (insertError) {
          console.error(`Error inserting ${movieTitle}:`, insertError);
          results.push({ title: movieTitle, status: "error", tmdb_id: tmdbResult.id });
        } else {
          results.push({ title: movieTitle, status: "added", tmdb_id: tmdbResult.id });
        }

        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`Error processing ${movieTitle}:`, err);
        results.push({ title: movieTitle, status: "error" });
      }
    }

    const added = results.filter(r => r.status === "added").length;
    const notFound = results.filter(r => r.status === "not_found").length;
    const errors = results.filter(r => r.status === "error").length;

    console.log(`Populated ${collection_slug}: ${added} added, ${notFound} not found, ${errors} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary: { added, notFound, errors },
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Populate collection error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
