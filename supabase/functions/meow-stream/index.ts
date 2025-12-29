import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAIN_URL = 'https://api.hlowb.com';

// Stream secret from MeowTV app - used for AES-256-GCM decryption
const STREAM_SECRET = atob('cG1TMENBTUcxUnVxNDlXYk15aEUzZmgxc091TFlFTDlydEZhellZbGpWSTJqNEJQU29nNzNoVzdBN3hNaGNlSEQwaXdyUHJWVkRYTHZ4eVdy');

// Derive AES-256 key using SHA-256 hash of the stream secret
async function deriveKey256(): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(STREAM_SECRET);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

// Derive AES-128 key from the security key (for API responses)
function deriveKey128(apiKey: string): Uint8Array {
  // Try using the key as raw UTF-8 bytes first (padded/truncated to 16)
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(apiKey);
  
  if (keyBytes.length >= 16) {
    return keyBytes.slice(0, 16);
  }
  
  const padded = new Uint8Array(16);
  padded.set(keyBytes);
  return padded;
}

// Convert base64url to standard base64 and decode
function base64UrlToBytes(b64url: string): Uint8Array {
  let s = b64url.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4;
  if (pad !== 0) s += '='.repeat(4 - pad);
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

// Handle large integers in JSON to avoid precision loss
function quoteLargeInts(text: string): string {
  return text.replace(/(:\s*)(\d{16,})/g, '$1"$2"');
}

function parseJsonPreserveBigInt<T = unknown>(text: string): T {
  const safe = quoteLargeInts(text);
  return JSON.parse(safe);
}

// Extract encrypted data from response
function extractEncryptedData(text: string): string {
  try {
    const json = JSON.parse(text);
    if (json.data && typeof json.data === 'string') {
      return json.data;
    }
  } catch { /* not JSON, use raw text */ }
  return text;
}

// AES-256-GCM Decryption for enc2: prefixed strings (stream URLs)
async function decryptEnc2(value: string): Promise<string | null> {
  if (!value || !value.startsWith('enc2:')) return value;

  try {
    const blob = base64UrlToBytes(value.substring(5));
    if (blob.length <= 12) return null;

    const iv = blob.subarray(0, 12);
    const ctAndTag = blob.subarray(12);
    const authTagLength = 16;
    if (ctAndTag.length <= authTagLength) return null;

    const ciphertext = ctAndTag.subarray(0, ctAndTag.length - authTagLength);
    const authTag = ctAndTag.subarray(ctAndTag.length - authTagLength);

    // Combine ciphertext and auth tag for Web Crypto API
    const combined = new Uint8Array(ciphertext.length + authTag.length);
    combined.set(ciphertext);
    combined.set(authTag, ciphertext.length);

    const keyBytes = await deriveKey256();
    
    // Convert to ArrayBuffer for Deno compatibility
    const keyBuffer = keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer;
    const ivBuffer = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer;
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(ivBuffer), tagLength: 128 },
      cryptoKey,
      combined
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error('[MeowTV] enc2 decryption failed:', error);
    return null;
  }
}

// Decrypt inline enc2: strings in text
function decryptInline(value: string): Promise<string> {
  if (!value.includes('enc2:')) return Promise.resolve(value);
  
  if (value.startsWith('enc2:')) {
    return decryptEnc2(value).then(decrypted => 
      (decrypted ?? value).split(/\r?\n/)[0].trim()
    );
  }
  
  // Handle multiple enc2: tokens in a string
  const tokens = value.match(/enc2:[A-Za-z0-9_-]+/g) || [];
  if (tokens.length === 0) return Promise.resolve(value);
  
  return Promise.all(tokens.map(t => decryptEnc2(t))).then(decrypted => {
    let result = value;
    tokens.forEach((token, i) => {
      result = result.replace(token, decrypted[i] ?? token);
    });
    return result;
  });
}

