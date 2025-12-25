import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Whitelist of allowed TMDB endpoints (regex patterns)
const ALLOWED_ENDPOINTS: RegExp[] = [
  /^\/movie\/\d+$/,                          // Movie details
  /^\/movie\/\d+\/credits$/,                 // Movie credits
  /^\/movie\/\d+\/recommendations$/,         // Movie recommendations
  /^\/movie\/\d+\/similar$/,                 // Similar movies
  /^\/movie\/\d+\/videos$/,                  // Movie videos
  /^\/movie\/\d+\/external_ids$/,            // External IDs
  /^\/tv\/\d+$/,                             // TV show details
  /^\/tv\/\d+\/credits$/,                    // TV credits
  /^\/tv\/\d+\/recommendations$/,            // TV recommendations
  /^\/tv\/\d+\/similar$/,                    // Similar TV shows
  /^\/tv\/\d+\/videos$/,                     // TV videos
  /^\/tv\/\d+\/external_ids$/,               // External IDs
  /^\/tv\/\d+\/season\/\d+$/,                // TV season details
  /^\/tv\/\d+\/season\/\d+\/episode\/\d+$/,  // TV episode details
  /^\/person\/\d+$/,                         // Person details
  /^\/person\/\d+\/combined_credits$/,       // Person credits
  /^\/person\/\d+\/movie_credits$/,          // Person movie credits
  /^\/person\/\d+\/tv_credits$/,             // Person TV credits
  /^\/person\/popular$/,                     // Popular people
  /^\/search\/movie$/,                       // Search movies
  /^\/search\/tv$/,                          // Search TV
  /^\/search\/multi$/,                       // Multi search
  /^\/search\/person$/,                      // Search people
  /^\/trending\/(movie|tv|all)\/(day|week)$/,// Trending
  /^\/discover\/movie$/,                     // Discover movies
  /^\/discover\/tv$/,                        // Discover TV
  /^\/movie\/popular$/,                      // Popular movies
  /^\/movie\/top_rated$/,                    // Top rated movies
  /^\/movie\/now_playing$/,                  // Now playing
  /^\/movie\/upcoming$/,                     // Upcoming movies
  /^\/tv\/popular$/,                         // Popular TV
  /^\/tv\/top_rated$/,                       // Top rated TV
  /^\/tv\/on_the_air$/,                      // On the air
  /^\/tv\/airing_today$/,                    // Airing today
  /^\/genre\/movie\/list$/,                  // Movie genres
  /^\/genre\/tv\/list$/,                     // TV genres
  /^\/configuration$/,                       // Configuration
];

// Simple in-memory rate limiter (per IP, resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  return false;
}

function isEndpointAllowed(endpoint: string): boolean {
  return ALLOWED_ENDPOINTS.some(pattern => pattern.test(endpoint));
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    
    // Check rate limit
    if (isRateLimited(clientIP)) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { endpoint, params } = await req.json();
    
    if (!endpoint) {
      console.error('Missing endpoint parameter');
      return new Response(
        JSON.stringify({ error: 'Missing endpoint parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate endpoint against whitelist
    if (!isEndpointAllowed(endpoint)) {
      console.warn(`Blocked endpoint request: ${endpoint} from IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Endpoint not allowed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!TMDB_API_KEY) {
      console.error('TMDB_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'TMDB API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build TMDB URL
    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    url.searchParams.set("api_key", TMDB_API_KEY);
    
    // Add any additional params
    if (params && typeof params === 'object') {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    console.log(`Fetching TMDB endpoint: ${endpoint}`);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`TMDB API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `TMDB API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in tmdb-proxy function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
