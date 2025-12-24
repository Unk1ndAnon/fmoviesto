import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
const SITE_URL = 'https://fmovies-sigma.vercel.app';
const SITE_NAME = 'Fmovies';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bot user agents that should receive pre-rendered content
const BOT_AGENTS = [
  'googlebot',
  'google-inspectiontool',
  'google-structured-data-testing-tool',
  'googleother',
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
  'pinterestbot',
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
  'bitrix link preview',
  'xing-contenttabreceiver',
  'chrome-lighthouse',
  'telegrambot',
  'screaming frog',
  'semrushbot',
  'ahrefs',
  'mj12bot',
  'dotbot',
  'petalbot',
  'seznambot',
  'sogou',
  'exabot',
  'duckduckbot',
  'ia_archiver',
  'mediapartners-google',
  'adsbot-google',
];

// Extensions to ignore
const IGNORED_EXTENSIONS = [
  '.js', '.css', '.xml', '.less', '.png', '.jpg', '.jpeg', '.gif', 
  '.pdf', '.doc', '.txt', '.ico', '.rss', '.zip', '.mp3', '.rar', 
  '.exe', '.wmv', '.doc', '.avi', '.ppt', '.mpg', '.mpeg', '.tif', 
  '.wav', '.mov', '.psd', '.ai', '.xls', '.mp4', '.m4a', '.swf', 
  '.dat', '.dmg', '.iso', '.flv', '.m4v', '.torrent', '.woff', 
  '.woff2', '.ttf', '.svg', '.webp', '.json', '.map'
];

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_AGENTS.some(bot => ua.includes(bot));
}

function shouldPrerender(url: string, userAgent: string): boolean {
  if (!isBot(userAgent)) {
    return false;
  }

  const urlObj = new URL(url);
  const pathname = urlObj.pathname.toLowerCase();
  
  if (IGNORED_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
    return false;
  }

  return true;
}

// Convert slug to title (e.g., "the-matrix" -> "The Matrix")
function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Parse season/episode from URL format like "season-1-episode-5"
function parseSeasonEpisode(seasonEpisode: string): { season: number; episode: number } {
  const match = seasonEpisode.match(/season-(\d+)-episode-(\d+)/i);
  if (match) {
    return { season: parseInt(match[1]), episode: parseInt(match[2]) };
  }
  return { season: 1, episode: 1 };
}

// TMDB API helpers
async function searchMovie(title: string): Promise<any | null> {
  if (!TMDB_API_KEY) return null;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`
    );
    const data = await res.json();
    return data.results?.[0] || null;
  } catch {
    return null;
  }
}

async function searchTV(title: string): Promise<any | null> {
  if (!TMDB_API_KEY) return null;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`
    );
    const data = await res.json();
    return data.results?.[0] || null;
  } catch {
    return null;
  }
}

async function getMovieDetails(id: number): Promise<any | null> {
  if (!TMDB_API_KEY) return null;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}`
    );
    return await res.json();
  } catch {
    return null;
  }
}

async function getTVDetails(id: number): Promise<any | null> {
  if (!TMDB_API_KEY) return null;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_API_KEY}`
    );
    return await res.json();
  } catch {
    return null;
  }
}

