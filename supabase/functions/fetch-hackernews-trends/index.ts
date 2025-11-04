import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface HNItem {
  id: number;
  title: string;
  url?: string;
  score: number;
  by: string;
  time: number;
  descendants?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    const trendsToInsert = stories.map((story) => ({
      trend_name: story.title,
      tweet_count: story.score || 0,
      url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
      category: 'tech',
      fetched_at: new Date().toISOString(),
    }));

    if (trendsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('x_trends')
        .insert(trendsToInsert);

      if (insertError) {
        await supabase
          .from('update_logs')
          .insert({
            source_type: 'hackernews_api',
            status: 'error',
            items_fetched: 0,
            error_message: insertError.message
          });

        throw insertError;
      }

      await supabase
        .from('data_sources')
        .update({
          health_status: 'healthy',
          last_success_at: new Date().toISOString(),
          last_error_message: null,
        })
        .eq('source_name', 'hackernews_api');

      await supabase
        .from('update_logs')
        .insert({
          source_type: 'hackernews_api',
          status: 'success',
          items_fetched: trendsToInsert.length
        });
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        trends_fetched: trendsToInsert.length,
        source: 'hackernews_api',
        message: 'Successfully fetched and stored HackerNews trending stories as fallback'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-hackernews-trends:', error);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase
        .from('data_sources')
        .update({
          health_status: 'offline',
          last_error_at: new Date().toISOString(),
          last_error_message: error.message,
        })
        .eq('source_name', 'hackernews_api');
    }
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error.message || 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});