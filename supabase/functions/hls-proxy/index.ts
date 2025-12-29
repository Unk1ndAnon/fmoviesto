import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing url parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[HLSProxy] Proxying: ${targetUrl.substring(0, 100)}...`);

    // Forward headers from client
    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
    };

    // Forward range header for video streaming
    const rangeHeader = req.headers.get('range');
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok && response.status !== 206) {
      console.error(`[HLSProxy] Upstream error: ${response.status}`);
      return new Response(
        JSON.stringify({ error: `Upstream returned ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine content type
    let contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Fix content type for m3u8 files
    if (targetUrl.includes('.m3u8') || targetUrl.includes('playlist')) {
      contentType = 'application/vnd.apple.mpegurl';
    } else if (targetUrl.includes('.ts')) {
      contentType = 'video/mp2t';
    } else if (targetUrl.includes('.mp4')) {
      contentType = 'video/mp4';
    } else if (targetUrl.includes('.vtt') || targetUrl.includes('.srt')) {
      contentType = 'text/vtt';
    }

    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': contentType,
    };

    // Forward relevant headers
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }

    const contentRange = response.headers.get('content-range');
    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange;
    }

    // Get the base URL of the Supabase project for proxy rewrites
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const proxyBase = `${supabaseUrl}/functions/v1/hls-proxy`;

    // For m3u8 playlists, rewrite URLs to go through proxy
    if (contentType.includes('mpegurl') || contentType.includes('m3u8') || targetUrl.includes('.m3u8')) {
      const text = await response.text();
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
      
      // Rewrite relative URLs to absolute, then wrap in proxy
      const rewritten = text.split('\n').map(line => {
        const trimmed = line.trim();
        
        // Skip comments and empty lines
        if (trimmed.startsWith('#') || trimmed === '') {
          // Check for URI= in EXT-X-KEY or similar tags
          if (trimmed.includes('URI="')) {
            return trimmed.replace(/URI="([^"]+)"/, (match, uri) => {
              let absoluteUrl: string;
              if (uri.startsWith('http://') || uri.startsWith('https://')) {
                absoluteUrl = uri;
              } else if (uri.startsWith('/')) {
                const parsed = new URL(targetUrl);
                absoluteUrl = `${parsed.protocol}//${parsed.host}${uri}`;
              } else {
                absoluteUrl = baseUrl + uri;
              }
              return `URI="${proxyBase}?url=${encodeURIComponent(absoluteUrl)}"`;
            });
          }
          return line;
        }
        
        // This is a URL line (segment or playlist reference)
        let absoluteUrl: string;
        
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          absoluteUrl = trimmed;
        } else if (trimmed.startsWith('/')) {
          // Absolute path
          const parsed = new URL(targetUrl);
          absoluteUrl = `${parsed.protocol}//${parsed.host}${trimmed}`;
        } else {
          // Relative path
          absoluteUrl = baseUrl + trimmed;
        }
        
        // Wrap in our proxy
        return `${proxyBase}?url=${encodeURIComponent(absoluteUrl)}`;
      }).join('\n');

      return new Response(rewritten, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    // For binary content (video segments, mp4), stream directly
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('[HLSProxy] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Proxy error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
