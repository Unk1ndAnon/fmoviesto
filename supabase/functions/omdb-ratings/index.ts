import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imdbId, title, year } = await req.json();
    const OMDB_API_KEY = Deno.env.get('OMDB_API_KEY');

    if (!OMDB_API_KEY) {
      console.error('OMDB_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'OMDB API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    console.log(`Fetching OMDB data for: ${imdbId || title}`);

    const response = await fetch(omdbUrl);
    const data = await response.json();

    if (data.Response === 'False') {
      console.log('OMDB returned no results:', data.Error);
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

    console.log('OMDB ratings extracted:', ratings);

    return new Response(
      JSON.stringify({
        ratings,
        imdbId: data.imdbID,
        imdbVotes: data.imdbVotes,
        boxOffice: data.BoxOffice,
        awards: data.Awards,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in omdb-ratings function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
