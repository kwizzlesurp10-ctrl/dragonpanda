/*
  # Subscription and Rate Limiting System

  1. New Tables
    - `subscription_tiers`
      - `id` (uuid, primary key)
      - `tier_name` (text) - Name of the tier (free, pro, enterprise)
      - `api_calls_per_hour` (integer) - Maximum API calls per hour
      - `api_calls_per_day` (integer) - Maximum API calls per day
      - `price_monthly` (numeric) - Monthly price in USD
      - `features` (jsonb) - Feature flags and descriptions
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `user_subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `subscription_tier_id` (uuid, foreign key to subscription_tiers)
      - `status` (text) - active, canceled, expired, past_due
      - `current_period_start` (timestamptz) - Start of current billing period
      - `current_period_end` (timestamptz) - End of current billing period
      - `stripe_customer_id` (text) - Stripe customer ID
      - `stripe_subscription_id` (text) - Stripe subscription ID
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `api_usage_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `endpoint` (text) - API endpoint called
      - `method` (text) - HTTP method
      - `response_status` (integer) - HTTP status code
      - `rate_limit_remaining` (integer) - Remaining calls in current period
      - `created_at` (timestamptz)
    
    - `rate_limit_tracker`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `date` (date) - Date for tracking
      - `hour` (integer) - Hour of the day (0-23)
      - `hourly_count` (integer) - Calls in current hour
      - `daily_count` (integer) - Total calls today
      - `last_reset_hourly` (timestamptz) - Last hourly reset
      - `last_reset_daily` (timestamptz) - Last daily reset
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only view their own subscriptions and usage data
    - Service role can manage all data
    - Subscription tiers are publicly readable
    
  3. Indexes
    - Add indexes on user_id, date, and timestamp fields for performance
    
  4. Seed Data
    - Insert default subscription tiers (free, pro, enterprise)
*/

-- Subscription Tiers Table
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name text UNIQUE NOT NULL,
  api_calls_per_hour integer NOT NULL,
  api_calls_per_day integer NOT NULL,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  features jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_tiers_name ON subscription_tiers(tier_name);

ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subscription tiers"
  ON subscription_tiers FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage subscription tiers"
  ON subscription_tiers FOR ALL
  USING (auth.role() = 'service_role');

-- User Subscriptions Table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_tier_id uuid NOT NULL REFERENCES subscription_tiers(id),
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz DEFAULT (now() + interval '30 days'),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('active', 'canceled', 'expired', 'past_due', 'trialing'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id) 
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier ON user_subscriptions(subscription_tier_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe ON user_subscriptions(stripe_subscription_id);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all subscriptions"
  ON user_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- API Usage Logs Table
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  method text NOT NULL DEFAULT 'GET',
  response_status integer,
  rate_limit_remaining integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage_logs(endpoint);

ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage logs"
  ON api_usage_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all usage logs"
  ON api_usage_logs FOR ALL
  USING (auth.role() = 'service_role');

-- Rate Limit Tracker Table
CREATE TABLE IF NOT EXISTS rate_limit_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  hour integer NOT NULL DEFAULT EXTRACT(HOUR FROM now()),
  hourly_count integer DEFAULT 0,
  daily_count integer DEFAULT 0,
  last_reset_hourly timestamptz DEFAULT now(),
  last_reset_daily timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_hour CHECK (hour >= 0 AND hour <= 23)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limit_user_date_hour ON rate_limit_tracker(user_id, date, hour);
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_id ON rate_limit_tracker(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_date ON rate_limit_tracker(date);

ALTER TABLE rate_limit_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limits"
  ON rate_limit_tracker FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage rate limits"
  ON rate_limit_tracker FOR ALL
  USING (auth.role() = 'service_role');

-- Insert Default Subscription Tiers
INSERT INTO subscription_tiers (tier_name, api_calls_per_hour, api_calls_per_day, price_monthly, features)
VALUES 
  (
    'free',
    10,
    100,
    0,
    '{
      "trends_access": true,
      "github_access": true,
      "email_notifications": false,
      "api_access": false,
      "priority_refresh": false,
      "advanced_analytics": false,
      "description": "Perfect for trying out the platform"
    }'::jsonb
  ),
  (
    'pro',
    100,
    1000,
    19.99,
    '{
      "trends_access": true,
      "github_access": true,
      "email_notifications": true,
      "api_access": true,
      "priority_refresh": false,
      "advanced_analytics": true,
      "description": "For developers and power users"
    }'::jsonb
  ),
  (
    'enterprise',
    500,
    5000,
    99.99,
    '{
      "trends_access": true,
      "github_access": true,
      "email_notifications": true,
      "api_access": true,
      "priority_refresh": true,
      "advanced_analytics": true,
      "custom_integrations": true,
      "dedicated_support": true,
      "description": "For teams and organizations"
    }'::jsonb
  )
ON CONFLICT (tier_name) DO NOTHING;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_subscription_tiers_updated_at'
  ) THEN
    CREATE TRIGGER update_subscription_tiers_updated_at
      BEFORE UPDATE ON subscription_tiers
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_user_subscriptions_updated_at'
  ) THEN
    CREATE TRIGGER update_user_subscriptions_updated_at
      BEFORE UPDATE ON user_subscriptions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_rate_limit_tracker_updated_at'
  ) THEN
    CREATE TRIGGER update_rate_limit_tracker_updated_at
      BEFORE UPDATE ON rate_limit_tracker
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;