async function getEpisodeDetails(tvId: number, season: number, episode: number): Promise<any | null> {
  if (!TMDB_API_KEY) return null;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/tv/${tvId}/season/${season}/episode/${episode}?api_key=${TMDB_API_KEY}`
    );
    return await res.json();
  } catch {
    return null;
  }
}

// Extract year from date string
function extractYear(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return dateStr.split('-')[0] || '';
}

// Generate meta HTML for movies
function generateMovieMetaHtml(movie: any, fullUrl: string): string {
  const title = movie.title || 'Unknown Movie';
  const year = extractYear(movie.release_date);
  const overview = movie.overview || '';
  const backdropPath = movie.backdrop_path;
  const imageUrl = backdropPath ? `https://image.tmdb.org/t/p/original${backdropPath}` : '';
  
  const pageTitle = `Watch ${title} (${year}) Online Free – ${SITE_NAME}`;
  const description = `Watch ${title} (${year}) online free in HD on ${SITE_NAME}. Stream movies instantly without signup.`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  
  <meta property="og:type" content="video.movie">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(`Watch ${title} (${year}) online free in HD on ${SITE_NAME}.`)}">
  <meta property="og:url" content="${escapeHtml(fullUrl)}">
  ${imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}">` : ''}
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(`Watch ${title} (${year}) online free in HD on ${SITE_NAME}.`)}">
  ${imageUrl ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">` : ''}
  
  <link rel="canonical" href="${escapeHtml(fullUrl)}">
</head>
<body>
  <h1>${escapeHtml(pageTitle)}</h1>
  <p>${escapeHtml(overview)}</p>
  <script>window.location.href = "${escapeHtml(fullUrl)}";</script>
</body>
</html>`;
}

// Generate meta HTML for TV shows
function generateTVShowMetaHtml(show: any, fullUrl: string): string {
  const name = show.name || 'Unknown TV Show';
  const year = extractYear(show.first_air_date);
  const overview = show.overview || '';
  const backdropPath = show.backdrop_path;
  const imageUrl = backdropPath ? `https://image.tmdb.org/t/p/original${backdropPath}` : '';
  
  const pageTitle = `Watch ${name} (${year}) TV Series Online Free – ${SITE_NAME}`;
  const description = `Watch ${name} TV series online free in HD on ${SITE_NAME}. Stream all seasons and episodes instantly.`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  
  <meta property="og:type" content="video.tv_show">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:title" content="${escapeHtml(`Watch ${name} TV Series Online Free – ${SITE_NAME}`)}">
  <meta property="og:description" content="${escapeHtml(`Watch ${name} TV series online free in HD. Stream all seasons on ${SITE_NAME}.`)}">
  <meta property="og:url" content="${escapeHtml(fullUrl)}">
  ${imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}">` : ''}
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(`Watch ${name} TV Series Online Free – ${SITE_NAME}`)}">
  <meta name="twitter:description" content="${escapeHtml(`Watch ${name} TV series online free in HD on ${SITE_NAME}.`)}">
  ${imageUrl ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">` : ''}
  
  <link rel="canonical" href="${escapeHtml(fullUrl)}">
</head>
<body>
  <h1>${escapeHtml(pageTitle)}</h1>
  <p>${escapeHtml(overview)}</p>
  <script>window.location.href = "${escapeHtml(fullUrl)}";</script>
</body>
</html>`;
}

// Generate meta HTML for episodes
function generateEpisodeMetaHtml(show: any, episode: any, season: number, episodeNum: number, fullUrl: string): string {
  const showName = show.name || 'Unknown TV Show';
  const episodeName = episode?.name || '';
  const overview = episode?.overview || show.overview || '';
  const backdropPath = episode?.still_path || show.backdrop_path;
  const imageUrl = backdropPath ? `https://image.tmdb.org/t/p/original${backdropPath}` : '';
  
  const pageTitle = `Watch ${showName} – Season ${season} Episode ${episodeNum} Online Free – ${SITE_NAME}`;
  const ogTitle = `Watch ${showName} – S${season}E${episodeNum} Online Free – ${SITE_NAME}`;
  const description = `Watch ${showName} Season ${season} Episode ${episodeNum} online free in HD on ${SITE_NAME}. Stream instantly without signup.`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  
  <meta property="og:type" content="video.episode">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:title" content="${escapeHtml(ogTitle)}">
  <meta property="og:description" content="${escapeHtml(`Watch ${showName} Season ${season} Episode ${episodeNum} online free in HD on ${SITE_NAME}.`)}">
  <meta property="og:url" content="${escapeHtml(fullUrl)}">
  ${imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}">` : ''}
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
  <meta name="twitter:description" content="${escapeHtml(`Watch ${showName} Season ${season} Episode ${episodeNum} online free in HD on ${SITE_NAME}.`)}">
  ${imageUrl ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">` : ''}
  
  <link rel="canonical" href="${escapeHtml(fullUrl)}">
</head>
<body>
  <h1>${escapeHtml(pageTitle)}</h1>
  ${episodeName ? `<h2>${escapeHtml(episodeName)}</h2>` : ''}
  <p>${escapeHtml(overview)}</p>
  <script>window.location.href = "${escapeHtml(fullUrl)}";</script>
</body>
</html>`;
}

// Escape HTML entities
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Remove URL params for canonical URL
function getCleanUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.origin}${urlObj.pathname}`;
  } catch {
    return url;
  }
}

