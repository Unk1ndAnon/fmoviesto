import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MEOW_API_BASE = 'https://api.hlowb.com';

// AES-128-CBC Decryption
async function decryptAES(encryptedData: string, key: Uint8Array, iv: Uint8Array): Promise<string> {
  try {
    const keyBuffer = key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer;
    const ivBuffer = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer;
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-CBC' },
      false,
      ['decrypt']
    );
    
    const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: new Uint8Array(ivBuffer) },
      cryptoKey,
      encryptedBytes
    );
    
    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt stream data');
  }
}

// Get security key from MeowTV API
async function getSecurityKey(): Promise<{ key: Uint8Array; iv: Uint8Array }> {
  console.log('[MeowTV] Fetching security key from:', `${MEOW_API_BASE}/api/v1/sec`);
  
  const response = await fetch(`${MEOW_API_BASE}/api/v1/sec`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Referer': 'https://meowtv.to/',
      'Origin': 'https://meowtv.to',
    },
  });
  
  console.log('[MeowTV] Security key response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'No response body');
    console.error('[MeowTV] Security key error response:', errorText);
    throw new Error(`Failed to get security key: ${response.status}`);
  }
  
  const data = await response.json();
  console.log('[MeowTV] Security key response keys:', Object.keys(data));
  
  // The key and iv are returned as hex strings
  const keyHex = data.key || data.k;
  const ivHex = data.iv || data.i;
  
  if (!keyHex || !ivHex) {
    throw new Error('Invalid security key response');
  }
  
  const key = new Uint8Array(keyHex.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
  
  return { key, iv };
}

// Fetch stream data from MeowTV
interface StreamResult {
  streams: Array<{
    url: string;
    quality: string;
    type: string;
  }>;
  subtitles: Array<{
    url: string;
    lang: string;
    label: string;
  }>;
}

async function fetchMovieStream(tmdbId: number): Promise<StreamResult> {
  console.log(`[MeowTV] Fetching movie stream for TMDB ID: ${tmdbId}`);

  const response = await fetch(`${MEOW_API_BASE}/api/v1/movie/${tmdbId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Referer': 'https://meowtv.to/',
    },
  });

  if (!response.ok) {
    console.error(`[MeowTV] API response error: ${response.status}`);
    throw new Error(`API returned ${response.status}`);
  }

  const data = await response.json();
  console.log('[MeowTV] Raw response:', JSON.stringify(data).substring(0, 200));

  return parseStreamResponse(data);
}

async function fetchTVStream(tmdbId: number, season: number, episode: number): Promise<StreamResult> {
  console.log(`[MeowTV] Fetching TV stream for TMDB ID: ${tmdbId}, S${season}E${episode}`);

  const response = await fetch(`${MEOW_API_BASE}/api/v1/tv/${tmdbId}/${season}/${episode}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Referer': 'https://meowtv.to/',
    },
  });

  if (!response.ok) {
    console.error(`[MeowTV] API response error: ${response.status}`);
    throw new Error(`API returned ${response.status}`);
  }

  const data = await response.json();
  console.log('[MeowTV] Raw response:', JSON.stringify(data).substring(0, 200));

  return parseStreamResponse(data);
}

async function parseStreamResponse(data: any): Promise<StreamResult> {
  // If data is encrypted, only then attempt to fetch the security key.
  if (data?.encrypted || data?.e) {
    const encryptedContent = data.data || data.d || data.content;
    if (!encryptedContent) throw new Error('Encrypted response missing payload');

    const { key, iv } = await getSecurityKey();

    try {
      const decrypted = await decryptAES(encryptedContent, key, iv);
      const parsed = JSON.parse(decrypted);
      return parseDecryptedData(parsed);
    } catch (error) {
      console.error('[MeowTV] Decryption failed:', error);
      throw new Error('Failed to decrypt stream data');
    }
  }

  // Data is not encrypted, parse directly
  return parseDecryptedData(data);
}

function wrapWithProxy(url: string): string {
  const absoluteUrl = url.startsWith('http') ? url : `https:${url}`;
  return `/functions/v1/meow-proxy?url=${encodeURIComponent(absoluteUrl)}`;
}

function parseDecryptedData(data: any): StreamResult {
  const result: StreamResult = {
    streams: [],
    subtitles: [],
  };
  
  // Parse streams - handle various response formats
  const sources = data.sources || data.streams || data.playlist || [];
  
  if (Array.isArray(sources)) {
    for (const source of sources) {
      const url = source.url || source.file || source.src;
      if (url && (url.includes('.m3u8') || url.includes('hls') || source.type === 'hls')) {
        result.streams.push({
          url: wrapWithProxy(url),
          quality: source.quality || source.label || 'Auto',
          type: 'hls',
        });
      }
    }
  } else if (typeof sources === 'string' && sources.includes('.m3u8')) {
    result.streams.push({
      url: wrapWithProxy(sources),
      quality: 'Auto',
      type: 'hls',
    });
  }
  
  // Also check for single source
  const singleUrl = data.url || data.file || data.source;
  if (singleUrl && !result.streams.find(s => s.url.includes(encodeURIComponent(singleUrl)))) {
    result.streams.push({
      url: wrapWithProxy(singleUrl),
      quality: data.quality || 'Auto',
      type: 'hls',
    });
  }
  
  // Parse subtitles - also proxy them
  const subs = data.subtitles || data.tracks || data.captions || [];
  if (Array.isArray(subs)) {
    for (const sub of subs) {
      const url = sub.url || sub.file || sub.src;
      if (url) {
        result.subtitles.push({
          url: wrapWithProxy(url),
          lang: sub.lang || sub.language || sub.srclang || 'en',
          label: sub.label || sub.name || sub.language || 'English',
        });
      }
    }
  }
  
  console.log(`[MeowTV] Parsed ${result.streams.length} streams, ${result.subtitles.length} subtitles`);
  
  return result;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const url = new URL(req.url);

    let tmdbId: string | null = url.searchParams.get('tmdb_id');
    let type: string = url.searchParams.get('type') || 'movie';
    let season: string | null = url.searchParams.get('season');
    let episode: string | null = url.searchParams.get('episode');

    // Also support POST JSON body so the web app can call this via functions.invoke
    if (!tmdbId && req.method !== 'GET') {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await req.json().catch(() => null) as any;
        if (body) {
          tmdbId = body.tmdb_id?.toString?.() ?? null;
          type = body.type || type;
          season = body.season != null ? String(body.season) : season;
          episode = body.episode != null ? String(body.episode) : episode;
        }
      }
    }

    if (!tmdbId) {
      return new Response(
        JSON.stringify({ error: 'Missing tmdb_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const id = parseInt(tmdbId);
    
    let result: StreamResult;
    
    if (type === 'tv') {
      if (!season || !episode) {
        return new Response(
          JSON.stringify({ error: 'Missing season or episode parameter for TV' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      result = await fetchTVStream(id, parseInt(season), parseInt(episode));
    } else {
      result = await fetchMovieStream(id);
    }
    
    if (result.streams.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No streams found', streams: [], subtitles: [] }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        } 
      }
    );
    
  } catch (error) {
    console.error('[MeowTV] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stream';
    return new Response(
      JSON.stringify({ error: errorMessage, streams: [], subtitles: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