// AES-128-CBC Decryption for API responses
async function decryptApiResponse(responseText: string, apiKey: string): Promise<string | null> {
  try {
    const encryptedB64 = extractEncryptedData(responseText);
    console.log('[MeowTV] Decrypting API response:', { 
      responseLen: responseText.length, 
      encryptedLen: encryptedB64.length,
      keyLen: apiKey.length,
      sample: encryptedB64.slice(0, 32)
    });
    
    // Try UTF-8 key first (as raw characters)
    const aesKey = deriveKey128(apiKey);
    const iv = aesKey.slice(); // IV is same as Key in MeowTV

    const encryptedData = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0));

    // Convert to ArrayBuffer for Deno compatibility
    const keyBuffer = aesKey.buffer.slice(aesKey.byteOffset, aesKey.byteOffset + aesKey.byteLength) as ArrayBuffer;
    const ivBuffer = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer;

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-CBC' },
      false,
      ['decrypt']
    );

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: new Uint8Array(ivBuffer) },
      cryptoKey,
      encryptedData
    );

    const decrypted = new TextDecoder().decode(decryptedBuffer);
    console.log('[MeowTV] Decryption successful, length:', decrypted.length);
    return decrypted;
  } catch (error) {
    console.error('[MeowTV] API decryption failed:', error);
    
    // Try alternative: base64 decode the key
    try {
      console.log('[MeowTV] Trying base64 decoded key...');
      const encryptedB64 = extractEncryptedData(responseText);
      const keyBytes = Uint8Array.from(atob(apiKey), c => c.charCodeAt(0));
      
      // Pad to 16 bytes
      const aesKey = new Uint8Array(16);
      aesKey.set(keyBytes.slice(0, Math.min(keyBytes.length, 16)));
      
      const iv = aesKey.slice();
      const encryptedData = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0));

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        aesKey,
        { name: 'AES-CBC' },
        false,
        ['decrypt']
      );

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-CBC', iv },
        cryptoKey,
        encryptedData
      );

      const decrypted = new TextDecoder().decode(decryptedBuffer);
      console.log('[MeowTV] Base64 key decryption successful');
      return decrypted;
    } catch (e2) {
      console.error('[MeowTV] Base64 key decryption also failed:', e2);
    }
    
    return null;
  }
}

