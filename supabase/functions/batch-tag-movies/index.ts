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

// Input validation schemas
const VALID_ACTIONS = ["queue", "queue_page", "process", "stats", "tag_single"];
const VALID_MEDIA_TYPES = ["movie", "tv"];
const VALID_SOURCES = ["trending", "popular"];
const MAX_LIMIT = 50;
const MAX_PAGES = 10;
const MAX_TMDB_IDS = 100;

function validateInput(body: any): { valid: boolean; error?: string } {
  if (body.action && !VALID_ACTIONS.includes(body.action)) {
    return { valid: false, error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}` };
  }
  if (body.media_type && !VALID_MEDIA_TYPES.includes(body.media_type)) {
    return { valid: false, error: `Invalid media_type. Must be one of: ${VALID_MEDIA_TYPES.join(", ")}` };
  }
  if (body.source && !VALID_SOURCES.includes(body.source)) {
    return { valid: false, error: `Invalid source. Must be one of: ${VALID_SOURCES.join(", ")}` };
  }
  if (body.limit !== undefined) {
    const limit = Number(body.limit);
    if (isNaN(limit) || limit < 1 || limit > MAX_LIMIT) {
      return { valid: false, error: `Invalid limit. Must be between 1 and ${MAX_LIMIT}` };
    }
  }
  if (body.pages !== undefined) {
    const pages = Number(body.pages);
    if (isNaN(pages) || pages < 1 || pages > MAX_PAGES) {
      return { valid: false, error: `Invalid pages. Must be between 1 and ${MAX_PAGES}` };
    }
  }
  if (body.tmdb_ids) {
    if (!Array.isArray(body.tmdb_ids)) {
      return { valid: false, error: "tmdb_ids must be an array" };
    }
    if (body.tmdb_ids.length > MAX_TMDB_IDS) {
      return { valid: false, error: `tmdb_ids array cannot exceed ${MAX_TMDB_IDS} items` };
    }
    if (!body.tmdb_ids.every((id: any) => typeof id === 'number' && id > 0)) {
      return { valid: false, error: "All tmdb_ids must be positive numbers" };
    }
  }
  if (body.tmdb_id !== undefined) {
    const tmdbId = Number(body.tmdb_id);
    if (isNaN(tmdbId) || tmdbId < 1) {
      return { valid: false, error: "tmdb_id must be a positive number" };
    }
  }
  return { valid: true };
}

async function verifyAdmin(req: Request): Promise<{ isAdmin: boolean; error?: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { isAdmin: false, error: "Missing authorization header" };
  }
  
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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

// Actions that require admin authentication
const ADMIN_ONLY_ACTIONS = ["queue", "queue_page", "process", "stats"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate input
    const validation = validateInput(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, limit = 10, tmdb_ids, media_type = "movie", source = "trending", tmdb_id, pages = 1 } = body;

    // Only require admin for admin-only actions
    if (ADMIN_ONLY_ACTIONS.includes(action)) {
      const { isAdmin, error: authError } = await verifyAdmin(req);
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: authError }),
          { status: authError === "Unauthorized" ? 401 : 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "queue") {
      // Queue movies for tagging - fetch from TMDB directly or use provided IDs
      let moviesToQueue: { tmdb_id: number; media_type: string }[] = [];

      if (tmdb_ids && Array.isArray(tmdb_ids)) {
        // Use provided TMDB IDs
        moviesToQueue = tmdb_ids.map(id => ({ tmdb_id: id, media_type }));
      } else {
        // Fetch from TMDB based on source
        const endpoint = source === "popular" 
          ? (media_type === "tv" ? "/tv/popular" : "/movie/popular")
          : (media_type === "tv" ? "/trending/tv/week" : "/trending/movie/week");

        const tmdbResponse = await fetch(`${supabaseUrl}/functions/v1/tmdb-proxy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({ endpoint, params: {} })
        });

        if (tmdbResponse.ok) {
          const tmdbData = await tmdbResponse.json();
          moviesToQueue = (tmdbData.results || [])
            .slice(0, limit)
            .map((item: any) => ({ 
              tmdb_id: item.id, 
              media_type 
            }));
        }
      }

      // Filter out already tagged movies
      const { data: existingMeta } = await supabase
        .from("movie_meta")
        .select("tmdb_id")
        .eq("media_type", media_type)
        .not("tagged_at", "is", null);

      const existingIds = new Set((existingMeta || []).map(m => m.tmdb_id));
      moviesToQueue = moviesToQueue.filter(m => !existingIds.has(m.tmdb_id));

      // Add to job queue (skip if already exists)
      const jobs = moviesToQueue.map(m => ({
        tmdb_id: m.tmdb_id,
        media_type: m.media_type,
        status: "pending"
      }));

      if (jobs.length > 0) {
        const { error: insertError } = await supabase
          .from("tag_jobs")
          .upsert(jobs, { onConflict: "tmdb_id,media_type", ignoreDuplicates: true });

        if (insertError) throw insertError;
      }

      return new Response(
        JSON.stringify({ success: true, queued: jobs.length, source }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "queue_page") {
      // Queue multiple pages from TMDB for batch processing
      let totalQueued = 0;
      const maxPages = Math.min(pages, MAX_PAGES);

      for (let page = 1; page <= maxPages; page++) {
        const endpoint = source === "popular" 
          ? (media_type === "tv" ? "/tv/popular" : "/movie/popular")
          : (media_type === "tv" ? "/trending/tv/week" : "/trending/movie/week");

        const tmdbResponse = await fetch(`${supabaseUrl}/functions/v1/tmdb-proxy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({ endpoint, params: { page: String(page) } })
        });

        if (tmdbResponse.ok) {
          const tmdbData = await tmdbResponse.json();
          const items = (tmdbData.results || []).map((item: any) => ({
            tmdb_id: item.id,
            media_type,
            status: "pending"
          }));

          if (items.length > 0) {
            const { error } = await supabase
              .from("tag_jobs")
              .upsert(items, { onConflict: "tmdb_id,media_type", ignoreDuplicates: true });

            if (!error) {
              totalQueued += items.length;
            }
          }
        }

        // Small delay between pages
        await new Promise(r => setTimeout(r, 200));
      }

      return new Response(
        JSON.stringify({ success: true, queued: totalQueued }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "process") {
      const safeLimit = Math.min(limit, MAX_LIMIT);
      // Process pending jobs - fetch from TMDB and tag
      const { data: pendingJobs, error: fetchError } = await supabase
        .from("tag_jobs")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(safeLimit);

      if (fetchError) throw fetchError;

      const results = [];

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

          // Build metadata for AI tagging
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

          // Call AI tagging function (internal call with service key)
          const tagResponse = await fetch(`${supabaseUrl}/functions/v1/ai-tag-movie`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
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
          const tagCount = await saveTags(supabase, job.tmdb_id, job.media_type, tagResult.tags);

          // Update movie_meta to track tagging status
          await supabase
            .from("movie_meta")
            .upsert({
              tmdb_id: job.tmdb_id,
              media_type: job.media_type,
              tagged_at: new Date().toISOString(),
              last_fetch_at: new Date().toISOString(),
              tag_count: tagCount
            }, { onConflict: "tmdb_id,media_type" });

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
            title: metadata.title,
            success: true, 
            tags_count: tagResult.tags.length 
          });

          console.log(`Tagged: ${metadata.title} (${job.tmdb_id}) - ${tagResult.tags.length} tags`);

          // Rate limit - wait between requests
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`Error processing job ${job.id}:`, error);
          
          await supabase
            .from("tag_jobs")
            .update({ 
              status: job.retries >= 2 ? "failed" : "pending",
              error_message: error instanceof Error ? error.message : "Unknown error",
              retries: (job.retries || 0) + 1
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
      console.log("Fetching stats...");
      
      // Get job counts by status
      const { data: jobs, error: jobsError } = await supabase
        .from("tag_jobs")
        .select("status");
      
      if (jobsError) {
        console.error("Error fetching jobs:", jobsError);
        throw jobsError;
      }
      
      const stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
      jobs?.forEach(job => {
        if (job.status in stats) {
          stats[job.status as keyof typeof stats]++;
        }
      });
      
      console.log("Job stats:", stats);

      const { count: tagCount } = await supabase
        .from("tags")
        .select("*", { count: "exact", head: true });

      const { count: movieTagCount } = await supabase
        .from("movie_tags")
        .select("*", { count: "exact", head: true });

      const { count: taggedMoviesCount } = await supabase
        .from("movie_meta")
        .select("*", { count: "exact", head: true })
        .not("tagged_at", "is", null);

      // Get counts by media type for auto-tagging stats
      const { count: taggedMoviesOnly } = await supabase
        .from("movie_meta")
        .select("*", { count: "exact", head: true })
        .eq("media_type", "movie")
        .not("tagged_at", "is", null);

      const { count: taggedTVOnly } = await supabase
        .from("movie_meta")
        .select("*", { count: "exact", head: true })
        .eq("media_type", "tv")
        .not("tagged_at", "is", null);

      return new Response(
        JSON.stringify({ 
          success: true, 
          jobs: stats,
          total_tags: tagCount,
          total_movie_tags: movieTagCount,
          tagged_movies: taggedMoviesCount,
          auto_tagged: {
            movies: taggedMoviesOnly || 0,
            tv_shows: taggedTVOnly || 0,
            total: taggedMoviesCount || 0
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "tag_single") {
      // Tag a single movie/TV show by TMDB ID
      const singleId = Number(tmdb_id);
      const singleType = media_type;
      
      if (!singleId || singleId < 1) {
        return new Response(
          JSON.stringify({ error: "Missing or invalid tmdb_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch from TMDB
      const tmdbResponse = await fetch(`${supabaseUrl}/functions/v1/tmdb-proxy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({
          endpoint: singleType === "tv" ? `/tv/${singleId}` : `/movie/${singleId}`,
          params: { append_to_response: "keywords,credits" }
        })
      });

      if (!tmdbResponse.ok) {
        throw new Error(`TMDB fetch failed: ${tmdbResponse.status}`);
      }

      const movieData = await tmdbResponse.json();

      const metadata = {
        tmdb_id: singleId,
        media_type: singleType,
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

      // Call AI tagging (internal call with service key)
      const tagResponse = await fetch(`${supabaseUrl}/functions/v1/ai-tag-movie`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
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

      // Save tags
      const tagCount = await saveTags(supabase, singleId, singleType, tagResult.tags);

      // Update movie_meta
      await supabase
        .from("movie_meta")
        .upsert({
          tmdb_id: singleId,
          media_type: singleType,
          tagged_at: new Date().toISOString(),
          last_fetch_at: new Date().toISOString(),
          tag_count: tagCount
        }, { onConflict: "tmdb_id,media_type" });

      return new Response(
        JSON.stringify({ 
          success: true, 
          tmdb_id: singleId,
          title: metadata.title,
          tags: tagResult.tags,
          tag_count: tagCount
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Invalid action. Use: ${VALID_ACTIONS.join(", ")}` }),
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
): Promise<number> {
  let savedCount = 0;

  for (const tag of tags) {
    // Generate slug from name
    const slug = tag.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    // Upsert tag
    const { data: existingTag } = await supabase
      .from("tags")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

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
    const { error: linkError } = await supabase
      .from("movie_tags")
      .upsert({
        tmdb_id,
        media_type,
        tag_id: tagId,
        confidence: tag.confidence,
        source: tag.type === 'genre' ? 'tmdb_import' : 'ai_batch'
      }, { onConflict: "tmdb_id,media_type,tag_id" });

    if (!linkError) {
      savedCount++;
    }
  }

  return savedCount;
}
