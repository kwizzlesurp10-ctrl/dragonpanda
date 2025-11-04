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

interface HNItem {
  id: number;
  title: string;
  url?: string;
  score: number;
  by: string;
  time: number;
  descendants?: number;
}

async function fetchFromXAPI(xBearerToken: string, supabase: any) {
  const xApiUrl = 'https://api.twitter.com/2/trends/place.json?id=1';
  const response = await fetch(xApiUrl, {
    headers: {
      'Authorization': `Bearer ${xBearerToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`X API error: ${response.status}`);
  }

  const data = await response.json();
  const trends: XTrend[] = data[0]?.trends || [];

  return trends.slice(0, 20).map((trend: XTrend) => ({
    trend_name: trend.name,
    tweet_count: trend.tweet_volume || 0,
    url: trend.url || `https://x.com/search?q=${encodeURIComponent(trend.name)}`,
    category: trend.name.startsWith('#') ? 'hashtag' : 'topic',
    fetched_at: new Date().toISOString(),
  }));
}

async function fetchFromHackerNewsAPI(supabase: any) {
  const topStoriesResponse = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
  
  if (!topStoriesResponse.ok) {
    throw new Error(`HackerNews API error: ${topStoriesResponse.status}`);
  }

  const topStoryIds: number[] = await topStoriesResponse.json();
  const storiesToFetch = topStoryIds.slice(0, 20);

  const storyPromises = storiesToFetch.map(async (id) => {
    const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
    if (response.ok) {
      return await response.json() as HNItem;
    }
    return null;
  });

  const stories = (await Promise.all(storyPromises)).filter((story): story is HNItem => story !== null);

  return stories.map((story) => ({
    trend_name: story.title,
    tweet_count: story.score || 0,
    url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
    category: 'tech',
    fetched_at: new Date().toISOString(),
  }));
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
    let trendsToInsert = [];
    let source = 'x_api';
    let usedFallback = false;
    
    if (xBearerToken && xBearerToken.length > 0) {
      try {
        trendsToInsert = await fetchFromXAPI(xBearerToken, supabase);
        
        await supabase
          .from('data_sources')
          .update({
            health_status: 'healthy',
            last_success_at: new Date().toISOString(),
            last_error_message: null,
          })
          .eq('source_name', 'x_api');
      } catch (primaryError) {
        console.log('X API failed, trying fallback:', primaryError.message);
        
        await supabase
          .from('data_sources')
          .update({
            health_status: 'degraded',
            last_error_at: new Date().toISOString(),
            last_error_message: primaryError.message,
          })
          .eq('source_name', 'x_api');

        try {
          trendsToInsert = await fetchFromHackerNewsAPI(supabase);
          source = 'hackernews_api';
          usedFallback = true;
          
          await supabase
            .from('data_sources')
            .update({
              health_status: 'healthy',
              last_success_at: new Date().toISOString(),
            })
            .eq('source_name', 'hackernews_api');
        } catch (fallbackError) {
          await supabase
            .from('update_logs')
            .insert({
              source_type: 'x_api',
              status: 'error',
              items_fetched: 0,
              error_message: `Both primary and fallback failed: ${primaryError.message}; ${fallbackError.message}`
            });

          return new Response(
            JSON.stringify({ 
              ok: false, 
              message: 'Failed to fetch from both X API and fallback',
              primary_error: primaryError.message,
              fallback_error: fallbackError.message
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } else {
      console.log('X_BEARER_TOKEN not configured, using HackerNews as fallback');
      
      await supabase
        .from('data_sources')
        .update({
          health_status: 'offline',
          last_error_message: 'X_BEARER_TOKEN not configured',
        })
        .eq('source_name', 'x_api');

      try {
        trendsToInsert = await fetchFromHackerNewsAPI(supabase);
        source = 'hackernews_api';
        usedFallback = true;
        
        await supabase
          .from('data_sources')
          .update({
            health_status: 'healthy',
            last_success_at: new Date().toISOString(),
          })
          .eq('source_name', 'hackernews_api');
      } catch (fallbackError) {
        await supabase
          .from('update_logs')
          .insert({
            source_type: 'hackernews_api',
            status: 'error',
            items_fetched: 0,
            error_message: fallbackError.message
          });

        return new Response(
          JSON.stringify({ 
            ok: false, 
            message: 'X API not configured and HackerNews fallback failed',
            info: 'Configure X_BEARER_TOKEN in Supabase Edge Function secrets or check HackerNews API status',
            error: fallbackError.message
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (trendsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('x_trends')
        .insert(trendsToInsert);

      if (insertError) {
        await supabase
          .from('update_logs')
          .insert({
            source_type: source,
            status: 'error',
            items_fetched: 0,
            error_message: insertError.message
          });

        throw insertError;
      }

      await supabase
        .from('update_logs')
        .insert({
          source_type: source,
          status: 'success',
          items_fetched: trendsToInsert.length
        });
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        trends_fetched: trendsToInsert.length,
        source: source,
        used_fallback: usedFallback,
        message: usedFallback 
          ? `Successfully fetched from ${source} (X API ${xBearerToken ? 'failed' : 'not configured'})`
          : 'Successfully fetched and stored X trends'
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