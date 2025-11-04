import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = {
      x_trends: { status: 'skipped', message: '' },
      github_trending: { status: 'skipped', message: '' },
      knowledge_sync: { status: 'skipped', message: '' },
    };

    const { data: recentXUpdate } = await supabase
      .from('update_logs')
      .select('created_at')
      .eq('source_type', 'x_api')
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const shouldUpdateX = !recentXUpdate || 
      (Date.now() - new Date(recentXUpdate.created_at).getTime()) > 15 * 60 * 1000;

    if (shouldUpdateX) {
      try {
        const xResponse = await fetch(`${supabaseUrl}/functions/v1/fetch-x-trends`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        });
        const xData = await xResponse.json();
        results.x_trends = {
          status: xResponse.ok ? 'success' : 'error',
          message: xData.message || xData.error || 'Unknown status'
        };
      } catch (error) {
        results.x_trends = {
          status: 'error',
          message: error.message
        };
      }
    } else {
      results.x_trends = {
        status: 'skipped',
        message: 'Updated recently, skipping to respect rate limits'
      };
    }

    const { data: recentGitHubUpdate } = await supabase
      .from('update_logs')
      .select('created_at')
      .eq('source_type', 'github_api')
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const shouldUpdateGitHub = !recentGitHubUpdate || 
      (Date.now() - new Date(recentGitHubUpdate.created_at).getTime()) > 60 * 60 * 1000;

    if (shouldUpdateGitHub) {
      try {
        const githubResponse = await fetch(`${supabaseUrl}/functions/v1/fetch-github-trending`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        });
        const githubData = await githubResponse.json();
        results.github_trending = {
          status: githubResponse.ok ? 'success' : 'error',
          message: githubData.message || githubData.error || 'Unknown status'
        };
      } catch (error) {
        results.github_trending = {
          status: 'error',
          message: error.message
        };
      }
    } else {
      results.github_trending = {
        status: 'skipped',
        message: 'Updated recently, skipping to respect rate limits'
      };
    }

    const { data: oldTrends } = await supabase
      .from('x_trends')
      .select('id')
      .lt('fetched_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (oldTrends && oldTrends.length > 0) {
      await supabase
        .from('x_trends')
        .delete()
        .lt('fetched_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    }

    const { data: oldRepos } = await supabase
      .from('github_repos')
      .select('id')
      .lt('fetched_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (oldRepos && oldRepos.length > 0) {
      await supabase
        .from('github_repos')
        .delete()
        .lt('fetched_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    }

    const { data: recentKnowledgeSync } = await supabase
      .from('update_logs')
      .select('created_at')
      .eq('source_type', 'knowledge_sync')
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const shouldSyncKnowledge = !recentKnowledgeSync ||
      (Date.now() - new Date(recentKnowledgeSync.created_at).getTime()) > 60 * 60 * 1000;

    if (shouldSyncKnowledge && (results.x_trends.status === 'success' || results.github_trending.status === 'success')) {
      try {
        const knowledgeResponse = await fetch(`${supabaseUrl}/functions/v1/sync-knowledge`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        });
        const knowledgeData = await knowledgeResponse.json();
        results.knowledge_sync = {
          status: knowledgeResponse.ok ? 'success' : 'error',
          message: knowledgeData.message || knowledgeData.error || 'Unknown status'
        };
      } catch (error) {
        results.knowledge_sync = {
          status: 'error',
          message: error.message
        };
      }
    } else {
      results.knowledge_sync = {
        status: 'skipped',
        message: shouldSyncKnowledge ? 'No new data to sync' : 'Synced recently'
      };
    }

    return new Response(
      JSON.stringify({ 
        ok: true,
        message: 'Update orchestration completed',
        results,
        cleanup: {
          old_trends_removed: oldTrends?.length || 0,
          old_repos_removed: oldRepos?.length || 0
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-orchestrator:', error);
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error.message || 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});