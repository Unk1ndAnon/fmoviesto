// Vercel Edge Function for TMDB API Proxy
export const config = {
  runtime: 'edge',
};

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const ALLOWED_ENDPOINTS = [
  /^\/movie\/\d+$/,
  /^\/movie\/\d+\/credits$/,
  /^\/movie\/\d+\/similar$/,
  /^\/movie\/\d+\/videos$/,
  /^\/movie\/\d+\/watch\/providers$/,
  /^\/movie\/popular$/,
  /^\/movie\/now_playing$/,
  /^\/movie\/top_rated$/,
  /^\/movie\/upcoming$/,
  /^\/tv\/\d+$/,
  /^\/tv\/\d+\/credits$/,
  /^\/tv\/\d+\/similar$/,
  /^\/tv\/\d+\/videos$/,
  /^\/tv\/\d+\/watch\/providers$/,
  /^\/tv\/\d+\/season\/\d+$/,
  /^\/tv\/popular$/,
  /^\/tv\/on_the_air$/,
  /^\/tv\/top_rated$/,
  /^\/tv\/airing_today$/,
  /^\/trending\/movie\/week$/,
  /^\/trending\/movie\/day$/,
  /^\/trending\/tv\/week$/,
  /^\/trending\/tv\/day$/,
  /^\/trending\/all\/week$/,
  /^\/search\/movie$/,
  /^\/search\/tv$/,
  /^\/search\/multi$/,
  /^\/search\/person$/,
  /^\/genre\/movie\/list$/,
  /^\/genre\/tv\/list$/,
  /^\/discover\/movie$/,
  /^\/discover\/tv$/,
  /^\/person\/\d+$/,
  /^\/person\/\d+\/movie_credits$/,
  /^\/person\/\d+\/tv_credits$/,
  /^\/person\/\d+\/combined_credits$/,
  /^\/person\/popular$/,
  /^\/configuration$/,
  /^\/configuration\/countries$/,
  /^\/configuration\/languages$/,
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

function isEndpointAllowed(endpoint: string): boolean {
  return ALLOWED_ENDPOINTS.some(pattern => pattern.test(endpoint));
}

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  record.count++;
  return record.count > RATE_LIMIT_MAX_REQUESTS;
}

export default async function handler(request: Request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let endpoint: string | null = null;
  let params: Record<string, string> = {};

  // Handle both GET (query params) and POST (JSON body) requests
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      endpoint = body.endpoint;
      params = body.params || {};
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } else {
    const url = new URL(request.url);
    endpoint = url.searchParams.get('endpoint');
    url.searchParams.forEach((value, key) => {
      if (key !== 'endpoint') {
        params[key] = value;
      }
    });
  }

  if (!endpoint) {
    return new Response(
      JSON.stringify({ error: 'Missing endpoint parameter' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate endpoint
  if (!isEndpointAllowed(endpoint)) {
    return new Response(
      JSON.stringify({ error: 'Endpoint not allowed' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check rate limiting
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  
  if (isRateLimited(clientIP)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!TMDB_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'TMDB API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Build TMDB URL with all params
    const tmdbUrl = new URL(`${TMDB_BASE_URL}${endpoint}`);
    tmdbUrl.searchParams.set('api_key', TMDB_API_KEY);
    
    // Add all params to URL
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        tmdbUrl.searchParams.set(key, String(value));
      }
    });

    console.log(`[TMDB Proxy] Fetching: ${endpoint}`);

    const response = await fetch(tmdbUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'TMDB API error', details: data }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=600',
      },
    });
  } catch (error) {
    console.error('[TMDB Proxy] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
