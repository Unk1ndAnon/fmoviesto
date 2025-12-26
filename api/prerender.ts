// Vercel Edge Function for bot detection and prerendering (Vite-compatible)
export const config = {
  runtime: 'edge',
};

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
  'messenger',
];

// Use environment variable for Supabase URL
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://fblsoqabliezhxtswfah.supabase.co';

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_AGENTS.some(bot => ua.includes(bot));
}

export default async function handler(request: Request) {
  const userAgent = request.headers.get('user-agent') || '';
  const url = new URL(request.url);

  // Only prerender for bots
  if (!isBot(userAgent)) {
    // Return null to let Vercel serve the SPA
    return new Response(null, {
      status: 200,
      headers: {
        'x-middleware-next': '1',
      },
    });
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
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Prerendered': 'true',
            'Cache-Control': 'public, max-age=86400, s-maxage=86400',
          },
        });
      }
    }

    console.log(`[Prerender] Edge function returned: ${prerenderResponse.status}`);
  } catch (error) {
    console.error('[Prerender] Error:', error);
  }

  // Fall back - let Vercel serve the SPA
  return new Response(null, {
    status: 200,
    headers: {
      'x-middleware-next': '1',
    },
  });
}
