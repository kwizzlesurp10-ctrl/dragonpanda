import { supabase } from './supabase';

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  source: string;
  source_url: string | null;
  category: string;
  tags: string[];
  relevance_score: number;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeFilters {
  category?: string;
  tags?: string[];
  verified?: boolean;
  minRelevance?: number;
  search?: string;
}

export async function getKnowledgeEntries(filters?: KnowledgeFilters, limit = 50) {
  let query = supabase
    .from('knowledge_entries')
    .select('*')
    .eq('verified', true)
    .order('relevance_score', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.minRelevance) {
    query = query.gte('relevance_score', filters.minRelevance);
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags);
  }

  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
  }

  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching knowledge entries:', error);
    return [];
  }

  return data as KnowledgeEntry[];
}

export async function getKnowledgeEntry(id: string) {
  const { data, error } = await supabase
    .from('knowledge_entries')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching knowledge entry:', error);
    return null;
  }

  return data as KnowledgeEntry | null;
}

export async function getKnowledgeCategories() {
  const { data, error } = await supabase
    .from('knowledge_entries')
    .select('category')
    .eq('verified', true);

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  const categories = Array.from(new Set(data.map(item => item.category)));
  return categories.sort();
}

export async function getKnowledgeTags() {
  const { data, error } = await supabase
    .from('knowledge_entries')
    .select('tags')
    .eq('verified', true);

  if (error) {
    console.error('Error fetching tags:', error);
    return [];
  }

  const allTags = data.flatMap(item => item.tags);
  const uniqueTags = Array.from(new Set(allTags));
  return uniqueTags.sort();
}

export async function createKnowledgeEntry(entry: Omit<KnowledgeEntry, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('knowledge_entries')
    .insert(entry)
    .select()
    .single();

  if (error) {
    console.error('Error creating knowledge entry:', error);
    throw error;
  }

  return data as KnowledgeEntry;
}

export async function updateKnowledgeEntry(id: string, updates: Partial<KnowledgeEntry>) {
  const { data, error } = await supabase
    .from('knowledge_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating knowledge entry:', error);
    throw error;
  }

  return data as KnowledgeEntry;
}

export async function extractKnowledgeFromTrends() {
  const { data: trends, error: trendsError } = await supabase
    .from('x_trends')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(50);

  if (trendsError || !trends) {
    console.error('Error fetching trends:', trendsError);
    return [];
  }

  const { data: repos, error: reposError } = await supabase
    .from('github_repos')
    .select('*')
    .order('stars', { ascending: false })
    .limit(30);

  if (reposError || !repos) {
    console.error('Error fetching repos:', reposError);
    return [];
  }

  const knowledgeEntries = [];

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

  const topRepos = repos.slice(0, 10);
  for (const repo of topRepos) {
    knowledgeEntries.push({
      title: `Popular Repository: ${repo.repo_name}`,
      content: `${repo.repo_name} is a trending ${repo.language || 'project'} repository with ${repo.stars.toLocaleString()} stars. ${repo.description || 'Check it out to stay updated with the latest developments.'}`,
      source: 'github_api',
      source_url: repo.url,
      category: 'technology',
      tags: ['github', 'repository', repo.language?.toLowerCase() || 'programming', ...repo.topics.slice(0, 3)],
      relevance_score: Math.min(100, Math.floor((repo.stars / 1000) * 100)),
      verified: true,
    });
  }

  return knowledgeEntries;
}

export async function syncKnowledgeFromTrends() {
  try {
    const entries = await extractKnowledgeFromTrends();

    const results = {
      created: 0,
      skipped: 0,
      errors: 0,
    };

    for (const entry of entries) {
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

        await createKnowledgeEntry(entry);
        results.created++;
      } catch (error) {
        console.error('Error syncing knowledge entry:', error);
        results.errors++;
      }
    }

    return results;
  } catch (error) {
    console.error('Error syncing knowledge:', error);
    throw error;
  }
}

export async function getKnowledgeStats() {
  const { count: totalCount } = await supabase
    .from('knowledge_entries')
    .select('*', { count: 'exact', head: true })
    .eq('verified', true);

  const { count: recentCount } = await supabase
    .from('knowledge_entries')
    .select('*', { count: 'exact', head: true })
    .eq('verified', true)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const categories = await getKnowledgeCategories();
  const tags = await getKnowledgeTags();

  return {
    total: totalCount || 0,
    recentlyAdded: recentCount || 0,
    categoriesCount: categories.length,
    tagsCount: tags.length,
  };
}
