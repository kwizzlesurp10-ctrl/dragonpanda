import { supabase, XTrend, GitHubRepo, KnowledgeEntry } from './supabase';

export interface SearchFilters {
  query?: string;
  categories?: string[];
  tags?: string[];
  languages?: string[];
  sources?: ('x_trends' | 'github_repos' | 'knowledge_entries')[];
  dateFrom?: string;
  dateTo?: string;
  minEngagement?: number;
  sortBy?: 'relevance' | 'trending' | 'recent' | 'popular' | 'velocity';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  type: 'x_trend' | 'github_repo' | 'knowledge_entry';
  title: string;
  description: string;
  url?: string;
  category?: string;
  tags?: string[];
  language?: string;
  engagement: number;
  trendingScore?: number;
  velocityScore?: number;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  facets: {
    categories: Array<{ name: string; count: number }>;
    tags: Array<{ name: string; count: number }>;
    languages: Array<{ name: string; count: number }>;
    sources: Array<{ name: string; count: number }>;
  };
  searchId: string;
}

export interface SearchSuggestion {
  text: string;
  type: 'query' | 'tag' | 'category' | 'source';
  usageCount: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  searchQuery: string;
  filters: SearchFilters;
  searchType: string;
  isActive: boolean;
  notificationEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function performUnifiedSearch(
  filters: SearchFilters
): Promise<SearchResponse> {
  const searchId = crypto.randomUUID();
  const results: SearchResult[] = [];

  const sources = filters.sources || ['x_trends', 'github_repos', 'knowledge_entries'];
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  try {
    if (sources.includes('x_trends')) {
      const xResults = await searchXTrends(filters);
      results.push(...xResults);
    }

    if (sources.includes('github_repos')) {
      const repoResults = await searchGitHubRepos(filters);
      results.push(...repoResults);
    }

    if (sources.includes('knowledge_entries')) {
      const knowledgeResults = await searchKnowledgeEntries(filters);
      results.push(...knowledgeResults);
    }

    let sortedResults = applySorting(results, filters.sortBy || 'relevance');

    const facets = calculateFacets(sortedResults);

    const paginatedResults = sortedResults.slice(offset, offset + limit);

    await recordSearchHistory(filters, paginatedResults.length);

    return {
      results: paginatedResults,
      total: sortedResults.length,
      facets,
      searchId,
    };
  } catch (error) {
    console.error('Error performing unified search:', error);
    throw error;
  }
}

async function searchXTrends(filters: SearchFilters): Promise<SearchResult[]> {
  let query = supabase.from('x_trends').select('*');

  if (filters.query) {
    query = query.textSearch('search_vector', filters.query, {
      type: 'websearch',
      config: 'english',
    });
  }

  if (filters.categories && filters.categories.length > 0) {
    query = query.in('category', filters.categories);
  }

  if (filters.dateFrom) {
    query = query.gte('fetched_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('fetched_at', filters.dateTo);
  }

  if (filters.minEngagement) {
    query = query.gte('tweet_count', filters.minEngagement);
  }

  query = query.order('fetched_at', { ascending: false }).limit(100);

  const { data, error } = await query;

  if (error) {
    console.error('Error searching X trends:', error);
    return [];
  }

  return (data || []).map((trend: XTrend) => ({
    id: trend.id,
    type: 'x_trend' as const,
    title: trend.trend_name,
    description: `Trending with ${trend.tweet_count.toLocaleString()} posts`,
    url: trend.url,
    category: trend.category,
    tags: [trend.category],
    engagement: trend.tweet_count,
    timestamp: trend.fetched_at,
    metadata: {
      tweetCount: trend.tweet_count,
      fetchedAt: trend.fetched_at,
    },
  }));
}

async function searchGitHubRepos(filters: SearchFilters): Promise<SearchResult[]> {
  let query = supabase.from('github_repos').select('*');

  if (filters.query) {
    query = query.textSearch('search_vector', filters.query, {
      type: 'websearch',
      config: 'english',
    });
  }

  if (filters.languages && filters.languages.length > 0) {
    query = query.in('language', filters.languages);
  }

  if (filters.tags && filters.tags.length > 0) {
    query = query.overlaps('topics', filters.tags);
  }

  if (filters.dateFrom) {
    query = query.gte('fetched_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('fetched_at', filters.dateTo);
  }

  if (filters.minEngagement) {
    query = query.gte('stars', filters.minEngagement);
  }

  query = query.order('stars', { ascending: false }).limit(100);

  const { data, error } = await query;

  if (error) {
    console.error('Error searching GitHub repos:', error);
    return [];
  }

  return (data || []).map((repo: GitHubRepo) => ({
    id: repo.id,
    type: 'github_repo' as const,
    title: repo.repo_name,
    description: repo.description || 'No description available',
    url: repo.url,
    category: 'technology',
    tags: repo.topics,
    language: repo.language,
    engagement: repo.stars,
    timestamp: repo.fetched_at,
    metadata: {
      stars: repo.stars,
      language: repo.language,
      topics: repo.topics,
      fetchedAt: repo.fetched_at,
    },
  }));
}

async function searchKnowledgeEntries(filters: SearchFilters): Promise<SearchResult[]> {
  let query = supabase
    .from('knowledge_entries')
    .select('*')
    .eq('verified', true);

  if (filters.query) {
    query = query.textSearch('search_vector', filters.query, {
      type: 'websearch',
      config: 'english',
    });
  }

  if (filters.categories && filters.categories.length > 0) {
    query = query.in('category', filters.categories);
  }

  if (filters.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags);
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  query = query.order('relevance_score', { ascending: false }).limit(100);

  const { data, error } = await query;

  if (error) {
    console.error('Error searching knowledge entries:', error);
    return [];
  }

  return (data || []).map((entry: KnowledgeEntry) => ({
    id: entry.id,
    type: 'knowledge_entry' as const,
    title: entry.title,
    description: entry.content.substring(0, 200) + '...',
    url: entry.source_url || undefined,
    category: entry.category,
    tags: entry.tags,
    engagement: entry.relevance_score,
    timestamp: entry.created_at,
    metadata: {
      source: entry.source,
      verified: entry.verified,
      relevanceScore: entry.relevance_score,
      createdAt: entry.created_at,
    },
  }));
}

function applySorting(results: SearchResult[], sortBy: string): SearchResult[] {
  const sorted = [...results];

  switch (sortBy) {
    case 'trending':
      return sorted.sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
    case 'recent':
      return sorted.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    case 'popular':
      return sorted.sort((a, b) => b.engagement - a.engagement);
    case 'velocity':
      return sorted.sort((a, b) => (b.velocityScore || 0) - (a.velocityScore || 0));
    case 'relevance':
    default:
      return sorted;
  }
}

function calculateFacets(results: SearchResult[]) {
  const categoryCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  const languageCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();

  results.forEach((result) => {
    if (result.category) {
      categoryCounts.set(result.category, (categoryCounts.get(result.category) || 0) + 1);
    }

    if (result.tags) {
      result.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    }

    if (result.language) {
      languageCounts.set(result.language, (languageCounts.get(result.language) || 0) + 1);
    }

    sourceCounts.set(result.type, (sourceCounts.get(result.type) || 0) + 1);
  });

  return {
    categories: Array.from(categoryCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    tags: Array.from(tagCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
    languages: Array.from(languageCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15),
    sources: Array.from(sourceCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  };
}

async function recordSearchHistory(filters: SearchFilters, resultsCount: number) {
  try {
    await supabase.from('search_history').insert({
      search_query: filters.query || '',
      filters: filters as any,
      results_count: resultsCount,
      search_type: 'unified',
    });

    if (filters.query) {
      await supabase
        .from('search_suggestions')
        .upsert(
          {
            suggestion_text: filters.query,
            suggestion_type: 'query',
            usage_count: 1,
            last_used_at: new Date().toISOString(),
          },
          {
            onConflict: 'suggestion_text',
            ignoreDuplicates: false,
          }
        );
    }
  } catch (error) {
    console.error('Error recording search history:', error);
  }
}

export async function getSearchSuggestions(
  query: string,
  limit = 10
): Promise<SearchSuggestion[]> {
  try {
    const { data, error } = await supabase
      .from('search_suggestions')
      .select('suggestion_text, suggestion_type, usage_count')
      .ilike('suggestion_text', `${query}%`)
      .order('usage_count', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((item) => ({
      text: item.suggestion_text,
      type: item.suggestion_type as any,
      usageCount: item.usage_count,
    }));
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    return [];
  }
}

export async function getTrendingSearches(limit = 10): Promise<SearchSuggestion[]> {
  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('search_query')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const queryCounts = new Map<string, number>();
    (data || []).forEach((item) => {
      if (item.search_query && item.search_query.trim()) {
        const query = item.search_query.toLowerCase().trim();
        queryCounts.set(query, (queryCounts.get(query) || 0) + 1);
      }
    });

    return Array.from(queryCounts.entries())
      .map(([text, count]) => ({
        text,
        type: 'query' as const,
        usageCount: count,
      }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching trending searches:', error);
    return [];
  }
}

export async function getSavedSearches(userId?: string): Promise<SavedSearch[]> {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((item) => ({
      id: item.id,
      name: item.name,
      searchQuery: item.search_query,
      filters: item.filters as SearchFilters,
      searchType: item.search_type,
      isActive: item.is_active,
      notificationEnabled: item.notification_enabled,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    return [];
  }
}

export async function saveSearch(
  name: string,
  filters: SearchFilters,
  userId?: string
): Promise<SavedSearch | null> {
  if (!userId) {
    console.error('User ID required to save search');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: userId,
        name,
        search_query: filters.query || '',
        filters: filters as any,
        search_type: 'unified',
        is_active: true,
        notification_enabled: false,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      searchQuery: data.search_query,
      filters: data.filters as SearchFilters,
      searchType: data.search_type,
      isActive: data.is_active,
      notificationEnabled: data.notification_enabled,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('Error saving search:', error);
    return null;
  }
}

export async function deleteSavedSearch(
  searchId: string,
  userId?: string
): Promise<boolean> {
  if (!userId) return false;

  try {
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', searchId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting saved search:', error);
    return false;
  }
}

export async function calculateAndStoreTrendingScores(): Promise<void> {
  try {
    const { error } = await supabase.rpc('calculate_trending_scores');

    if (error) throw error;
  } catch (error) {
    console.error('Error calculating trending scores:', error);
  }
}

export async function getTrendingItems(
  itemType?: 'x_trend' | 'github_repo' | 'knowledge_entry',
  limit = 20
): Promise<SearchResult[]> {
  try {
    let query = supabase
      .from('trending_scores')
      .select('*')
      .order('trending_score', { ascending: false });

    if (itemType) {
      query = query.eq('item_type', itemType);
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) throw error;

    const results: SearchResult[] = [];

    for (const score of data || []) {
      let itemData;

      if (score.item_type === 'x_trend') {
        const { data: trend } = await supabase
          .from('x_trends')
          .select('*')
          .eq('id', score.item_id)
          .maybeSingle();

        if (trend) {
          results.push({
            id: trend.id,
            type: 'x_trend',
            title: trend.trend_name,
            description: `Trending with ${trend.tweet_count.toLocaleString()} posts`,
            url: trend.url,
            category: trend.category,
            tags: [trend.category],
            engagement: trend.tweet_count,
            trendingScore: score.trending_score,
            velocityScore: score.velocity_score,
            timestamp: trend.fetched_at,
            metadata: score.metadata,
          });
        }
      } else if (score.item_type === 'github_repo') {
        const { data: repo } = await supabase
          .from('github_repos')
          .select('*')
          .eq('id', score.item_id)
          .maybeSingle();

        if (repo) {
          results.push({
            id: repo.id,
            type: 'github_repo',
            title: repo.repo_name,
            description: repo.description || 'No description',
            url: repo.url,
            category: 'technology',
            tags: repo.topics,
            language: repo.language,
            engagement: repo.stars,
            trendingScore: score.trending_score,
            velocityScore: score.velocity_score,
            timestamp: repo.fetched_at,
            metadata: score.metadata,
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Error fetching trending items:', error);
    return [];
  }
}

export async function getSearchHistory(userId?: string, limit = 20) {
  try {
    let query = supabase
      .from('search_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.is('user_id', null);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching search history:', error);
    return [];
  }
}

export async function getRelatedItems(
  itemId: string,
  itemType: 'x_trend' | 'github_repo' | 'knowledge_entry',
  limit = 5
): Promise<SearchResult[]> {
  try {
    let sourceItem: any;
    let searchTerms: string[] = [];

    if (itemType === 'x_trend') {
      const { data } = await supabase
        .from('x_trends')
        .select('*')
        .eq('id', itemId)
        .maybeSingle();
      sourceItem = data;
      if (sourceItem) {
        searchTerms = [sourceItem.trend_name, sourceItem.category];
      }
    } else if (itemType === 'github_repo') {
      const { data } = await supabase
        .from('github_repos')
        .select('*')
        .eq('id', itemId)
        .maybeSingle();
      sourceItem = data;
      if (sourceItem) {
        searchTerms = [sourceItem.language, ...sourceItem.topics.slice(0, 2)];
      }
    } else if (itemType === 'knowledge_entry') {
      const { data } = await supabase
        .from('knowledge_entries')
        .select('*')
        .eq('id', itemId)
        .maybeSingle();
      sourceItem = data;
      if (sourceItem) {
        searchTerms = [sourceItem.category, ...sourceItem.tags.slice(0, 2)];
      }
    }

    if (!sourceItem || searchTerms.length === 0) {
      return [];
    }

    const filters: SearchFilters = {
      query: searchTerms.join(' '),
      limit: limit + 5,
    };

    const searchResults = await performUnifiedSearch(filters);

    return searchResults.results.filter((result) => result.id !== itemId).slice(0, limit);
  } catch (error) {
    console.error('Error fetching related items:', error);
    return [];
  }
}
