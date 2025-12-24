// Vercel Edge Middleware for bot detection and prerendering
// This file should be placed at the root of your project for Vercel
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BOT_AGENTS = [
  'googlebot',
  'yahoo! slurp',
  'bingbot',
  'yandex',
  'baiduspider',
  'facebookexternalhit',
  'facebot',
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
  'telegrambot',
  'messenger'
];

const IGNORED_EXTENSIONS = [
  '.js', '.css', '.xml', '.less', '.png', '.jpg', '.jpeg', '.gif',
  '.pdf', '.doc', '.txt', '.ico', '.rss', '.zip', '.mp3', '.rar',
  '.exe', '.wmv', '.doc', '.avi', '.ppt', '.mpg', '.mpeg', '.tif',
  '.wav', '.mov', '.psd', '.ai', '.xls', '.mp4', '.m4a', '.swf',
  '.dat', '.dmg', '.iso', '.flv', '.m4v', '.torrent', '.woff',
  '.woff2', '.ttf', '.svg', '.webp'
];

// Supabase project URL - hardcoded since env vars don't work reliably in edge
const SUPABASE_URL = 'https://fblsoqabliezhxtswfah.supabase.co';

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_AGENTS.some(bot => ua.includes(bot));
}

function shouldPrerender(pathname: string, userAgent: string): boolean {
  if (!isBot(userAgent)) {
    return false;
  }

  const lowerPath = pathname.toLowerCase();
  if (IGNORED_EXTENSIONS.some(ext => lowerPath.endsWith(ext))) {
    return false;
  }

  // Prerender movie, TV show, and watch pages:
  // /movie/{slug} - movie detail pages
  // /tv/{slug} - TV show detail pages
  // /watch/{slug} - movie watch pages
  // /watch/{slug}/season-X-episode-Y - TV episode watch pages
  if (
    lowerPath.startsWith('/movie/') || 
    lowerPath.startsWith('/tv/') || 
    lowerPath.startsWith('/watch/')
  ) {
    return true;
  }

  return false;
}

export const config = {
  matcher: ['/movie/:path*', '/tv/:path*', '/watch/:path*'],
};

export default async function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  const url = new URL(request.url);

  // Only prerender for bots
  if (!shouldPrerender(url.pathname, userAgent)) {
    return NextResponse.next();
  }

  try {
    console.log(`[Prerender] Bot detected: ${userAgent.slice(0, 50)}`);
    console.log(`[Prerender] URL: ${request.url}`);
    
    const prerenderResponse = await fetch(`${SUPABASE_URL}/functions/v1/prerender`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: request.url,
        userAgent: userAgent,
      }),
    });

    if (prerenderResponse.ok) {
      const contentType = prerenderResponse.headers.get('content-type');
      if (contentType?.includes('text/html')) {
        const html = await prerenderResponse.text();
        console.log(`[Prerender] Success, HTML length: ${html.length}`);
        return new Response(html, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Prerendered': 'true',
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }
    }
    
    console.log(`[Prerender] Edge function returned: ${prerenderResponse.status}`);
  } catch (error) {
    console.error('[Prerender] Middleware error:', error);
  }

  // Fall back to normal SPA rendering
  return NextResponse.next();
}
