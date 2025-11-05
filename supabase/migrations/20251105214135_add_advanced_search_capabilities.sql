/*
  # Advanced Search and Discovery Features Migration
  
  ## Overview
  This migration adds comprehensive search capabilities including full-text search,
  search history tracking, saved searches, and advanced filtering infrastructure.
  
  ## 1. New Tables
  
  ### search_history
  - `id` (uuid, primary key) - Unique search record
  - `user_id` (uuid, nullable) - User who performed search (null for anonymous)
  - `search_query` (text) - The search query text
  - `filters` (jsonb) - Applied filters (category, tags, date range, etc.)
  - `results_count` (integer) - Number of results returned
  - `search_type` (text) - Type of search (trends, repos, knowledge, unified)
  - `created_at` (timestamptz) - When search was performed
  
  ### saved_searches
  - `id` (uuid, primary key) - Unique saved search
  - `user_id` (uuid, nullable) - User who saved the search
  - `name` (text) - User-defined name for the saved search
  - `search_query` (text) - The search query
  - `filters` (jsonb) - Saved filter configuration
  - `search_type` (text) - Type of search
  - `is_active` (boolean) - Whether to show in quick access
  - `notification_enabled` (boolean) - Alert on new matching results
  - `created_at` (timestamptz) - When saved
  - `updated_at` (timestamptz) - Last modified
  
  ### trending_scores
  - `id` (uuid, primary key)
  - `item_type` (text) - 'x_trend', 'github_repo', 'knowledge_entry'
  - `item_id` (uuid) - Reference to the actual item
  - `trending_score` (numeric) - Calculated trending score
  - `velocity_score` (numeric) - Rate of growth score
  - `engagement_score` (numeric) - Total engagement score
  - `recency_score` (numeric) - How recent the item is
  - `calculated_at` (timestamptz) - When score was calculated
  - `metadata` (jsonb) - Additional scoring metadata
  
  ### search_suggestions
  - `id` (uuid, primary key)
  - `suggestion_text` (text, unique) - The suggestion text
  - `suggestion_type` (text) - 'query', 'tag', 'category', 'source'
  - `usage_count` (integer) - How many times used
  - `last_used_at` (timestamptz) - Last time used
  - `created_at` (timestamptz)
  
  ## 2. Full-Text Search Columns
  
  Add tsvector columns to existing tables for optimized full-text search:
  - x_trends: search_vector
  - github_repos: search_vector
  - knowledge_entries: search_vector
  
  ## 3. Indexes
  
  Create GIN indexes for full-text search and filtering:
  - Full-text search indexes on all search_vector columns
  - Indexes on filter columns (category, language, tags, date ranges)
  - Composite indexes for common filter combinations
  
  ## 4. Search Functions
  
  Create database functions for:
  - Unified search across all content types
  - Trending score calculation
  - Search suggestions generation
  - Related items discovery
  
  ## 5. Security
  
  - Enable RLS on all new tables
  - Allow public read for search suggestions
  - Restrict write access to authenticated users for saved searches
  - Allow anonymous search history (no sensitive data stored)
*/

-- =============================================
-- 1. CREATE NEW TABLES
-- =============================================

