import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MovieMetadata {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  overview: string;
  genres: string[];
  keywords?: string[];
  cast?: string[];
  director?: string;
  tagline?: string;
  year?: string;
}

interface TagResult {
  name: string;
  type: string;
  confidence: number;
}

// Input validation
const MAX_TITLE_LENGTH = 500;
const MAX_OVERVIEW_LENGTH = 2000;
const MAX_ARRAY_LENGTH = 50;

function validateMetadata(metadata: any): { valid: boolean; error?: string } {
  if (!metadata || typeof metadata !== 'object') {
    return { valid: false, error: "Missing metadata object" };
  }
  if (!metadata.tmdb_id || typeof metadata.tmdb_id !== 'number' || metadata.tmdb_id < 1) {
    return { valid: false, error: "Invalid or missing tmdb_id" };
  }
  if (metadata.media_type && !["movie", "tv"].includes(metadata.media_type)) {
    return { valid: false, error: "media_type must be 'movie' or 'tv'" };
  }
  if (metadata.title && (typeof metadata.title !== 'string' || metadata.title.length > MAX_TITLE_LENGTH)) {
    return { valid: false, error: `title must be a string with max ${MAX_TITLE_LENGTH} characters` };
  }
  if (metadata.overview && (typeof metadata.overview !== 'string' || metadata.overview.length > MAX_OVERVIEW_LENGTH)) {
    return { valid: false, error: `overview must be a string with max ${MAX_OVERVIEW_LENGTH} characters` };
  }
  if (metadata.genres && (!Array.isArray(metadata.genres) || metadata.genres.length > MAX_ARRAY_LENGTH)) {
    return { valid: false, error: `genres must be an array with max ${MAX_ARRAY_LENGTH} items` };
  }
  if (metadata.keywords && (!Array.isArray(metadata.keywords) || metadata.keywords.length > MAX_ARRAY_LENGTH)) {
    return { valid: false, error: `keywords must be an array with max ${MAX_ARRAY_LENGTH} items` };
  }
  if (metadata.cast && (!Array.isArray(metadata.cast) || metadata.cast.length > MAX_ARRAY_LENGTH)) {
    return { valid: false, error: `cast must be an array with max ${MAX_ARRAY_LENGTH} items` };
  }
  return { valid: true };
}

async function verifyAdmin(req: Request): Promise<{ isAdmin: boolean; error?: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { isAdmin: false, error: "Missing authorization header" };
  }
  
  const token = authHeader.replace("Bearer ", "");
  
  // Allow internal service role calls
  if (token === supabaseServiceKey) {
    return { isAdmin: true };
  }
  
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
    const { metadata } = body as { metadata: MovieMetadata };

    // Validate input
    const validation = validateMetadata(metadata);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build prompt for AI tagging
    const prompt = buildTaggingPrompt(metadata);

    console.log(`Generating tags for: ${metadata.title} (${metadata.tmdb_id})`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a movie tagging expert. Your job is to analyze movie metadata and generate descriptive tags that help users discover content. Generate tags across these categories:
- mood: emotional tone (dark, uplifting, tense, romantic, nostalgic, eerie, etc.)
- theme: underlying themes (redemption, family, survival, identity, corruption, etc.)
- setting: time/place (80s, dystopian, small-town, urban, historical, etc.)
- style: visual/narrative style (noir, found-footage, slow-burn, ensemble, etc.)
- audience: target audience (family-friendly, mature, date-night, etc.)

Return a JSON array of tags. Each tag should have: name (lowercase, hyphenated), type (mood/theme/setting/style/audience), confidence (0.7-1.0).
Only include tags with high confidence (>0.7). Limit to 8-12 most relevant tags.`
          },
          { role: "user", content: prompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_tags",
              description: "Generate descriptive tags for a movie",
              parameters: {
                type: "object",
                properties: {
                  tags: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Tag name in lowercase with hyphens" },
                        type: { type: "string", enum: ["mood", "theme", "setting", "style", "audience"] },
                        confidence: { type: "number", minimum: 0.7, maximum: 1.0 }
                      },
                      required: ["name", "type", "confidence"]
                    }
                  }
                },
                required: ["tags"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_tags" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    
    // Extract tags from tool call response
    let tags: TagResult[] = [];
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        tags = parsed.tags || [];
      } catch (e) {
        console.error("Failed to parse AI response:", e);
      }
    }

    console.log(`Generated ${tags.length} tags for ${metadata.title}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        tmdb_id: metadata.tmdb_id,
        media_type: metadata.media_type,
        tags: tags 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("AI tagging error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildTaggingPrompt(metadata: MovieMetadata): string {
  const parts = [
    `Title: ${metadata.title}`,
    metadata.year ? `Year: ${metadata.year}` : null,
    metadata.tagline ? `Tagline: "${metadata.tagline}"` : null,
    `Overview: ${metadata.overview}`,
    metadata.genres?.length ? `Genres: ${metadata.genres.join(", ")}` : null,
    metadata.cast?.length ? `Main Cast: ${metadata.cast.slice(0, 5).join(", ")}` : null,
    metadata.director ? `Director: ${metadata.director}` : null,
    metadata.keywords?.length ? `Keywords: ${metadata.keywords.slice(0, 10).join(", ")}` : null,
  ];

  return parts.filter(Boolean).join("\n");
}
