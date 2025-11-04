import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface XTrend {
  id: string;
  trend_name: string;
  tweet_count: number;
  url: string;
  category: string;
  fetched_at: string;
  created_at: string;
}

export interface GitHubRepo {
  id: string;
  repo_name: string;
  description: string;
  stars: number;
  language: string;
  url: string;
  topics: string[];
  fetched_at: string;
  created_at: string;
}

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

export interface UpdateLog {
  id: string;
  source_type: string;
  status: string;
  items_fetched: number;
  error_message: string | null;
  created_at: string;
}
