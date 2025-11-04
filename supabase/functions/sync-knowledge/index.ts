import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface KnowledgeEntry {
  title: string;
  content: string;
  source: string;
  source_url: string | null;
  category: string;
  tags: string[];
  relevance_score: number;
  verified: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = {
      created: 0,
      skipped: 0,
      errors: 0,
      entries: [] as string[],
    };

    const { data: trends } = await supabase
      .from('x_trends')
      .select('*')
      .order('fetched_at', { ascending: false })
      .limit(50);

    const { data: repos } = await supabase
      .from('github_repos')
      .select('*')
      .order('stars', { ascending: false })
      .limit(30);

    if (!trends && !repos) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'No data available to generate knowledge entries',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const knowledgeEntries: KnowledgeEntry[] = [];

    if (trends && trends.length > 0) {
      const topTrends = trends.slice(0, 10);
      for (const trend of topTrends) {
        knowledgeEntries.push({
          title: `Trending: ${trend.trend_name}`,
          content: `${trend.trend_name} is currently trending with ${trend.tweet_count.toLocaleString()} tweets. This indicates significant interest and discussion around this topic.`,
          source: 'x_api',
          source_url: trend.url,
          category: trend.category || 'general',
          tags: ['trending', 'social-media', trend.trend_name.toLowerCase()],
          relevance_score: Math.min(100, Math.floor((trend.tweet_count / 10000) * 100)),
          verified: true,
        });
      }
    }

    if (repos && repos.length > 0) {
      const topRepos = repos.slice(0, 10);
      for (const repo of topRepos) {
        knowledgeEntries.push({
          title: `Popular Repository: ${repo.repo_name}`,
          content: `${repo.repo_name} is a trending ${repo.language || 'project'} repository with ${repo.stars.toLocaleString()} stars. ${repo.description || 'Check it out to stay updated with the latest developments.'}`,
          source: 'github_api',
          source_url: repo.url,
          category: 'technology',
          tags: [
            'github',
            'repository',
            repo.language?.toLowerCase() || 'programming',
            ...repo.topics.slice(0, 3),
          ],
          relevance_score: Math.min(100, Math.floor((repo.stars / 1000) * 100)),
          verified: true,
        });
      }
    }

    for (const entry of knowledgeEntries) {
      try {
        const { data: existing } = await supabase
          .from('knowledge_entries')
          .select('id')
          .eq('title', entry.title)
          .maybeSingle();

        if (existing) {
          results.skipped++;
          continue;
        }

        const { error: insertError } = await supabase
          .from('knowledge_entries')
          .insert(entry);

        if (insertError) {
          console.error('Error inserting entry:', insertError);
          results.errors++;
        } else {
          results.created++;
          results.entries.push(entry.title);
        }
      } catch (error) {
        console.error('Error processing entry:', error);
        results.errors++;
      }
    }

    await supabase.from('update_logs').insert({
      source_type: 'knowledge_sync',
      status: results.errors > 0 ? 'partial_success' : 'success',
      items_fetched: results.created,
      error_message: results.errors > 0 ? `${results.errors} entries failed` : null,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Knowledge sync completed',
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-knowledge:', error);

    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message || 'Unknown error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
