import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DataSourceStatus {
  source_name: string;
  token_configured: boolean;
  health_status: string;
  last_success_at: string | null;
  error_message: string | null;
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
    const githubToken = Deno.env.get('GITHUB_TOKEN');

    const sources: DataSourceStatus[] = [];

    // Check X API
    const xConfigured = !!xBearerToken && xBearerToken.length > 0;
    await supabase
      .from('data_sources')
      .update({
        token_configured: xConfigured,
        health_status: xConfigured ? 'healthy' : 'offline',
        updated_at: new Date().toISOString(),
      })
      .eq('source_name', 'x_api');

    sources.push({
      source_name: 'x_api',
      token_configured: xConfigured,
      health_status: xConfigured ? 'healthy' : 'offline',
      last_success_at: null,
      error_message: xConfigured ? null : 'X_BEARER_TOKEN not configured',
    });

    // Check GitHub API
    const githubConfigured = !!githubToken && githubToken.length > 0;
    await supabase
      .from('data_sources')
      .update({
        token_configured: githubConfigured,
        health_status: 'healthy',
        updated_at: new Date().toISOString(),
      })
      .eq('source_name', 'github_api');

    sources.push({
      source_name: 'github_api',
      token_configured: githubConfigured,
      health_status: 'healthy',
      last_success_at: null,
      error_message: githubConfigured ? null : 'GITHUB_TOKEN not configured (optional - using public API)',
    });

    // Check GitHub Trending Fallback
    try {
      const fallbackResponse = await fetch('https://api.gitterapp.com/repositories', {
        headers: { 'Accept': 'application/json' },
      });
      
      const fallbackHealthy = fallbackResponse.ok;
      await supabase
        .from('data_sources')
        .update({
          health_status: fallbackHealthy ? 'healthy' : 'degraded',
          last_success_at: fallbackHealthy ? new Date().toISOString() : null,
          last_error_message: fallbackHealthy ? null : 'Fallback API unavailable',
          updated_at: new Date().toISOString(),
        })
        .eq('source_name', 'github_trending_fallback');

      sources.push({
        source_name: 'github_trending_fallback',
        token_configured: true,
        health_status: fallbackHealthy ? 'healthy' : 'degraded',
        last_success_at: fallbackHealthy ? new Date().toISOString() : null,
        error_message: fallbackHealthy ? null : 'Fallback API unavailable',
      });
    } catch (error) {
      sources.push({
        source_name: 'github_trending_fallback',
        token_configured: true,
        health_status: 'offline',
        last_success_at: null,
        error_message: error.message,
      });
    }

    // Check HackerNews API
    try {
      const hnResponse = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
      const hnHealthy = hnResponse.ok;
      
      await supabase
        .from('data_sources')
        .update({
          health_status: hnHealthy ? 'healthy' : 'degraded',
          last_success_at: hnHealthy ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('source_name', 'hackernews_api');

      sources.push({
        source_name: 'hackernews_api',
        token_configured: true,
        health_status: hnHealthy ? 'healthy' : 'degraded',
        last_success_at: hnHealthy ? new Date().toISOString() : null,
        error_message: null,
      });
    } catch (error) {
      sources.push({
        source_name: 'hackernews_api',
        token_configured: true,
        health_status: 'offline',
        last_success_at: null,
        error_message: error.message,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        timestamp: new Date().toISOString(),
        sources,
        summary: {
          total: sources.length,
          healthy: sources.filter(s => s.health_status === 'healthy').length,
          degraded: sources.filter(s => s.health_status === 'degraded').length,
          offline: sources.filter(s => s.health_status === 'offline').length,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in health-check:', error);

    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message || 'Unknown error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});