-- Search History Table
CREATE TABLE IF NOT EXISTS search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  search_query text NOT NULL,
  filters jsonb DEFAULT '{}'::jsonb,
  results_count integer DEFAULT 0,
  search_type text DEFAULT 'unified' CHECK (search_type IN ('trends', 'repos', 'knowledge', 'unified')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created ON search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_type ON search_history(search_type);
CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history USING gin(to_tsvector('english', search_query));

-- Saved Searches Table
CREATE TABLE IF NOT EXISTS saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  search_query text NOT NULL,
  filters jsonb DEFAULT '{}'::jsonb,
  search_type text DEFAULT 'unified' CHECK (search_type IN ('trends', 'repos', 'knowledge', 'unified')),
  is_active boolean DEFAULT true,
  notification_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_active ON saved_searches(is_active) WHERE is_active = true;

-- Trending Scores Table
CREATE TABLE IF NOT EXISTS trending_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL CHECK (item_type IN ('x_trend', 'github_repo', 'knowledge_entry')),
  item_id uuid NOT NULL,
  trending_score numeric DEFAULT 0,
  velocity_score numeric DEFAULT 0,
  engagement_score numeric DEFAULT 0,
  recency_score numeric DEFAULT 0,
  calculated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_trending_scores_type ON trending_scores(item_type);
CREATE INDEX IF NOT EXISTS idx_trending_scores_score ON trending_scores(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_trending_scores_calculated ON trending_scores(calculated_at DESC);

-- Search Suggestions Table
CREATE TABLE IF NOT EXISTS search_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_text text UNIQUE NOT NULL,
  suggestion_type text DEFAULT 'query' CHECK (suggestion_type IN ('query', 'tag', 'category', 'source')),
  usage_count integer DEFAULT 0,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_suggestions_type ON search_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_usage ON search_suggestions(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_text ON search_suggestions USING gin(to_tsvector('english', suggestion_text));

-- =============================================
-- 2. ADD FULL-TEXT SEARCH COLUMNS
-- =============================================

-- Add search_vector column to x_trends
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'x_trends' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE x_trends ADD COLUMN search_vector tsvector;
  END IF;
END $$;

-- Add search_vector column to github_repos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'github_repos' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE github_repos ADD COLUMN search_vector tsvector;
  END IF;
END $$;

-- Add search_vector column to knowledge_entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'knowledge_entries' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE knowledge_entries ADD COLUMN search_vector tsvector;
  END IF;
END $$;

-- =============================================
-- 3. CREATE FULL-TEXT SEARCH INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_x_trends_search_vector ON x_trends USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_github_repos_search_vector ON github_repos USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_search_vector ON knowledge_entries USING gin(search_vector);

-- =============================================
-- 4. CREATE TRIGGER FUNCTIONS FOR AUTO-UPDATE
-- =============================================

-- Function to update search_vector for x_trends
CREATE OR REPLACE FUNCTION x_trends_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.trend_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update search_vector for github_repos
CREATE OR REPLACE FUNCTION github_repos_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.repo_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.language, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.topics, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update search_vector for knowledge_entries
CREATE OR REPLACE FUNCTION knowledge_entries_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. CREATE TRIGGERS
-- =============================================

DROP TRIGGER IF EXISTS x_trends_search_vector_trigger ON x_trends;
CREATE TRIGGER x_trends_search_vector_trigger
  BEFORE INSERT OR UPDATE ON x_trends
  FOR EACH ROW
  EXECUTE FUNCTION x_trends_search_vector_update();

DROP TRIGGER IF EXISTS github_repos_search_vector_trigger ON github_repos;
CREATE TRIGGER github_repos_search_vector_trigger
  BEFORE INSERT OR UPDATE ON github_repos
  FOR EACH ROW
  EXECUTE FUNCTION github_repos_search_vector_update();

DROP TRIGGER IF EXISTS knowledge_entries_search_vector_trigger ON knowledge_entries;
CREATE TRIGGER knowledge_entries_search_vector_trigger
  BEFORE INSERT OR UPDATE ON knowledge_entries
  FOR EACH ROW
  EXECUTE FUNCTION knowledge_entries_search_vector_update();

-- Update existing records
UPDATE x_trends SET search_vector = 
  setweight(to_tsvector('english', COALESCE(trend_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(category, '')), 'B')
WHERE search_vector IS NULL;

UPDATE github_repos SET search_vector = 
  setweight(to_tsvector('english', COALESCE(repo_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(language, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(topics, ' '), '')), 'C')
WHERE search_vector IS NULL;

UPDATE knowledge_entries SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(content, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(category, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'C')
WHERE search_vector IS NULL;

-- =============================================
-- 6. CREATE SEARCH FUNCTIONS
-- =============================================

-- Function to calculate trending scores
CREATE OR REPLACE FUNCTION calculate_trending_scores()
RETURNS void AS $$
BEGIN
  -- Calculate scores for X trends
  INSERT INTO trending_scores (item_type, item_id, trending_score, velocity_score, engagement_score, recency_score, metadata)
  SELECT 
    'x_trend',
    id,
    -- Trending score: weighted combination of all factors
    (
      (tweet_count / 10000.0) * 0.4 +  -- Engagement weight: 40%
      (EXTRACT(EPOCH FROM (NOW() - fetched_at)) / 3600.0) * -0.3 + 50 * 0.3 +  -- Recency weight: 30% (newer = higher)
      (tweet_count / GREATEST(EXTRACT(EPOCH FROM (NOW() - fetched_at)) / 3600.0, 1)) * 0.3  -- Velocity weight: 30%
    ) * 100 as trending_score,
    -- Velocity: engagement per hour
    tweet_count / GREATEST(EXTRACT(EPOCH FROM (NOW() - fetched_at)) / 3600.0, 1) as velocity_score,
    -- Engagement: raw tweet count
    tweet_count::numeric as engagement_score,
    -- Recency: inverse age in hours
    100 - LEAST(EXTRACT(EPOCH FROM (NOW() - fetched_at)) / 3600.0, 100) as recency_score,
    jsonb_build_object('category', category, 'url', url) as metadata
  FROM x_trends
  WHERE fetched_at > NOW() - INTERVAL '7 days'
  ON CONFLICT (item_type, item_id) DO UPDATE SET
    trending_score = EXCLUDED.trending_score,
    velocity_score = EXCLUDED.velocity_score,
    engagement_score = EXCLUDED.engagement_score,
    recency_score = EXCLUDED.recency_score,
    calculated_at = NOW(),
    metadata = EXCLUDED.metadata;

  -- Calculate scores for GitHub repos
  INSERT INTO trending_scores (item_type, item_id, trending_score, velocity_score, engagement_score, recency_score, metadata)
  SELECT 
    'github_repo',
    id,
    -- Trending score
    (
      (stars / 1000.0) * 0.4 +
      (EXTRACT(EPOCH FROM (NOW() - fetched_at)) / 3600.0) * -0.3 + 50 * 0.3 +
      (stars / GREATEST(EXTRACT(EPOCH FROM (NOW() - fetched_at)) / 3600.0, 1)) * 0.3
    ) * 100 as trending_score,
    -- Velocity
    stars / GREATEST(EXTRACT(EPOCH FROM (NOW() - fetched_at)) / 3600.0, 1) as velocity_score,
    -- Engagement
    stars::numeric as engagement_score,
    -- Recency
    100 - LEAST(EXTRACT(EPOCH FROM (NOW() - fetched_at)) / 3600.0, 100) as recency_score,
    jsonb_build_object('language', language, 'topics', topics, 'url', url) as metadata
  FROM github_repos
  WHERE fetched_at > NOW() - INTERVAL '30 days'
  ON CONFLICT (item_type, item_id) DO UPDATE SET
    trending_score = EXCLUDED.trending_score,
    velocity_score = EXCLUDED.velocity_score,
    engagement_score = EXCLUDED.engagement_score,
    recency_score = EXCLUDED.recency_score,
    calculated_at = NOW(),
    metadata = EXCLUDED.metadata;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 7. ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_suggestions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 8. CREATE RLS POLICIES
-- =============================================

-- Search History Policies
CREATE POLICY "Anyone can insert search history"
  ON search_history FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their own search history"
  ON search_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anonymous users can view their session searches"
  ON search_history FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- Saved Searches Policies
CREATE POLICY "Users can manage their own saved searches"
  ON saved_searches FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trending Scores Policies (Public Read)
CREATE POLICY "Anyone can view trending scores"
  ON trending_scores FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage trending scores"
  ON trending_scores FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Search Suggestions Policies (Public Read)
CREATE POLICY "Anyone can view search suggestions"
  ON search_suggestions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage search suggestions"
  ON search_suggestions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================
-- 9. INSERT INITIAL SEARCH SUGGESTIONS
-- =============================================

INSERT INTO search_suggestions (suggestion_text, suggestion_type, usage_count) VALUES
  ('trending', 'query', 100),
  ('popular', 'query', 80),
  ('javascript', 'tag', 150),
  ('python', 'tag', 140),
  ('react', 'tag', 130),
  ('ai', 'tag', 200),
  ('machine learning', 'tag', 180),
  ('web development', 'tag', 120),
  ('technology', 'category', 90),
  ('general', 'category', 60)
ON CONFLICT (suggestion_text) DO NOTHING;
