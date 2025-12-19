-- Development Tab Database Tables
-- Run this in Supabase SQL Editor
-- Created: December 13, 2025

-- ============================================
-- 0. DEV_USERS - Simple user table for dev environment
-- ============================================
CREATE TABLE IF NOT EXISTS dev_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'developer',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Sync with dev_team_members if it exists (one-time migration)
INSERT INTO dev_users (id, name, email, role, avatar_url, created_at, is_active)
SELECT id, name, email,
    CASE
        WHEN EXISTS (SELECT 1 FROM dev_roles r WHERE r.id = role_id AND r.name = 'Admin') THEN 'superadmin'
        ELSE 'developer'
    END,
    avatar_url, created_at, status = 'active'
FROM dev_team_members
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 1. DEV_PROJECTS - All projects in the system
-- ============================================
CREATE TABLE IF NOT EXISTS dev_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,                    -- "NextBid Portal"
    slug VARCHAR(50) NOT NULL UNIQUE,              -- "portal" (used in URLs)
    description TEXT,                              -- What this project does

    -- Git configuration
    git_repo VARCHAR(255),                         -- "Kodiack54/nextbid-portal"
    git_branch_dev VARCHAR(100) DEFAULT 'dev',     -- Development branch
    git_branch_test VARCHAR(100) DEFAULT 'test',   -- Test/staging branch
    git_branch_prod VARCHAR(100) DEFAULT 'main',   -- Production branch

    -- Server configuration
    droplet_name VARCHAR(50),                      -- "Patcher", "Engine", "Portals", "Dev"
    droplet_ip VARCHAR(50),                        -- "134.199.209.140"
    server_path VARCHAR(255),                      -- "/var/www/portal"
    port_dev INT,                                  -- 5100 (dev server port)
    port_test INT,                                 -- 5000 (test server port)
    port_prod INT,                                 -- 4002 (production port)

    -- Build configuration
    build_command VARCHAR(255) DEFAULT 'npm run build',
    start_command VARCHAR(255) DEFAULT 'pm2 restart',

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES dev_users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0                       -- For ordering in UI
);

-- Index for quick lookups
CREATE INDEX idx_dev_projects_slug ON dev_projects(slug);
CREATE INDEX idx_dev_projects_active ON dev_projects(is_active);

-- ============================================
-- 2. DEV_PROJECT_LOCKS - Currently locked projects
-- ============================================
CREATE TABLE IF NOT EXISTS dev_project_locks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES dev_projects(id) ON DELETE CASCADE,

    -- Who locked it
    locked_by UUID NOT NULL REFERENCES dev_users(id),
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Lock details
    branch VARCHAR(100),                           -- Which branch they're working on
    purpose VARCHAR(255),                          -- "Fixing login bug"
    environment VARCHAR(20) DEFAULT 'dev',         -- dev, test, prod

    -- Status
    is_active BOOLEAN DEFAULT TRUE                 -- FALSE when unlocked
);

-- Index for finding active locks quickly
CREATE INDEX idx_dev_project_locks_active ON dev_project_locks(project_id, is_active);

-- Note: Only one active lock per project is enforced by the API
-- (checks for existing active lock before creating new one)

-- ============================================
-- 3. DEV_PROJECT_UNLOCK_HISTORY - Unlock history with patch notes
-- ============================================
CREATE TABLE IF NOT EXISTS dev_project_unlock_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES dev_projects(id) ON DELETE CASCADE,
    lock_id UUID REFERENCES dev_project_locks(id),

    -- Who unlocked
    unlocked_by UUID NOT NULL REFERENCES dev_users(id),
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- What was done (REQUIRED)
    patch_notes TEXT NOT NULL,                     -- "Fixed login redirect issue"
    changes_summary TEXT,                          -- "Modified auth.js, server.js"

    -- Git info
    commit_hash VARCHAR(50),                       -- "abc1234"
    commit_message TEXT,                           -- Full commit message
    files_changed INT,                             -- Number of files modified
    lines_added INT,
    lines_removed INT,

    -- Duration
    lock_duration_minutes INT,                     -- How long was it locked

    -- Type of change
    change_type VARCHAR(50) DEFAULT 'feature'      -- feature, bugfix, hotfix, refactor
);

-- Index for history lookups
CREATE INDEX idx_unlock_history_project ON dev_project_unlock_history(project_id);
CREATE INDEX idx_unlock_history_user ON dev_project_unlock_history(unlocked_by);
CREATE INDEX idx_unlock_history_date ON dev_project_unlock_history(unlocked_at DESC);

-- ============================================
-- 4. DEV_AI_USAGE - Track AI costs per user/project
-- ============================================
CREATE TABLE IF NOT EXISTS dev_ai_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Who and what
    user_id UUID NOT NULL REFERENCES dev_users(id),
    project_id UUID REFERENCES dev_projects(id),   -- NULL if general chat

    -- Model info
    model VARCHAR(50) NOT NULL,                    -- "claude-3-opus", "claude-3-sonnet"

    -- Token counts
    input_tokens INT NOT NULL DEFAULT 0,
    output_tokens INT NOT NULL DEFAULT 0,
    total_tokens INT GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,

    -- Cost (USD)
    cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,

    -- Request details
    request_type VARCHAR(50) DEFAULT 'chat',       -- chat, code-review, explain, refactor, document
    prompt_preview VARCHAR(255),                   -- First 255 chars of prompt

    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_time_ms INT                           -- How long the request took
);

-- Indexes for analytics queries
CREATE INDEX idx_ai_usage_user ON dev_ai_usage(user_id);
CREATE INDEX idx_ai_usage_project ON dev_ai_usage(project_id);
CREATE INDEX idx_ai_usage_date ON dev_ai_usage(created_at DESC);
CREATE INDEX idx_ai_usage_user_date ON dev_ai_usage(user_id, created_at);