// Parse URL and determine page type
interface PageInfo {
  type: 'movie' | 'tv' | 'episode' | 'unknown';
  slug: string;
  season?: number;
  episode?: number;
}

function parseUrl(url: string): PageInfo {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Watch page: /watch/movie-slug or /watch/tv-slug/season-X-episode-Y
    const watchMatch = pathname.match(/^\/watch\/([^\/]+)(?:\/(.+))?$/);
    if (watchMatch) {
      const slug = watchMatch[1];
      const seasonEpisode = watchMatch[2];
      
      if (seasonEpisode) {
        const { season, episode } = parseSeasonEpisode(seasonEpisode);
        return { type: 'episode', slug, season, episode };
      }
      return { type: 'movie', slug };
    }
    
    // TV page: /tv/show-slug
    const tvMatch = pathname.match(/^\/tv\/([^\/]+)$/);
    if (tvMatch) {
      return { type: 'tv', slug: tvMatch[1] };
    }
    
    // Movie page: /movie/movie-slug
    const movieMatch = pathname.match(/^\/movie\/([^\/]+)$/);
    if (movieMatch) {
      return { type: 'movie', slug: movieMatch[1] };
    }
    
    return { type: 'unknown', slug: '' };
  } catch {
    return { type: 'unknown', slug: '' };
  }
}

serve(async (req) => {
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

    if (!shouldPrerender(url, userAgent || '')) {
      return new Response(
        JSON.stringify({ shouldPrerender: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pageInfo = parseUrl(url);
    const cleanUrl = getCleanUrl(url);
    
    console.log(`Page type: ${pageInfo.type}, Slug: ${pageInfo.slug}`);

    // Handle movie pages
    if (pageInfo.type === 'movie' && pageInfo.slug) {
      const title = slugToTitle(pageInfo.slug);
      const searchResult = await searchMovie(title);
      
      if (searchResult?.id) {
        const movie = await getMovieDetails(searchResult.id);
        if (movie) {
          const html = generateMovieMetaHtml(movie, cleanUrl);
          return new Response(html, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/html; charset=utf-8',
              'X-Prerendered': 'true',
              'Cache-Control': 'public, max-age=86400', // 24 hours
            },
          });
        }
      }
    }
    
    // Handle TV show pages
    if (pageInfo.type === 'tv' && pageInfo.slug) {
      const title = slugToTitle(pageInfo.slug);
      const searchResult = await searchTV(title);
      
      if (searchResult?.id) {
        const show = await getTVDetails(searchResult.id);
        if (show) {
          const html = generateTVShowMetaHtml(show, cleanUrl);
          return new Response(html, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/html; charset=utf-8',
              'X-Prerendered': 'true',
              'Cache-Control': 'public, max-age=86400',
            },
          });
        }
      }
    }
    
    // Handle episode pages
    if (pageInfo.type === 'episode' && pageInfo.slug && pageInfo.season && pageInfo.episode) {
      const title = slugToTitle(pageInfo.slug);
      const searchResult = await searchTV(title);
      
      if (searchResult?.id) {
        const [show, episode] = await Promise.all([
          getTVDetails(searchResult.id),
          getEpisodeDetails(searchResult.id, pageInfo.season, pageInfo.episode),
        ]);
        
        if (show) {
          const html = generateEpisodeMetaHtml(show, episode, pageInfo.season, pageInfo.episode, cleanUrl);
          return new Response(html, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/html; charset=utf-8',
              'X-Prerendered': 'true',
              'Cache-Control': 'public, max-age=86400',
            },
          });
        }
      }
    }

    // Fallback: return shouldPrerender true but no content (let client render)
    return new Response(
      JSON.stringify({ shouldPrerender: true, noContent: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Prerender error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
