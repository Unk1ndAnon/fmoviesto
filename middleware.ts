// Vercel Edge Middleware for bot detection and prerendering
// This file should be placed at the root of your project for Vercel

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

function shouldPrerender(pathname: string, userAgent: string): boolean {
  if (!isBot(userAgent)) {
    return false;
  }

  const lowerPath = pathname.toLowerCase();
  if (IGNORED_EXTENSIONS.some(ext => lowerPath.endsWith(ext))) {
    return false;
  }

  // Only prerender movie and TV show pages
  if (lowerPath.startsWith('/movie/') || lowerPath.startsWith('/tv/') || lowerPath.startsWith('/watch/')) {
    return true;
  }

  return false;
}

export const config = {
  matcher: ['/movie/:path*', '/tv/:path*', '/watch/:path*'],
};

export default async function middleware(request: Request) {
  const userAgent = request.headers.get('user-agent') || '';
  const url = new URL(request.url);

  if (shouldPrerender(url.pathname, userAgent)) {
    // Call our Supabase Edge Function to get pre-rendered content
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    if (supabaseUrl) {
      try {
        const prerenderResponse = await fetch(`${supabaseUrl}/functions/v1/prerender`, {
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
            return new Response(html, {
              headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'X-Prerendered': 'true',
              },
            });
          }
        }
      } catch (error) {
        console.error('Prerender middleware error:', error);
      }
    }
  }

  // Continue with normal request
  return undefined;
}
