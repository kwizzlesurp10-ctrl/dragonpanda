import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface GitHubRepo {
  full_name: string;
  description: string;
  stargazers_count: number;
  language: string;
  html_url: string;
  topics: string[];
}

interface FallbackRepo {
  name: string;
  owner: string;
  description: string;
  stars: number;
  language: string;
  url: string;
}

async function fetchFromGitHubAPI(githubToken: string | undefined, supabase: any) {
  const today = new Date();
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateStr = lastWeek.toISOString().split('T')[0];

  const githubApiUrl = `https://api.github.com/search/repositories?q=created:>${dateStr}&sort=stars&order=desc&per_page=30`;
  
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'DragonAndPanda-TrendTracker',
  };

  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }

  const response = await fetch(githubApiUrl, { headers });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();
  const repos: GitHubRepo[] = data.items || [];

  return repos.map((repo: GitHubRepo) => ({
    repo_name: repo.full_name,
    description: repo.description || 'No description available',
    stars: repo.stargazers_count,
    language: repo.language || 'Unknown',
    url: repo.html_url,
    topics: repo.topics || [],
    fetched_at: new Date().toISOString(),
  }));
}

async function fetchFromFallbackAPI(supabase: any) {
  const fallbackUrl = 'https://api.gitterapp.com/repositories';
  
  const response = await fetch(fallbackUrl, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'DragonAndPanda-TrendTracker',
    },
  });

  if (!response.ok) {
    throw new Error(`Fallback API error: ${response.status}`);
  }

  const repos: FallbackRepo[] = await response.json();

  return repos.slice(0, 30).map((repo: FallbackRepo) => ({
    repo_name: `${repo.owner}/${repo.name}`,
    description: repo.description || 'No description available',
    stars: repo.stars || 0,
    language: repo.language || 'Unknown',
    url: repo.url || `https://github.com/${repo.owner}/${repo.name}`,
    topics: [],
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

    const githubToken = Deno.env.get('GITHUB_TOKEN');
    let reposToInsert = [];
    let source = 'github_api';
    let usedFallback = false;

    try {
      reposToInsert = await fetchFromGitHubAPI(githubToken, supabase);
      
      await supabase
        .from('data_sources')
        .update({
          health_status: 'healthy',
          last_success_at: new Date().toISOString(),
          success_count: supabase.rpc('increment', { x: 1 }),
          last_error_message: null,
        })
        .eq('source_name', 'github_api');
    } catch (primaryError) {
      console.log('GitHub API failed, trying fallback:', primaryError.message);
      
      await supabase
        .from('data_sources')
        .update({
          health_status: 'degraded',
          last_error_at: new Date().toISOString(),
          last_error_message: primaryError.message,
          error_count: supabase.rpc('increment', { x: 1 }),
        })
        .eq('source_name', 'github_api');

      try {
        reposToInsert = await fetchFromFallbackAPI(supabase);
        source = 'github_trending_fallback';
        usedFallback = true;
        
        await supabase
          .from('data_sources')
          .update({
            health_status: 'healthy',
            last_success_at: new Date().toISOString(),
            success_count: supabase.rpc('increment', { x: 1 }),
          })
          .eq('source_name', 'github_trending_fallback');
      } catch (fallbackError) {
        await supabase
          .from('data_sources')
          .update({
            health_status: 'offline',
            last_error_at: new Date().toISOString(),
            last_error_message: fallbackError.message,
          })
          .eq('source_name', 'github_trending_fallback');

        await supabase
          .from('update_logs')
          .insert({
            source_type: 'github_api',
            status: 'error',
            items_fetched: 0,
            error_message: `Both primary and fallback failed: ${primaryError.message}; ${fallbackError.message}`
          });

        return new Response(
          JSON.stringify({ 
            ok: false, 
            message: 'Failed to fetch from both GitHub API and fallback',
            primary_error: primaryError.message,
            fallback_error: fallbackError.message
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (reposToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('github_repos')
        .insert(reposToInsert);

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
          items_fetched: reposToInsert.length
        });
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        repos_fetched: reposToInsert.length,
        source: source,
        used_fallback: usedFallback,
        message: usedFallback 
          ? 'Successfully fetched from fallback API (GitHub API unavailable)'
          : 'Successfully fetched and stored GitHub trending repos'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-github-trending:', error);
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error.message || 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});