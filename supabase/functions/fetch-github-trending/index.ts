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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const githubToken = Deno.env.get('GITHUB_TOKEN');
    
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
      const errorText = await response.text();
      
      await supabase
        .from('update_logs')
        .insert({
          source_type: 'github_api',
          status: response.status === 403 ? 'rate_limited' : 'error',
          items_fetched: 0,
          error_message: `GitHub API error: ${response.status} - ${errorText}`
        });

      return new Response(
        JSON.stringify({ 
          ok: false, 
          message: response.status === 403 ? 'GitHub API rate limit reached' : 'Failed to fetch from GitHub API',
          details: errorText,
          info: githubToken ? 'Rate limit will reset soon' : 'Add GITHUB_TOKEN for higher rate limits'
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const repos: GitHubRepo[] = data.items || [];

    const reposToInsert = repos.map((repo: GitHubRepo) => ({
      repo_name: repo.full_name,
      description: repo.description || 'No description available',
      stars: repo.stargazers_count,
      language: repo.language || 'Unknown',
      url: repo.html_url,
      topics: repo.topics || [],
      fetched_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('github_repos')
      .insert(reposToInsert);

    if (insertError) {
      await supabase
        .from('update_logs')
        .insert({
          source_type: 'github_api',
          status: 'error',
          items_fetched: 0,
          error_message: insertError.message
        });

      throw insertError;
    }

    await supabase
      .from('update_logs')
      .insert({
        source_type: 'github_api',
        status: 'success',
        items_fetched: reposToInsert.length
      });

    return new Response(
      JSON.stringify({ 
        ok: true, 
        repos_fetched: reposToInsert.length,
        message: 'Successfully fetched and stored GitHub trending repos'
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