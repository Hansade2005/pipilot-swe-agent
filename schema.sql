-- 1. CLEANUP: Drop existing tables to ensure structure is correct
-- Note: We drop them in reverse order of creation to avoid Foreign Key dependency errors.
DROP TABLE IF EXISTS webhook_logs;
DROP TABLE IF EXISTS usage_logs;
DROP TABLE IF EXISTS repositories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS github_installations;

-- 2. CREATE TABLES (Fresh Start)

-- Table to track GitHub app installations
CREATE TABLE github_installations (
  id SERIAL PRIMARY KEY,
  installation_id BIGINT UNIQUE NOT NULL,
  account_login TEXT NOT NULL,
  account_type TEXT NOT NULL, -- 'User' or 'Organization'
  account_id BIGINT NOT NULL,
  target_type TEXT NOT NULL, -- 'User' or 'Organization'
  target_id BIGINT NOT NULL,
  repository_selection TEXT NOT NULL, -- 'all' or 'selected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Table to track user accounts and their subscription status
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_user_id BIGINT UNIQUE,
  github_username TEXT NOT NULL,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stripe_customer_id TEXT UNIQUE,
  subscription_plan TEXT DEFAULT 'free', -- 'free', 'pro', 'teams', 'enterprise'
  subscription_status TEXT DEFAULT 'active', -- 'active', 'canceled', 'past_due', 'trialing', 'inactive'
  stripe_subscription_id TEXT,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  last_payment_date TIMESTAMP WITH TIME ZONE,
  deployments_this_month INTEGER DEFAULT 0,
  github_pushes_this_month INTEGER DEFAULT 0
);

-- Table to track repositories associated with installations
-- FIX: Now correctly references github_installations(id)
CREATE TABLE repositories (
  id SERIAL PRIMARY KEY,
  github_repo_id BIGINT UNIQUE NOT NULL,
  installation_id BIGINT NOT NULL REFERENCES github_installations(id),
  name TEXT NOT NULL,
  full_name TEXT NOT NULL, -- owner/name format
  private BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track usage of the GitHub app (API calls, tokens, etc.)
-- FIX: Now correctly references github_installations(id)
CREATE TABLE usage_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  installation_id BIGINT REFERENCES github_installations(id),
  repo_id INTEGER REFERENCES repositories(id),
  request_type TEXT NOT NULL, -- 'chat', 'code_analysis', 'pr_review', etc.
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  request_metadata JSONB, -- Additional request information
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track webhook events for monitoring
-- FIX: Now correctly references github_installations(id)
CREATE TABLE webhook_logs (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  installation_id BIGINT REFERENCES github_installations(id),
  status TEXT NOT NULL, -- 'success', 'failed'
  error TEXT,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. INDEXES
CREATE INDEX idx_github_installations_active ON github_installations(is_active);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_installation_id ON usage_logs(installation_id);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX idx_webhook_logs_processed_at ON webhook_logs(processed_at);

-- 4. FUNCTION AND TRIGGERS
-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
 $$ language 'plpgsql';

-- Safely drop triggers if they exist
DO $$ 
BEGIN
    DROP TRIGGER IF EXISTS update_github_installations_updated_at ON github_installations;
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    DROP TRIGGER IF EXISTS update_repositories_updated_at ON repositories;
END $$;

-- Create triggers
CREATE TRIGGER update_github_installations_updated_at BEFORE UPDATE ON github_installations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_repositories_updated_at BEFORE UPDATE ON repositories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();