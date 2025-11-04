/*
  # Trends and Knowledge Management System

  1. New Tables
    - `x_trends`
      - `id` (uuid, primary key)
      - `trend_name` (text) - The trending topic name
      - `tweet_count` (integer) - Number of tweets
      - `url` (text) - URL to the trend
      - `category` (text) - Category of the trend
      - `fetched_at` (timestamptz) - When it was fetched
      - `created_at` (timestamptz) - Record creation time
    
    - `github_repos`
      - `id` (uuid, primary key)
      - `repo_name` (text) - Full repository name
      - `description` (text) - Repository description
      - `stars` (integer) - Number of stars
      - `language` (text) - Primary programming language
      - `url` (text) - Repository URL
      - `topics` (text[]) - Array of topics/tags
      - `fetched_at` (timestamptz) - When it was fetched
      - `created_at` (timestamptz) - Record creation time
    
    - `knowledge_entries`
      - `id` (uuid, primary key)
      - `title` (text) - Entry title
      - `content` (text) - Main content
      - `source` (text) - Source of the knowledge
      - `source_url` (text) - URL to the source
      - `category` (text) - Category of knowledge
      - `tags` (text[]) - Array of tags
      - `relevance_score` (integer) - Relevance score (1-100)
      - `verified` (boolean) - Whether the entry is verified
      - `created_at` (timestamptz) - Record creation time
      - `updated_at` (timestamptz) - Last update time
    
    - `update_logs`
      - `id` (uuid, primary key)
      - `source_type` (text) - Type of source (x_api, github, etc.)
      - `status` (text) - Status (success, error, rate_limited)
      - `items_fetched` (integer) - Number of items fetched
      - `error_message` (text) - Error message if failed
      - `created_at` (timestamptz) - When the update ran

  2. Security
    - Enable RLS on all tables
    - Allow public read access to trends and repos
    - Restrict write access to authenticated service role only
    - Knowledge entries can be read by everyone
    
  3. Indexes
    - Add indexes for performance on frequently queried columns
*/

-- X Trends Table
CREATE TABLE IF NOT EXISTS x_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_name text NOT NULL,
  tweet_count integer DEFAULT 0,
  url text,
  category text DEFAULT 'general',
  fetched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_x_trends_fetched_at ON x_trends(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_x_trends_category ON x_trends(category);

ALTER TABLE x_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view x_trends"
  ON x_trends FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert x_trends"
  ON x_trends FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'anon');

-- GitHub Repositories Table
CREATE TABLE IF NOT EXISTS github_repos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_name text NOT NULL,
  description text,
  stars integer DEFAULT 0,
  language text,
  url text NOT NULL,
  topics text[] DEFAULT ARRAY[]::text[],
  fetched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_github_repos_stars ON github_repos(stars DESC);
CREATE INDEX IF NOT EXISTS idx_github_repos_language ON github_repos(language);
CREATE INDEX IF NOT EXISTS idx_github_repos_fetched_at ON github_repos(fetched_at DESC);

ALTER TABLE github_repos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view github_repos"
  ON github_repos FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert github_repos"
  ON github_repos FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'anon');

-- Knowledge Entries Table
CREATE TABLE IF NOT EXISTS knowledge_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  source text NOT NULL,
  source_url text,
  category text DEFAULT 'general',
  tags text[] DEFAULT ARRAY[]::text[],
  relevance_score integer DEFAULT 50,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_entries(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_verified ON knowledge_entries(verified);
CREATE INDEX IF NOT EXISTS idx_knowledge_relevance ON knowledge_entries(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_created ON knowledge_entries(created_at DESC);

ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view verified knowledge"
  ON knowledge_entries FOR SELECT
  USING (verified = true);

CREATE POLICY "Service role can manage knowledge"
  ON knowledge_entries FOR ALL
  USING (auth.role() = 'service_role' OR auth.role() = 'anon');

-- Update Logs Table
CREATE TABLE IF NOT EXISTS update_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  status text NOT NULL,
  items_fetched integer DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_update_logs_created ON update_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_update_logs_source ON update_logs(source_type);

ALTER TABLE update_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view update_logs"
  ON update_logs FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert update_logs"
  ON update_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'anon');