// Get security key from MeowTV API
async function getSecurityKey(retries: number = 3): Promise<{ key: string | null; cookie: string | null }> {
  const url = `${MAIN_URL}/v0.1/system/getSecurityKey/1?channel=IndiaA&clientType=1&lang=en-US`;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[MeowTV] Fetching security key, attempt ${attempt}`);
      const res = await fetch(url, {
        cache: 'no-store',
        headers: { 'User-Agent': 'okhttp/4.9.0' }
      });
      
      const cookie = res.headers.get('set-cookie');
      const text = await res.text();

      let json: { code: number; msg: string; data: string } | null = null;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        console.warn('[MeowTV] getSecurityKey parse error', { attempt, text: text.slice(0, 200) });
      }

      if (json && json.code === 200 && json.data) {
        console.log('[MeowTV] getSecurityKey ok', { 
          attempt, 
          hasCookie: Boolean(cookie), 
          key: json.data // Log full key for debugging
        });
        return { key: json.data, cookie };
      }

      console.warn('[MeowTV] getSecurityKey bad response', { attempt, code: json?.code, msg: json?.msg });
    } catch (e) {
      console.warn('[MeowTV] getSecurityKey failed', { attempt, error: String(e) });
    }
  }
  return { key: null, cookie: null };
}

// Search for content in MeowTV by title
async function searchContent(query: string, key: string): Promise<any[]> {
  const url = `${MAIN_URL}/film-api/v1.1.0/movie/searchByKeyword?channel=IndiaA&clientType=1&keyword=${encodeURIComponent(query)}&lang=en-US&mode=1&packageName=com.external.castle&page=1&size=30`;

  try {
    const res = await fetch(url);
    const payload = await res.text();
    const decryptedJson = await decryptApiResponse(payload, key);
    if (!decryptedJson) {
      console.warn('[MeowTV] search decrypt failed');
      return [];
    }

    const data = parseJsonPreserveBigInt<{ data?: { rows?: any[] } }>(decryptedJson);
    console.log('[MeowTV] Search results:', data?.data?.rows?.length || 0);
    return data?.data?.rows || [];
  } catch (e) {
    console.error('[MeowTV] search error:', e);
    return [];
  }
}

// Get movie/show details from MeowTV
async function fetchDetails(movieId: string, key: string): Promise<any | null> {
  const url = `${MAIN_URL}/film-api/v1.9.9/movie?channel=IndiaA&clientType=1&lang=en-US&movieId=${movieId}&packageName=com.external.castle`;

  try {
    const res = await fetch(url);
    const payload = await res.text();
    const decryptedJson = await decryptApiResponse(payload, key);
    if (!decryptedJson) return null;
    return parseJsonPreserveBigInt<{ data?: any }>(decryptedJson)?.data;
  } catch {
    return null;
  }
}

// Get video stream URL
async function fetchStreamUrl(
  movieId: string,
  episodeId: string,
  key: string,
  cookie: string | null,
  languageId?: number
): Promise<{ videoUrl: string; subtitles: any[]; qualities: any[] } | null> {
  const resolutions = [3, 2, 1]; // 1080p, 720p, 480p
  const collectedQualities: { quality: string; url: string }[] = [];
  let bestVideoUrl: string | null = null;
  let bestSubtitles: { language: string; url: string; label: string }[] = [];
  const cookieHeader = cookie || 'hd=on';

  for (const resolution of resolutions) {
    const url = `${MAIN_URL}/film-api/v2.0.1/movie/getVideo2?clientType=1&packageName=com.external.castle&channel=IndiaA&lang=en-US`;
    const body: Record<string, string> = {
      mode: '1',
      appMarket: 'GuanWang',
      clientType: '1',
      woolUser: 'false',
      apkSignKey: 'ED0955EB04E67A1D9F3305B95454FED485261475',
      androidVersion: '13',
      movieId,
      episodeId,
      isNewUser: 'true',
      resolution: resolution.toString(),
      packageName: 'com.external.castle'
    };
    if (languageId) body.languageId = String(languageId);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'User-Agent': 'okhttp/4.9.0',
          'Cookie': cookieHeader
        },
        body: JSON.stringify(body)
      });

      const payload = await res.text();
      const decryptedJson = await decryptApiResponse(payload, key);
      if (!decryptedJson) {
        console.warn('[MeowTV] fetchStreamUrl decrypt failed', { resolution, status: res.status });
        continue;
      }

      const data = JSON.parse(decryptedJson)?.data;
      if (data && data.videoUrl) {
        let videoUrl = data.videoUrl;
        
        // Decrypt enc2: prefixed URLs
        if (videoUrl.startsWith('enc2:')) {
          const decryptedUrl = await decryptEnc2(videoUrl);
          if (decryptedUrl) {
            videoUrl = decryptedUrl;
            console.log('[MeowTV] Decrypted stream URL successfully');
          }
        }
        
        const qualityLabel = resolution === 3 ? '1080p' : resolution === 2 ? '720p' : '480p';
        collectedQualities.push({ quality: qualityLabel, url: videoUrl });

        if (!bestVideoUrl) {
          bestVideoUrl = videoUrl;
          bestSubtitles = (data.subtitles || []).map((s: any) => {
            let subUrl = s.url || '';
            // Subtitles might also be enc2: encrypted
            return {
              language: s.abbreviate || s.title || 'Unknown',
              label: s.title || s.abbreviate || 'Subtitles',
              url: subUrl
            };
          }).filter((s: any) => Boolean(s.url));
        }
      }
    } catch (e) {
      console.error('[MeowTV] fetchStreamUrl error:', e);
    }
  }

  if (!bestVideoUrl) return null;

  // Decrypt subtitle URLs if needed
  for (let i = 0; i < bestSubtitles.length; i++) {
    if (bestSubtitles[i].url.startsWith('enc2:')) {
      const decrypted = await decryptEnc2(bestSubtitles[i].url);
      if (decrypted) bestSubtitles[i].url = decrypted;
    }
  }

  return {
    videoUrl: bestVideoUrl,
    subtitles: bestSubtitles,
    qualities: collectedQualities
  };
}

// Find MeowTV content by TMDB title search
async function findMeowContent(
  tmdbId: number,
  type: 'movie' | 'tv',
  title: string,
  key: string
): Promise<any | null> {
  const results = await searchContent(title, key);
  if (!results.length) {
    console.warn('[MeowTV] No results found for:', title);
    return null;
  }

  const normalizedTitle = title.toLowerCase().trim();
  const match = results.find((r: any) => {
    const rTitle = (r.title || '').toLowerCase().trim();
    return rTitle === normalizedTitle || rTitle.includes(normalizedTitle) || normalizedTitle.includes(rTitle);
  }) || results[0];

  return match;
}

interface StreamResult {
  streams: Array<{ url: string; quality: string; type: string }>;
  subtitles: Array<{ url: string; lang: string; label: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    let tmdbId: string | null = url.searchParams.get('tmdb_id');
    let type: string = url.searchParams.get('type') || 'movie';
    let season: string | null = url.searchParams.get('season');
    let episode: string | null = url.searchParams.get('episode');
    let title: string | null = url.searchParams.get('title');

    if (!tmdbId && req.method !== 'GET') {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await req.json().catch(() => null) as any;
        if (body) {
          tmdbId = body.tmdb_id?.toString?.() ?? null;
          type = body.type || type;
          season = body.season != null ? String(body.season) : season;
          episode = body.episode != null ? String(body.episode) : episode;
          title = body.title || title;
        }
      }
    }

    if (!tmdbId) {
      return new Response(
        JSON.stringify({ error: 'Missing tmdb_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!title) {
      return new Response(
        JSON.stringify({ error: 'Missing title parameter - required for MeowTV search' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { key, cookie } = await getSecurityKey();
    if (!key) {
      return new Response(
        JSON.stringify({ error: 'Failed to get MeowTV security key', streams: [], subtitles: [] }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const content = await findMeowContent(parseInt(tmdbId), type as 'movie' | 'tv', title, key);
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Content not found in MeowTV', streams: [], subtitles: [] }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const meowMovieId = content.id?.toString();
    console.log('[MeowTV] Found content:', { title: content.title, meowId: meowMovieId });

    let episodeId = meowMovieId;
    if (type === 'tv' && season && episode) {
      const details = await fetchDetails(meowMovieId, key);
      if (details?.episodes) {
        const seasonNum = parseInt(season);
        const episodeNum = parseInt(episode);
        
        const ep = details.episodes.find((e: any) => 
          (e.seasonNumber || 1) === seasonNum && e.number === episodeNum
        ) || details.episodes[episodeNum - 1];
        
        if (ep) {
          episodeId = ep.id?.toString() || meowMovieId;
          console.log('[MeowTV] Found episode:', { season: seasonNum, episode: episodeNum, episodeId });
        }
      }
    }

    const streamData = await fetchStreamUrl(meowMovieId, episodeId, key, cookie);
    if (!streamData) {
      return new Response(
        JSON.stringify({ error: 'No streams available', streams: [], subtitles: [] }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: StreamResult = {
      streams: streamData.qualities.map(q => ({
        url: q.url,
        quality: q.quality,
        type: 'hls'
      })),
      subtitles: streamData.subtitles.map(s => ({
        url: s.url,
        lang: s.language,
        label: s.label
      }))
    };

    console.log(`[MeowTV] Returning ${result.streams.length} streams, ${result.subtitles.length} subtitles`);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
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
