import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  popularity: number;
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
    const { collection_slug, movies } = await req.json();

    if (!collection_slug || !movies || !Array.isArray(movies)) {
      return new Response(
        JSON.stringify({ error: "Missing collection_slug or movies array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
