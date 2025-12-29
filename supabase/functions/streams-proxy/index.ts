import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// API disabled - return empty response
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[StreamsProxy] API disabled');
  
  return new Response(
    JSON.stringify({ success: false, streams: [], error: 'API disabled' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
