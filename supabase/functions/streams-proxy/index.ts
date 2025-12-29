import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const STREAMS_API_BASE = "http://twkg0oc0co8c8g8gskkkc48k.80.240.19.37.sslip.io";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, id, title, season, episode } = await req.json();

    if (!type || !id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing type or id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build endpoint URL
    let endpoint = `${STREAMS_API_BASE}/api/streams/${type}/${id}`;
    if (type === 'tv' && season && episode) {
      endpoint = `${STREAMS_API_BASE}/api/streams/tv/${id}/${season}/${episode}`;
    }

    // Add title as query parameter
    const url = new URL(endpoint);
    if (title) {
      url.searchParams.set('title', title);
    }

    console.log(`[StreamsProxy] Fetching: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[StreamsProxy] API returned ${response.status}`);
      return new Response(
        JSON.stringify({ success: false, error: `API returned ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`[StreamsProxy] Success: ${data.count || 0} streams found`);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[StreamsProxy] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});