/*
  # Add Data Sources Configuration and Health Monitoring Tables

  1. New Tables
    - `data_sources`
      - `id` (uuid, primary key)
      - `source_name` (text) - Name of the data source (e.g., 'x_api', 'github_api')
      - `source_type` (text) - Type of source (e.g., 'api', 'fallback', 'public')
      - `is_enabled` (boolean) - Whether this source is active
      - `requires_token` (boolean) - Whether this source needs API token
      - `token_configured` (boolean) - Whether token is set in secrets
      - `health_status` (text) - Current health: 'healthy', 'degraded', 'offline'
      - `last_success_at` (timestamptz) - Last successful fetch
      - `last_error_at` (timestamptz) - Last error timestamp
      - `last_error_message` (text) - Last error details
      - `success_count` (integer) - Total successful fetches
      - `error_count` (integer) - Total errors
      - `rate_limit_remaining` (integer) - Remaining API calls
      - `rate_limit_reset_at` (timestamptz) - When rate limit resets
      - `priority` (integer) - Source priority (lower = higher priority)
      - `metadata` (jsonb) - Additional configuration data
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `system_config`
      - `id` (uuid, primary key)
      - `config_key` (text, unique) - Configuration key
      - `config_value` (jsonb) - Configuration value
      - `description` (text) - What this config does
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Allow public read access for monitoring
    - Restrict writes to service role

  3. Initial Data
    - Insert default data sources
    - Insert default configuration
*/

-- Create data_sources table
CREATE TABLE IF NOT EXISTS data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text UNIQUE NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('api', 'fallback', 'public')),
  is_enabled boolean DEFAULT true,
  requires_token boolean DEFAULT false,
  token_configured boolean DEFAULT false,
  health_status text DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'offline', 'unknown')),
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error_message text,
  success_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  rate_limit_remaining integer,
  rate_limit_reset_at timestamptz,
  priority integer DEFAULT 100,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create system_config table
CREATE TABLE IF NOT EXISTS system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value jsonb NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Allow public read access to data_sources"
  ON data_sources FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to system_config"
  ON system_config FOR SELECT
  TO anon, authenticated
  USING (true);

-- Service role write policies
CREATE POLICY "Allow service role full access to data_sources"
  ON data_sources FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access to system_config"
  ON system_config FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_data_sources_updated_at ON data_sources;
CREATE TRIGGER update_data_sources_updated_at
  BEFORE UPDATE ON data_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_config_updated_at ON system_config;
CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON system_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default data sources
INSERT INTO data_sources (source_name, source_type, requires_token, priority, metadata) VALUES
  ('x_api', 'api', true, 10, '{"endpoint": "https://api.twitter.com/2/trends/place.json", "rate_limit_window": "15m"}'::jsonb),
  ('github_api', 'api', false, 20, '{"endpoint": "https://api.github.com/search/repositories", "rate_limit_window": "60m"}'::jsonb),
  ('github_trending_fallback', 'fallback', false, 30, '{"endpoint": "https://api.gitterapp.com/repositories", "description": "Public GitHub trending API"}'::jsonb),
  ('hackernews_api', 'public', false, 40, '{"endpoint": "https://hacker-news.firebaseio.com/v0/topstories.json", "description": "HackerNews top stories"}'::jsonb)
ON CONFLICT (source_name) DO NOTHING;

-- Insert default system configuration
INSERT INTO system_config (config_key, config_value, description) VALUES
  ('auto_update_enabled', 'true'::jsonb, 'Enable automatic background updates'),
  ('update_interval_minutes', '15'::jsonb, 'Minutes between automatic updates'),
  ('fallback_enabled', 'true'::jsonb, 'Enable fallback data sources when primary fails'),
  ('realtime_enabled', 'true'::jsonb, 'Enable real-time updates via Supabase Realtime'),
  ('max_retries', '3'::jsonb, 'Maximum retry attempts for failed API calls'),
  ('cache_duration_minutes', '10'::jsonb, 'Duration to cache API responses')
ON CONFLICT (config_key) DO NOTHING;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_data_sources_health_status ON data_sources(health_status);
CREATE INDEX IF NOT EXISTS idx_data_sources_priority ON data_sources(priority);
CREATE INDEX IF NOT EXISTS idx_data_sources_enabled ON data_sources(is_enabled);
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);