-- ============================================
-- 5. DEV_AI_BUDGETS - Optional per-user/team budgets
-- ============================================
CREATE TABLE IF NOT EXISTS dev_ai_budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Budget target (user or role)
    user_id UUID REFERENCES dev_users(id),         -- NULL = team-wide budget
    role VARCHAR(50),                              -- Or set by role: "engineer", "developer"

    -- Limits
    monthly_limit_usd DECIMAL(10, 2) DEFAULT 50.00,
    warning_threshold_percent INT DEFAULT 80,      -- Warn at 80%
    hard_limit BOOLEAN DEFAULT FALSE,              -- Block at 100% or just warn?

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES dev_users(id),
    is_active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- 6. VIEWS - Helpful aggregations
-- ============================================

-- Current locks with user info
CREATE OR REPLACE VIEW dev_active_locks AS
SELECT
    l.id,
    l.project_id,
    p.name AS project_name,
    p.slug AS project_slug,
    l.locked_by,
    u.name AS locked_by_name,
    u.email AS locked_by_email,
    l.locked_at,
    l.branch,
    l.purpose,
    l.environment,
    EXTRACT(EPOCH FROM (NOW() - l.locked_at)) / 60 AS locked_minutes
FROM dev_project_locks l
JOIN dev_projects p ON l.project_id = p.id
JOIN dev_users u ON l.locked_by = u.id
WHERE l.is_active = TRUE;

-- AI usage summary by user (current month)
CREATE OR REPLACE VIEW dev_ai_usage_monthly AS
SELECT
    user_id,
    u.name AS user_name,
    DATE_TRUNC('month', a.created_at) AS month,
    COUNT(*) AS request_count,
    SUM(input_tokens) AS total_input_tokens,
    SUM(output_tokens) AS total_output_tokens,
    SUM(total_tokens) AS total_tokens,
    SUM(cost_usd) AS total_cost_usd
FROM dev_ai_usage a
JOIN dev_users u ON a.user_id = u.id
WHERE a.created_at >= DATE_TRUNC('month', NOW())
GROUP BY user_id, u.name, DATE_TRUNC('month', a.created_at);

-- AI usage by project (current month)
CREATE OR REPLACE VIEW dev_ai_usage_by_project AS
SELECT
    project_id,
    p.name AS project_name,
    DATE_TRUNC('month', a.created_at) AS month,
    COUNT(*) AS request_count,
    SUM(total_tokens) AS total_tokens,
    SUM(cost_usd) AS total_cost_usd
FROM dev_ai_usage a
LEFT JOIN dev_projects p ON a.project_id = p.id
WHERE a.created_at >= DATE_TRUNC('month', NOW())
GROUP BY project_id, p.name, DATE_TRUNC('month', a.created_at);

-- ============================================
-- 7. SEED DATA - Initial projects
-- ============================================
INSERT INTO dev_projects (name, slug, description, droplet_name, droplet_ip, server_path, port_dev, port_test, port_prod, sort_order) VALUES
    ('Gateway', 'gateway', 'Authentication gateway for all products', 'Patcher', '134.199.209.140', '/var/www/gateway-7000', 5170, 5070, 7000, 1),
    ('Dashboard', 'dashboard', 'Dev Command Center - internal tools', 'Patcher', '134.199.209.140', '/var/www/dashboard-7500', 5175, 5075, 7500, 2),
    ('Patcher', 'patcher', 'Deployment and server management', 'Patcher', '134.199.209.140', '/var/www/patcher-7100', 5171, 5071, 7100, 3),
    ('NextBid Portal', 'portal', 'Customer-facing bid search portal', 'Portals', '146.190.169.112', '/var/www/portal', 5140, 5040, 4002, 4),
    ('NextBid Sources', 'sources', 'Government source management', 'Portals', '146.190.169.112', '/var/www/sources', 5143, 5043, 4003, 5),
    ('NextBidder', 'nextbidder', 'Auction and bidding platform', 'Portals', '146.190.169.112', '/var/www/nextbidder', 5141, 5041, 4000, 6),
    ('NextTech', 'nexttech', 'Field technician mobile app', 'Portals', '146.190.169.112', '/var/www/nexttech', 5142, 5042, 4001, 7),
    ('NextTask', 'nexttask', 'Gamified task management', 'Portals', '146.190.169.112', '/var/www/nexttask', 5144, 5044, 4004, 8),
    ('Tradeline Engine', 'tradeline', 'Opportunity discovery scrapers', 'Engine', '64.23.151.201', '/var/www/NextBid', 5131, 5031, 31001, 9),
    ('Engine Auth', 'engine-auth', 'Engine droplet authentication', 'Engine', '64.23.151.201', '/var/www/NextBid/auth', 5130, 5030, 7000, 10)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 8. ROW LEVEL SECURITY (Optional)
-- ============================================
-- Enable RLS on tables
ALTER TABLE dev_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_project_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_project_unlock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_ai_usage ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all projects
CREATE POLICY "Users can view all projects" ON dev_projects
    FOR SELECT USING (true);

-- Allow authenticated users to view locks
CREATE POLICY "Users can view all locks" ON dev_project_locks
    FOR SELECT USING (true);

-- Users can only create locks (locking handled by API)
CREATE POLICY "Users can create locks" ON dev_project_locks
    FOR INSERT WITH CHECK (true);

-- Users can view their own AI usage
CREATE POLICY "Users can view own AI usage" ON dev_ai_usage
    FOR SELECT USING (auth.uid()::text = user_id::text OR
                      EXISTS (SELECT 1 FROM dev_users WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'lead')));

-- ============================================
-- Done! Tables created successfully.
-- ============================================
