import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface XTrend {
  name: string;
  tweet_volume?: number;
  url?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const xBearerToken = Deno.env.get('X_BEARER_TOKEN');
    
    if (!xBearerToken) {
      const { error: logError } = await supabase
        .from('update_logs')
        .insert({
          source_type: 'x_api',
          status: 'error',
          items_fetched: 0,
          error_message: 'X_BEARER_TOKEN not configured'
        });

      return new Response(
        JSON.stringify({ 
          ok: false, 
          message: 'X API not configured. Add X_BEARER_TOKEN to environment variables.',
          info: 'Visit https://developer.x.com to get your API credentials.'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const xApiUrl = 'https://api.twitter.com/2/trends/place.json?id=1';
    const response = await fetch(xApiUrl, {
      headers: {
        'Authorization': `Bearer ${xBearerToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      await supabase
        .from('update_logs')
        .insert({
          source_type: 'x_api',
          status: 'error',
          items_fetched: 0,
          error_message: `X API error: ${response.status} - ${errorText}`
        });

      return new Response(
        JSON.stringify({ 
          ok: false, 
          message: 'Failed to fetch from X API',
          details: errorText 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const trends: XTrend[] = data[0]?.trends || [];

    const trendsToInsert = trends.slice(0, 20).map((trend: XTrend) => ({
      trend_name: trend.name,
      tweet_count: trend.tweet_volume || 0,
      url: trend.url || `https://x.com/search?q=${encodeURIComponent(trend.name)}`,
      category: trend.name.startsWith('#') ? 'hashtag' : 'topic',
      fetched_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('x_trends')
      .insert(trendsToInsert);

    if (insertError) {
      await supabase
        .from('update_logs')
        .insert({
          source_type: 'x_api',
          status: 'error',
          items_fetched: 0,
          error_message: insertError.message
        });

      throw insertError;
    }

    await supabase
      .from('update_logs')
      .insert({
        source_type: 'x_api',
        status: 'success',
        items_fetched: trendsToInsert.length
      });

    return new Response(
      JSON.stringify({ 
        ok: true, 
        trends_fetched: trendsToInsert.length,
        message: 'Successfully fetched and stored X trends'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-x-trends:', error);
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error.message || 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});