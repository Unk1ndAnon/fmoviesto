import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TagResult {
  name: string;
  type: string;
  confidence: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, limit = 10, tmdb_ids } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "queue") {
      // Queue movies for tagging from admin_movies table
      const { data: movies, error } = await supabase
        .from("admin_movies")
        .select("tmdb_id, media_type")
        .limit(limit);

      if (error) throw error;

      // Add to job queue (skip if already exists)
      const jobs = movies?.map(m => ({
        tmdb_id: m.tmdb_id,
        media_type: m.media_type,
        status: "pending"
      })) || [];

      if (jobs.length > 0) {
        const { error: insertError } = await supabase
          .from("tag_jobs")
          .upsert(jobs, { onConflict: "tmdb_id,media_type", ignoreDuplicates: true });

        if (insertError) throw insertError;
      }

      return new Response(
        JSON.stringify({ success: true, queued: jobs.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "process") {
      // Process pending jobs
      const { data: pendingJobs, error: fetchError } = await supabase
        .from("tag_jobs")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(limit);

      if (fetchError) throw fetchError;

      const results = [];
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

      for (const job of pendingJobs || []) {
        try {
          // Mark as processing
          await supabase
            .from("tag_jobs")
            .update({ status: "processing" })
            .eq("id", job.id);

          // Fetch movie details from TMDB via our proxy
          const tmdbResponse = await fetch(`${supabaseUrl}/functions/v1/tmdb-proxy`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({
              endpoint: job.media_type === "tv" ? `/tv/${job.tmdb_id}` : `/movie/${job.tmdb_id}`,
              params: { append_to_response: "keywords,credits" }
            })
          });

          if (!tmdbResponse.ok) {
            throw new Error(`TMDB fetch failed: ${tmdbResponse.status}`);
          }

          const movieData = await tmdbResponse.json();

          // Build metadata
          const metadata = {
            tmdb_id: job.tmdb_id,
            media_type: job.media_type,
            title: movieData.title || movieData.name,
            overview: movieData.overview,
            genres: movieData.genres?.map((g: any) => g.name) || [],
            keywords: movieData.keywords?.keywords?.map((k: any) => k.name) || 
                     movieData.keywords?.results?.map((k: any) => k.name) || [],
            cast: movieData.credits?.cast?.slice(0, 5).map((c: any) => c.name) || [],
            director: movieData.credits?.crew?.find((c: any) => c.job === "Director")?.name,
            tagline: movieData.tagline,
            year: (movieData.release_date || movieData.first_air_date)?.split("-")[0]
          };

          // Call AI tagging function
          const tagResponse = await fetch(`${supabaseUrl}/functions/v1/ai-tag-movie`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({ metadata })
          });

          if (!tagResponse.ok) {
            const errorText = await tagResponse.text();
            throw new Error(`AI tagging failed: ${errorText}`);
          }

          const tagResult = await tagResponse.json();

          if (!tagResult.success || !tagResult.tags) {
            throw new Error("No tags generated");
          }

          // Save tags to database
          await saveTags(supabase, job.tmdb_id, job.media_type, tagResult.tags);

          // Mark job as completed
          await supabase
            .from("tag_jobs")
            .update({ 
              status: "completed", 
              output_tags: tagResult.tags,
              input_data: metadata,
              processed_at: new Date().toISOString()
            })
            .eq("id", job.id);

          results.push({ 
            tmdb_id: job.tmdb_id, 
            success: true, 
            tags_count: tagResult.tags.length 
          });

          // Rate limit - wait between requests
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`Error processing job ${job.id}:`, error);
          
          await supabase
            .from("tag_jobs")
            .update({ 
              status: job.retries >= 2 ? "failed" : "pending",
              error_message: error instanceof Error ? error.message : "Unknown error",
              retries: job.retries + 1
            })
            .eq("id", job.id);

          results.push({ 
            tmdb_id: job.tmdb_id, 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error" 
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, processed: results.length, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "stats") {
      const { data: stats } = await supabase
        .from("tag_jobs")
        .select("status")
        .then(({ data }) => {
          const counts = { pending: 0, processing: 0, completed: 0, failed: 0 };
          data?.forEach(job => {
            counts[job.status as keyof typeof counts]++;
          });
          return { data: counts };
        });

      const { count: tagCount } = await supabase
        .from("tags")
        .select("*", { count: "exact", head: true });

      const { count: movieTagCount } = await supabase
        .from("movie_tags")
        .select("*", { count: "exact", head: true });

      return new Response(
        JSON.stringify({ 
          success: true, 
          jobs: stats,
          total_tags: tagCount,
          total_movie_tags: movieTagCount
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: queue, process, or stats" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Batch tagging error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function saveTags(
  supabase: any, 
  tmdb_id: number, 
  media_type: string,
  tags: TagResult[]
) {
  for (const tag of tags) {
    // Generate slug from name
    const slug = tag.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    // Upsert tag
    const { data: existingTag } = await supabase
      .from("tags")
      .select("id")
      .eq("slug", slug)
      .single();

    let tagId: string;

    if (existingTag) {
      tagId = existingTag.id;
    } else {
      const { data: newTag, error: insertError } = await supabase
        .from("tags")
        .insert({
          name: tag.name.replace(/-/g, ' '),
          slug,
          tag_type: tag.type,
          source: tag.type === 'genre' ? 'tmdb_genre' : 'ai_generated'
        })
        .select("id")
        .single();

      if (insertError || !newTag) {
        console.error("Error inserting tag:", insertError);
        continue;
      }
      tagId = newTag.id;
    }

    // Link tag to movie
    await supabase
      .from("movie_tags")
      .upsert({
        tmdb_id,
        media_type,
        tag_id: tagId,
        confidence: tag.confidence,
        source: tag.type === 'genre' ? 'tmdb_import' : 'ai_batch'
      }, { onConflict: "tmdb_id,media_type,tag_id" });
  }
}
