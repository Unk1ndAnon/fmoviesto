import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PRERENDER_TOKEN = Deno.env.get('PRERENDER_TOKEN');
const PRERENDER_SERVICE_URL = 'https://service.prerender.io/';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bot user agents that should receive pre-rendered content
const BOT_AGENTS = [
  'googlebot',
  'yahoo! slurp',
  'bingbot',
  'yandex',
  'baiduspider',
  'facebookexternalhit',
  'twitterbot',
  'rogerbot',
  'linkedinbot',
  'embedly',
  'quora link preview',
  'showyoubot',
  'outbrain',
  'pinterest/0.',
  'developers.google.com/+/web/snippet',
  'slackbot',
  'vkshare',
  'w3c_validator',
  'redditbot',
  'applebot',
  'whatsapp',
  'flipboard',
  'tumblr',
  'bitlybot',
  'skypeuripreview',
  'nuzzel',
  'discordbot',
  'google page speed',
  'qwantify',
  'pinterestbot',
  'bitrix link preview',
  'xing-contenttabreceiver',
  'chrome-lighthouse',
  'telegrambot'
];

// Extensions to ignore
const IGNORED_EXTENSIONS = [
  '.js', '.css', '.xml', '.less', '.png', '.jpg', '.jpeg', '.gif', 
  '.pdf', '.doc', '.txt', '.ico', '.rss', '.zip', '.mp3', '.rar', 
  '.exe', '.wmv', '.doc', '.avi', '.ppt', '.mpg', '.mpeg', '.tif', 
  '.wav', '.mov', '.psd', '.ai', '.xls', '.mp4', '.m4a', '.swf', 
  '.dat', '.dmg', '.iso', '.flv', '.m4v', '.torrent', '.woff', 
  '.woff2', '.ttf', '.svg', '.webp'
];

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_AGENTS.some(bot => ua.includes(bot));
}

function shouldPrerender(url: string, userAgent: string): boolean {
  // Check if it's a bot
  if (!isBot(userAgent)) {
    return false;
  }

  // Check for ignored extensions
  const pathname = new URL(url).pathname.toLowerCase();
  if (IGNORED_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
    return false;
  }

  return true;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, userAgent } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Prerender request for URL: ${url}, User-Agent: ${userAgent}`);

    // Check if we should prerender
    if (!shouldPrerender(url, userAgent || '')) {
      return new Response(
        JSON.stringify({ shouldPrerender: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!PRERENDER_TOKEN) {
      console.error('PRERENDER_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Prerender service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch from Prerender.io
    const prerenderUrl = `${PRERENDER_SERVICE_URL}${url}`;
    console.log(`Fetching from Prerender: ${prerenderUrl}`);

    const prerenderResponse = await fetch(prerenderUrl, {
      headers: {
        'X-Prerender-Token': PRERENDER_TOKEN,
      },
    });

    if (!prerenderResponse.ok) {
      console.error(`Prerender error: ${prerenderResponse.status}`);
      return new Response(
        JSON.stringify({ 
          shouldPrerender: true, 
          error: `Prerender returned ${prerenderResponse.status}` 
        }),
        { status: prerenderResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await prerenderResponse.text();
    console.log(`Successfully pre-rendered ${url}, HTML length: ${html.length}`);

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'X-Prerendered': 'true',
      },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Prerender error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
