-- Add metadata fields to dev_projects for codebase and database documentation
-- Run this in Supabase SQL Editor

-- Add new columns for project documentation
ALTER TABLE dev_projects
ADD COLUMN IF NOT EXISTS database_tables TEXT,           -- JSON array of table names
ADD COLUMN IF NOT EXISTS key_files TEXT,                 -- JSON array of important file paths
ADD COLUMN IF NOT EXISTS tech_stack TEXT,                -- e.g., "Next.js 15, Tailwind, Supabase"
ADD COLUMN IF NOT EXISTS env_vars TEXT,                  -- Required environment variables
ADD COLUMN IF NOT EXISTS readme TEXT,                    -- Project README/documentation
ADD COLUMN IF NOT EXISTS local_path VARCHAR(255);        -- Local development path

-- Update existing projects with their metadata
-- Gateway
UPDATE dev_projects SET
  database_tables = '["dev_users", "dev_sessions", "dev_login_history"]',
  tech_stack = 'Next.js 15, Express, JWT, Supabase',
  local_path = 'C:/Projects/NextBid_Patcher/gateway-7000',
  env_vars = 'SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET',
  readme = 'Authentication gateway for all NextBid products. Handles login, sessions, and user management.'
WHERE slug = 'gateway';

-- Dashboard
UPDATE dev_projects SET
  database_tables = '["dev_users", "dev_projects", "dev_project_locks", "dev_project_unlock_history", "dev_ai_usage", "dev_ai_budgets"]',
  tech_stack = 'Next.js 15, React 19, Tailwind, Supabase, Chart.js',
  local_path = 'C:/Projects/NextBid_Patcher/dashboard-7500',
  env_vars = 'SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET, GATEWAY_URL, PATCHER_URL',
  readme = 'Internal command center for devs and support. Server monitoring, tradeline management, helpdesk, and dev tools.'
WHERE slug = 'dashboard';

-- Dev Environment (new)
UPDATE dev_projects SET
  database_tables = '["dev_projects", "dev_project_locks", "dev_ai_usage", "dev_ai_budgets"]',
  tech_stack = 'Next.js 15, React 19, Tailwind, Supabase, Anthropic API',
  local_path = 'C:/Projects/NextBid_Patcher/dev-environment-7501',
  env_vars = 'SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY',
  readme = 'AI-powered development environment with Claude chat, project locking, and AI cost tracking.'
WHERE slug = 'dev-env';

-- Patcher
UPDATE dev_projects SET
  database_tables = '[]',
  tech_stack = 'Node.js, Express, PM2, SSH',
  local_path = 'C:/Projects/NextBid_Patcher/patcher-7100',
  env_vars = 'SSH_KEY_PATH, DROPLET_IPS',
  readme = 'Deployment orchestrator. Handles git pulls, builds, and PM2 restarts across all servers.'
WHERE slug = 'patcher';

-- NextBid Portal
UPDATE dev_projects SET
  database_tables = '["opportunities", "categories", "sources", "user_searches", "saved_searches"]',
  tech_stack = 'Next.js, React, Tailwind, PostgreSQL, Elasticsearch',
  local_path = '',
  env_vars = 'DATABASE_URL, ELASTICSEARCH_URL, STRIPE_KEY',
  readme = 'Customer-facing bid search portal. Searches government opportunities from multiple sources.'
WHERE slug = 'portal';

-- NextBid Sources
UPDATE dev_projects SET
  database_tables = '["sources", "source_configs", "source_runs", "source_errors"]',
  tech_stack = 'Next.js, React, Tailwind, PostgreSQL',
  local_path = '',
  env_vars = 'DATABASE_URL, SOURCE_API_KEYS',
  readme = 'Government source management. Configure scrapers, monitor source health, manage credentials.'
WHERE slug = 'sources';

-- NextBidder
UPDATE dev_projects SET
  database_tables = '["auctions", "bids", "items", "users", "payments"]',
  tech_stack = 'Next.js, React, Socket.io, PostgreSQL, Stripe',
  local_path = '',
  env_vars = 'DATABASE_URL, STRIPE_KEY, SOCKET_URL',
  readme = 'Real-time auction platform. Live bidding, payment processing, item management.'
WHERE slug = 'nextbidder';

-- NextTech
UPDATE dev_projects SET
  database_tables = '["technicians", "work_orders", "locations", "schedules"]',
  tech_stack = 'React Native, Expo, Node.js, PostgreSQL',
  local_path = '',
  env_vars = 'API_URL, MAPS_API_KEY',
  readme = 'Field technician mobile app. Work orders, GPS tracking, photo uploads.'
WHERE slug = 'nexttech';

-- NextTask
UPDATE dev_projects SET
  database_tables = '["tasks", "users", "achievements", "rewards", "teams"]',
  tech_stack = 'Next.js, React, Tailwind, PostgreSQL',
  local_path = '',
  env_vars = 'DATABASE_URL',
  readme = 'Gamified task management. Points, achievements, team leaderboards.'
WHERE slug = 'nexttask';

-- Tradeline Engine
UPDATE dev_projects SET
  database_tables = '["opportunities", "sources", "scraper_runs", "scraper_errors", "keywords"]',
  tech_stack = 'Node.js, Puppeteer, PostgreSQL, Redis',
  local_path = '',
  env_vars = 'DATABASE_URL, REDIS_URL, PROXY_LIST',
  readme = 'Core scraping engine. Discovers opportunities from government bid sites using Puppeteer.'
WHERE slug = 'tradeline';

-- Engine Auth
UPDATE dev_projects SET
  database_tables = '["engine_users", "engine_sessions"]',
  tech_stack = 'Node.js, Express, JWT',
  local_path = '',
  env_vars = 'JWT_SECRET, DATABASE_URL',
  readme = 'Authentication service for Engine droplet internal services.'
WHERE slug = 'engine-auth';

-- Note: dev_projects_full view is created in dev_development_tables.sql
-- Run that file FIRST before running this one
