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
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Telegram bot token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get updates from the bot (messages it has received)
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getUpdates?limit=20&allowed_updates=["message"]`
    );
    
    const data = await response.json();
    console.log('Telegram API response:', JSON.stringify(data, null, 2));

    if (!data.ok) {
      console.error('Telegram API error:', data.description);
      return new Response(
        JSON.stringify({ error: data.description }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract messages from updates
    const messages = data.result
      .filter((update: any) => update.message && update.message.text)
      .map((update: any) => ({
        id: update.message.message_id,
        text: update.message.text,
        from: update.message.from?.first_name || 'Anonymous',
        username: update.message.from?.username || null,
        date: update.message.date,
        chat_title: update.message.chat?.title || 'Group Chat'
      }))
      .slice(-10) // Get last 10 messages
      .reverse(); // Most recent first

    console.log(`Returning ${messages.length} messages`);

    return new Response(
      JSON.stringify({ messages }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching Telegram messages:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
