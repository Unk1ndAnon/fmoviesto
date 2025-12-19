import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = 'https://fmov.online';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const tmdbApiKey = Deno.env.get('TMDB_API_KEY');
    
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not configured');
      return new Response(JSON.stringify({ error: 'Bot token not configured' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const update = await req.json();
    console.log('Received Telegram update:', JSON.stringify(update, null, 2));

    const message = update.message;
    if (!message || !message.text) {
      return new Response(JSON.stringify({ ok: true }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    // Handle /movies command
    if (text.startsWith('/movies')) {
      const query = text.replace('/movies', '').trim();
      
      if (!query) {
        await sendTelegramMessage(botToken, chatId, 
          '🎬 *How to use /movies command:*\n\n' +
          'Enter the name of a movie or TV show after the command.\n\n' +
          '*Examples:*\n' +
          '`/movies Inception`\n' +
          '`/movies Breaking Bad`\n' +
          '`/movies Avatar 2`',
          'Markdown'
        );
        return new Response(JSON.stringify({ ok: true }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Search TMDB for movies/shows
      if (!tmdbApiKey) {
        await sendTelegramMessage(botToken, chatId, '❌ Error: TMDB API is not configured.');
        return new Response(JSON.stringify({ ok: true }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${tmdbApiKey}&query=${encodeURIComponent(query)}&language=en-US&include_adult=false`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      console.log('TMDB search results:', JSON.stringify(searchData, null, 2));

      if (!searchData.results || searchData.results.length === 0) {
        await sendTelegramMessage(botToken, chatId, 
          `🔍 No results found for: *${query}*\n\nTry a different title.`,
          'Markdown'
        );
        return new Response(JSON.stringify({ ok: true }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Filter only movies and TV shows
      const results = searchData.results
        .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
        .slice(0, 5);

      if (results.length === 0) {
        await sendTelegramMessage(botToken, chatId, 
          `🔍 No movies or TV shows found for: *${query}*`,
          'Markdown'
        );
        return new Response(JSON.stringify({ ok: true }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Build response message with links
      let responseText = `🎬 *Results for "${query}":*\n\n`;
      
      for (const item of results) {
        const title = item.title || item.name;
        const year = (item.release_date || item.first_air_date || '').substring(0, 4);
        const type = item.media_type === 'movie' ? 'Movie' : 'TV Show';
        const rating = item.vote_average ? `⭐ ${item.vote_average.toFixed(1)}` : '';
        const slug = createSlug(title);
        const url = item.media_type === 'movie' 
          ? `${SITE_URL}/movie/${item.id}/${slug}`
          : `${SITE_URL}/tv/${item.id}/${slug}`;
        
        responseText += `🎥 *${title}* ${year ? `(${year})` : ''} - ${type} ${rating}\n`;
        responseText += `🔗 ${url}\n\n`;
      }

      await sendTelegramMessage(botToken, chatId, responseText, 'Markdown');
    }

    // Handle /start command
    if (text === '/start') {
      await sendTelegramMessage(botToken, chatId,
        '👋 *Welcome to Fmov Bot!*\n\n' +
        '🎬 Use the `/movies` command to find movies and TV shows.\n\n' +
        '*Example:* `/movies Inception`',
        'Markdown'
      );
    }

    // Handle /help command
    if (text === '/help') {
      await sendTelegramMessage(botToken, chatId,
        '📖 *Available commands:*\n\n' +
        '`/movies [title]` - Search for movies and TV shows\n' +
        '`/start` - Start the bot\n' +
        '`/help` - Show this help message',
        'Markdown'
      );
    }

    return new Response(JSON.stringify({ ok: true }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing Telegram webhook:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

async function sendTelegramMessage(botToken: string, chatId: number, text: string, parseMode?: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const body: any = {
    chat_id: chatId,
    text: text,
    disable_web_page_preview: false,
  };
  
  if (parseMode) {
    body.parse_mode = parseMode;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  console.log('Send message response:', JSON.stringify(data, null, 2));
  return data;
}

function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/[šś]/g, 's')
    .replace(/[žź]/g, 'z')
    .replace(/đ/g, 'dj')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
