// Vercel Edge Function for OMDB API Proxy
export const config = {
  runtime: 'edge',
};

const OMDB_API_KEY = process.env.OMDB_API_KEY;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

export default async function handler(request: Request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!OMDB_API_KEY) {
    console.error('[OMDB Proxy] API key not configured');
    return new Response(
      JSON.stringify({ error: 'OMDB API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let imdbId: string | null = null;
  let title: string | null = null;
  let year: string | null = null;

  // Handle both GET (query params) and POST (JSON body) requests
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      imdbId = body.imdbId || null;
      title = body.title || null;
      year = body.year || null;
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } else {
    const url = new URL(request.url);
    imdbId = url.searchParams.get('imdbId');
    title = url.searchParams.get('title');
    year = url.searchParams.get('year');
  }

  // Build OMDB API URL - prefer IMDb ID if available
  let omdbUrl = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}`;

  if (imdbId) {
    omdbUrl += `&i=${imdbId}`;
  } else if (title) {
    omdbUrl += `&t=${encodeURIComponent(title)}`;
    if (year) {
      omdbUrl += `&y=${year}`;
    }
  } else {
    return new Response(
      JSON.stringify({ error: 'Either imdbId or title is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[OMDB Proxy] Fetching data for: ${imdbId || title}`);

  try {
    const response = await fetch(omdbUrl);
    const data = await response.json();

    if (data.Response === 'False') {
      console.log('[OMDB Proxy] No results:', data.Error);
      return new Response(
        JSON.stringify({ error: data.Error || 'Movie not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract ratings
    const ratings: { imdb?: string; rottenTomatoes?: string; metacritic?: string } = {};

    if (data.imdbRating && data.imdbRating !== 'N/A') {
      ratings.imdb = data.imdbRating;
    }

    if (data.Ratings && Array.isArray(data.Ratings)) {
      for (const rating of data.Ratings) {
        if (rating.Source === 'Rotten Tomatoes') {
          ratings.rottenTomatoes = rating.Value;
        }
        if (rating.Source === 'Metacritic') {
          ratings.metacritic = rating.Value;
        }
      }
    }

    console.log('[OMDB Proxy] Ratings extracted:', ratings);

    return new Response(
      JSON.stringify({
        ratings,
        imdbId: data.imdbID,
        imdbVotes: data.imdbVotes,
        boxOffice: data.BoxOffice,
        awards: data.Awards,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400, s-maxage=604800', // Cache 1 day client, 7 days edge
        },
      }
    );
  } catch (error) {
    console.error('[OMDB Proxy] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
