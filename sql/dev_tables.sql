-- ============================================
-- NextBid Dev Dashboard Tables
-- Prefix: dev_
-- ============================================

-- ============================================
-- TEAM MANAGEMENT
-- ============================================

-- Roles (must be created BEFORE team_members due to foreign key)
CREATE TABLE IF NOT EXISTS dev_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    permissions TEXT[] DEFAULT '{}',
    level INT DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions (reference table)
CREATE TABLE IF NOT EXISTS dev_permissions (
    id VARCHAR(100) PRIMARY KEY, -- e.g., 'servers.view', 'team.manage'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    permission_group VARCHAR(100), -- servers, team, helpdesk, dev
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Members
CREATE TABLE IF NOT EXISTS dev_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role_id UUID REFERENCES dev_roles(id),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    avatar_url TEXT,
    permissions TEXT[] DEFAULT '{}',
    projects TEXT[] DEFAULT '{}',
    last_active TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE IF NOT EXISTS dev_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES dev_team_members(id),
    user_name VARCHAR(255),
    action VARCHAR(50) NOT NULL, -- login, logout, create, update, delete, view
    resource VARCHAR(100) NOT NULL, -- ticket, deployment, user, etc.
    resource_id VARCHAR(255),
    details TEXT,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dev_audit_log_user ON dev_audit_log(user_id);
CREATE INDEX idx_dev_audit_log_created ON dev_audit_log(created_at DESC);

-- ============================================
-- HELPDESK - SYSTEM TICKETS (Internal Dev)
-- ============================================

CREATE TABLE IF NOT EXISTS dev_system_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    type VARCHAR(50) DEFAULT 'task' CHECK (type IN ('bug', 'feature', 'improvement', 'task')),
    project VARCHAR(100), -- tradelines, portals, nextbidder, sources, nexttech, nexttask, dashboard
    reporter_id UUID REFERENCES dev_team_members(id),
    reporter_name VARCHAR(255),
    assignee_id UUID REFERENCES dev_team_members(id),
    assignee_name VARCHAR(255),
    labels TEXT[] DEFAULT '{}',
    resolution TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

CREATE INDEX idx_dev_system_tickets_status ON dev_system_tickets(status);
CREATE INDEX idx_dev_system_tickets_project ON dev_system_tickets(project);
CREATE INDEX idx_dev_system_tickets_assignee ON dev_system_tickets(assignee_id);

-- System Ticket Comments
CREATE TABLE IF NOT EXISTS dev_system_ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES dev_system_tickets(id) ON DELETE CASCADE,
    author_id UUID REFERENCES dev_team_members(id),
    author_name VARCHAR(255),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dev_system_comments_ticket ON dev_system_ticket_comments(ticket_id);

-- ============================================
-- HELPDESK - USER TICKETS (Customer Support)
-- User IDs follow pattern: portal_user_123, nextbidder_user_456, etc.
-- ============================================

CREATE TABLE IF NOT EXISTS dev_user_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'awaiting_response', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    category VARCHAR(100) DEFAULT 'general', -- general, billing, technical, account, feedback
    source_system VARCHAR(50), -- portal, nextbidder, nexttech, nexttask, sources
    user_id VARCHAR(255) NOT NULL, -- e.g., portal_user_123, nextbidder_user_456
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    assigned_to_id UUID REFERENCES dev_team_members(id),
    assigned_to_name VARCHAR(255),
    internal_notes TEXT,
    resolution TEXT,
    attachments TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_response_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ
);

CREATE INDEX idx_dev_user_tickets_status ON dev_user_tickets(status);
CREATE INDEX idx_dev_user_tickets_source ON dev_user_tickets(source_system);
CREATE INDEX idx_dev_user_tickets_user ON dev_user_tickets(user_id);
CREATE INDEX idx_dev_user_tickets_assigned ON dev_user_tickets(assigned_to_id);

-- User Ticket History/Conversation
CREATE TABLE IF NOT EXISTS dev_user_ticket_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES dev_user_tickets(id) ON DELETE CASCADE,
    type VARCHAR(50) DEFAULT 'message' CHECK (type IN ('message', 'internal_note', 'status_change')),
    author_id VARCHAR(255), -- Can be dev_team_member UUID or user_id like portal_user_123
    author_name VARCHAR(255),
    author_type VARCHAR(50) CHECK (author_type IN ('user', 'agent')),
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dev_user_history_ticket ON dev_user_ticket_history(ticket_id);

-- Canned Responses
CREATE TABLE IF NOT EXISTS dev_canned_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    created_by UUID REFERENCES dev_team_members(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DEPLOYMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS dev_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project VARCHAR(100) NOT NULL, -- tradelines, portals, nextbidder, sources, nexttech, nexttask, dashboard
    environment VARCHAR(50) NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'rolled_back')),
    branch VARCHAR(255) DEFAULT 'main',
    commit_hash VARCHAR(100),
    notes TEXT,
    deployed_by_id UUID REFERENCES dev_team_members(id),
    deployed_by_name VARCHAR(255),
    logs TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    rolled_back_at TIMESTAMPTZ,
    rolled_back_to UUID REFERENCES dev_deployments(id)
);

CREATE INDEX idx_dev_deployments_project ON dev_deployments(project);
CREATE INDEX idx_dev_deployments_env ON dev_deployments(environment);
CREATE INDEX idx_dev_deployments_status ON dev_deployments(status);
CREATE INDEX idx_dev_deployments_created ON dev_deployments(created_at DESC);

-- ============================================
-- TRADELINE TYPES (the available tradeline categories)
-- ============================================

CREATE TABLE IF NOT EXISTS dev_tradeline_types (
    id VARCHAR(100) PRIMARY KEY, -- security, electrical, lowvoltage, etc.
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(50) DEFAULT 'blue',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SERVER SLOTS (empty shells that can be assigned any tradeline)
-- Patcher tells each slot what tradeline to run
-- Dashboard is where assignments are configured
-- ============================================

CREATE TABLE IF NOT EXISTS dev_engine_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_number INT NOT NULL, -- 1-20 (or more)
    main_port INT NOT NULL UNIQUE, -- 3002, 3003, etc.
    host VARCHAR(255) DEFAULT '64.23.151.201', -- Engine droplet
    assigned_tradeline VARCHAR(100) REFERENCES dev_tradeline_types(id), -- NULL = unassigned
    status VARCHAR(50) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'starting', 'stopping', 'error')),
    last_health_check TIMESTAMPTZ,
    last_assigned_at TIMESTAMPTZ,
    assigned_by UUID REFERENCES dev_team_members(id),
    config JSONB DEFAULT '{}', -- Additional config passed to patcher
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dev_engine_slots_tradeline ON dev_engine_slots(assigned_tradeline);
CREATE INDEX idx_dev_engine_slots_status ON dev_engine_slots(status);
CREATE INDEX idx_dev_engine_slots_port ON dev_engine_slots(main_port);

-- ============================================
-- SERVER MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS dev_servers (
    id VARCHAR(100) PRIMARY KEY, -- tradelines, portals, nextbidder, sources, nexttech, nexttask
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INT NOT NULL,
    status VARCHAR(50) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'degraded', 'maintenance')),
    description TEXT,
    last_health_check TIMESTAMPTZ,
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    uptime_seconds BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Server Credentials (encrypted in practice)
CREATE TABLE IF NOT EXISTS dev_server_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id VARCHAR(100) REFERENCES dev_servers(id) ON DELETE CASCADE,
    credential_type VARCHAR(100) NOT NULL, -- openai, discord, database, etc.
    credential_key VARCHAR(255) NOT NULL,
    credential_value TEXT NOT NULL, -- Should be encrypted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(server_id, credential_type, credential_key)
);

CREATE INDEX idx_dev_credentials_server ON dev_server_credentials(server_id);

-- ============================================
-- GIT REPOSITORIES
-- ============================================

CREATE TABLE IF NOT EXISTS dev_repositories (
    id VARCHAR(100) PRIMARY KEY, -- tradelines, portals, etc.
    name VARCHAR(255) NOT NULL,
    url TEXT,
    default_branch VARCHAR(100) DEFAULT 'main',
    last_commit_hash VARCHAR(100),
    last_commit_message TEXT,
    last_commit_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CALENDAR EVENTS
-- ============================================

CREATE TABLE IF NOT EXISTS dev_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ,
    event_type VARCHAR(50) DEFAULT 'task' CHECK (event_type IN ('task', 'meeting', 'deploy', 'sprint', 'standup', 'review', 'maintenance', 'release', 'timeoff')),
    color VARCHAR(50) DEFAULT '#3B82F6',
    location_address TEXT,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    created_by_id UUID REFERENCES dev_team_members(id),
    created_by_name VARCHAR(255),
    assigned_to_ids UUID[] DEFAULT '{}',
    project VARCHAR(100), -- tradelines, portals, nextbidder, sources, nexttech, nexttask, dashboard
    is_all_day BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT, -- iCal RRULE format for recurring events
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dev_calendar_events_start ON dev_calendar_events(start_datetime);
CREATE INDEX idx_dev_calendar_events_type ON dev_calendar_events(event_type);
CREATE INDEX idx_dev_calendar_events_status ON dev_calendar_events(status);
CREATE INDEX idx_dev_calendar_events_created_by ON dev_calendar_events(created_by_id);

-- ============================================
-- TIME OFF REQUESTS
-- ============================================

CREATE TABLE IF NOT EXISTS dev_time_off_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES dev_team_members(id),
    user_name VARCHAR(255),
    request_type VARCHAR(50) DEFAULT 'vacation' CHECK (request_type IN ('vacation', 'sick', 'personal', 'unpaid', 'other')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
    reviewed_by_id UUID REFERENCES dev_team_members(id),
    reviewed_by_name VARCHAR(255),
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_dev_time_off_user ON dev_time_off_requests(user_id);
CREATE INDEX idx_dev_time_off_status ON dev_time_off_requests(status);
CREATE INDEX idx_dev_time_off_dates ON dev_time_off_requests(start_date, end_date);

-- ============================================
-- TIMESHEET ADJUSTMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS dev_timesheet_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES dev_team_members(id),
    user_name VARCHAR(255),
    request_type VARCHAR(50) DEFAULT 'missed_punch' CHECK (request_type IN ('missed_punch', 'clock_in_correction', 'clock_out_correction', 'missed_break', 'other')),
    adjustment_date DATE NOT NULL,
    original_clock_in TIME,
    original_clock_out TIME,
    requested_clock_in TIME NOT NULL,
    requested_clock_out TIME NOT NULL,
    requested_break_minutes INT DEFAULT 0,
    reason TEXT NOT NULL,
    detailed_description TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    reviewed_by_id UUID REFERENCES dev_team_members(id),
    reviewed_by_name VARCHAR(255),
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_dev_timesheet_adj_user ON dev_timesheet_adjustments(user_id);
CREATE INDEX idx_dev_timesheet_adj_status ON dev_timesheet_adjustments(status);
CREATE INDEX idx_dev_timesheet_adj_date ON dev_timesheet_adjustments(adjustment_date);

-- ============================================
-- TEAM CHAT
-- ============================================

-- Chat Channels (like Slack channels and DMs)
CREATE TABLE IF NOT EXISTS dev_chat_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) DEFAULT 'channel' CHECK (type IN ('channel', 'dm')),
    description TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    created_by_id UUID REFERENCES dev_team_members(id),
    created_by_name VARCHAR(255),
    participants UUID[] DEFAULT '{}', -- For DMs, array of participant user IDs
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dev_chat_channels_type ON dev_chat_channels(type);
CREATE INDEX idx_dev_chat_channels_archived ON dev_chat_channels(archived);

-- Chat Messages
CREATE TABLE IF NOT EXISTS dev_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES dev_chat_channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES dev_team_members(id),
    user_name VARCHAR(255),
    user_avatar TEXT,
    content TEXT NOT NULL,
    is_code BOOLEAN DEFAULT FALSE, -- For code snippets with syntax highlighting
    code_language VARCHAR(50), -- e.g., 'javascript', 'python', 'sql'
    is_edited BOOLEAN DEFAULT FALSE,
    reply_to_id UUID REFERENCES dev_chat_messages(id), -- For threaded replies
    attachments JSONB DEFAULT '[]', -- Array of {filename, url, type}
    reactions JSONB DEFAULT '{}', -- {emoji: [user_ids]}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    edited_at TIMESTAMPTZ
);

CREATE INDEX idx_dev_chat_messages_channel ON dev_chat_messages(channel_id);
CREATE INDEX idx_dev_chat_messages_user ON dev_chat_messages(user_id);
CREATE INDEX idx_dev_chat_messages_created ON dev_chat_messages(created_at DESC);

-- Chat Read Receipts (track unread messages per user per channel)
CREATE TABLE IF NOT EXISTS dev_chat_read_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES dev_team_members(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES dev_chat_channels(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_message_id UUID REFERENCES dev_chat_messages(id),
    UNIQUE(user_id, channel_id)
);

CREATE INDEX idx_dev_chat_receipts_user ON dev_chat_read_receipts(user_id);
CREATE INDEX idx_dev_chat_receipts_channel ON dev_chat_read_receipts(channel_id);

-- ============================================
-- ACTIVITY FEED
-- ============================================

CREATE TABLE IF NOT EXISTS dev_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('deploy', 'ticket', 'task', 'system', 'user')),
    message TEXT NOT NULL,
    project VARCHAR(100),
    user_id UUID REFERENCES dev_team_members(id),
    user_name VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dev_activity_created ON dev_activity(created_at DESC);
CREATE INDEX idx_dev_activity_type ON dev_activity(type);

-- ============================================
-- HELPDESK SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS dev_helpdesk_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auto_assign BOOLEAN DEFAULT TRUE,
    auto_response_enabled BOOLEAN DEFAULT FALSE,
    auto_response_message TEXT,
    notification_email VARCHAR(255),
    slack_webhook TEXT,
    sla_response_hours INT DEFAULT 24,
    sla_resolution_hours INT DEFAULT 72,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default roles
INSERT INTO dev_roles (id, name, description, permissions, level) VALUES
    (gen_random_uuid(), 'Admin', 'Full system access', ARRAY['*'], 5),
    (gen_random_uuid(), 'Developer', 'Development access', ARRAY['servers.view', 'servers.control', 'servers.credentials', 'dev.ssh', 'dev.logs', 'helpdesk.view', 'helpdesk.respond'], 4),
    (gen_random_uuid(), 'Support', 'Helpdesk access', ARRAY['helpdesk.view', 'helpdesk.respond', 'helpdesk.manage'], 3),
    (gen_random_uuid(), 'Viewer', 'Read-only access', ARRAY['servers.view', 'helpdesk.view', 'team.view'], 1)
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO dev_permissions (id, name, description, permission_group) VALUES
    ('servers.view', 'View Servers', 'View server status and logs', 'servers'),
    ('servers.control', 'Control Servers', 'Start, stop, restart servers', 'servers'),
    ('servers.credentials', 'Manage Credentials', 'View and edit server credentials', 'servers'),
    ('servers.deploy', 'Deploy', 'Deploy code to servers', 'servers'),
    ('team.view', 'View Team', 'View team members', 'team'),
    ('team.manage', 'Manage Team', 'Add, edit, remove team members', 'team'),
    ('team.roles', 'Manage Roles', 'Create and edit roles', 'team'),
    ('team.permissions', 'Assign Permissions', 'Grant and revoke permissions', 'team'),
    ('helpdesk.view', 'View Tickets', 'View helpdesk tickets', 'helpdesk'),
    ('helpdesk.respond', 'Respond to Tickets', 'Reply to tickets', 'helpdesk'),
    ('helpdesk.manage', 'Manage Tickets', 'Assign and close tickets', 'helpdesk'),
    ('helpdesk.settings', 'Helpdesk Settings', 'Configure helpdesk', 'helpdesk'),
    ('dev.ssh', 'SSH Access', 'Connect via SSH', 'dev'),
    ('dev.logs', 'View Logs', 'View system logs', 'dev'),
    ('dev.database', 'Database Access', 'Access database tools', 'dev'),
    ('dev.admin', 'Admin Panel', 'Access admin features', 'dev')
ON CONFLICT (id) DO NOTHING;

-- Insert tradeline types (the categories you can assign to slots)
INSERT INTO dev_tradeline_types (id, name, description, color) VALUES
    ('security', 'Security', 'Security services contracts', 'red'),
    ('administrative', 'Administrative', 'Administrative services', 'gray'),
    ('facilities', 'Facilities', 'Facilities management', 'blue'),
    ('logistics', 'Logistics', 'Logistics and supply chain', 'indigo'),
    ('electrical', 'Electrical', 'Electrical services', 'yellow'),
    ('lowvoltage', 'Low Voltage', 'Low voltage systems', 'cyan'),
    ('landscaping', 'Landscaping', 'Landscaping services', 'green'),
    ('hvac', 'HVAC', 'Heating, ventilation, AC', 'orange'),
    ('plumbing', 'Plumbing', 'Plumbing services', 'blue'),
    ('janitorial', 'Janitorial', 'Janitorial services', 'teal'),
    ('support', 'Support', 'Support services', 'purple'),
    ('waste', 'Waste', 'Waste management', 'gray'),
    ('construction', 'Construction', 'Construction services', 'amber'),
    ('roofing', 'Roofing', 'Roofing services', 'brown'),
    ('painting', 'Painting', 'Painting services', 'pink'),
    ('flooring', 'Flooring', 'Flooring services', 'lime'),
    ('demolition', 'Demolition', 'Demolition services', 'red'),
    ('environmental', 'Environmental', 'Environmental services', 'emerald'),
    ('concrete', 'Concrete', 'Concrete services', 'stone'),
    ('fencing', 'Fencing', 'Fencing services', 'zinc')
ON CONFLICT (id) DO NOTHING;

-- Insert 20 engine slots (empty shells ready to be assigned)
-- Workers are auto-calculated: main_port + 100/200/300/400
INSERT INTO dev_engine_slots (slot_number, main_port, host, assigned_tradeline) VALUES
    (1, 3002, '64.23.151.201', 'security'),
    (2, 3003, '64.23.151.201', 'administrative'),
    (3, 3004, '64.23.151.201', 'facilities'),
    (4, 3005, '64.23.151.201', 'logistics'),
    (5, 3006, '64.23.151.201', 'electrical'),
    (6, 3007, '64.23.151.201', 'lowvoltage'),
    (7, 3008, '64.23.151.201', 'landscaping'),
    (8, 3009, '64.23.151.201', 'hvac'),
    (9, 3010, '64.23.151.201', 'plumbing'),
    (10, 3011, '64.23.151.201', 'janitorial'),
    (11, 3012, '64.23.151.201', 'support'),
    (12, 3013, '64.23.151.201', 'waste'),
    (13, 3014, '64.23.151.201', 'construction'),
    (14, 3015, '64.23.151.201', 'roofing'),
    (15, 3016, '64.23.151.201', 'painting'),
    (16, 3017, '64.23.151.201', 'flooring'),
    (17, 3018, '64.23.151.201', 'demolition'),
    (18, 3019, '64.23.151.201', 'environmental'),
    (19, 3020, '64.23.151.201', 'concrete'),
    (20, 3021, '64.23.151.201', 'fencing')
ON CONFLICT (main_port) DO NOTHING;

-- Insert default patcher servers (Patcher Droplet 134.199.209.140)
INSERT INTO dev_servers (id, name, host, port, description, status) VALUES
    ('gateway', 'Gateway', '134.199.209.140', 7000, 'JWT auth hub', 'offline'),
    ('patcher', 'Patcher', '134.199.209.140', 7100, 'Deployment orchestrator', 'offline'),
    ('dashboard', 'Dashboard', '134.199.209.140', 7500, 'Dev command center', 'offline')
ON CONFLICT (id) DO NOTHING;

-- Insert default repositories
INSERT INTO dev_repositories (id, name, default_branch) VALUES
    ('tradelines', 'NextBid Engine Patcher', 'main'),
    ('portals', 'NextBid Portal Patcher', 'main'),
    ('nextbidder', 'NextBidder Patcher', 'main'),
    ('sources', 'Sources Patcher', 'main'),
    ('nexttech', 'NextTech Patcher', 'main'),
    ('nexttask', 'NextTask Patcher', 'main'),
    ('dashboard', 'NextBid Dashboard', 'main')
ON CONFLICT (id) DO NOTHING;

-- Insert default helpdesk settings
INSERT INTO dev_helpdesk_settings (auto_assign, auto_response_enabled, sla_response_hours, sla_resolution_hours)
VALUES (TRUE, FALSE, 24, 72)
ON CONFLICT DO NOTHING;

-- Insert default chat channels
INSERT INTO dev_chat_channels (id, name, type, description, is_private) VALUES
    (gen_random_uuid(), 'general', 'channel', 'General team discussion', FALSE),
    (gen_random_uuid(), 'dev-updates', 'channel', 'Development updates & announcements', FALSE),
    (gen_random_uuid(), 'code-review', 'channel', 'Code snippets and reviews', FALSE),
    (gen_random_uuid(), 'deployments', 'channel', 'Deployment coordination', FALSE),
    (gen_random_uuid(), 'bugs', 'channel', 'Bug reports and fixes', FALSE),
    (gen_random_uuid(), 'random', 'channel', 'Off-topic chat', FALSE)
ON CONFLICT DO NOTHING;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION dev_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
        AND table_name LIKE 'dev_%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_timestamp ON %s', t, t);
        EXECUTE format('CREATE TRIGGER update_%s_timestamp BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION dev_update_timestamp()', t, t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS
-- ============================================

-- Active System Tickets (open or in progress)
CREATE OR REPLACE VIEW dev_active_system_tickets AS
SELECT
    id,
    title,
    status,
    priority,
    project,
    assignee_name,
    created_at
FROM dev_system_tickets
WHERE status IN ('open', 'in_progress')
ORDER BY
    CASE priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
    END,
    created_at DESC;

-- Active User Tickets (open, awaiting response, or in progress)
CREATE OR REPLACE VIEW dev_active_user_tickets AS
SELECT
    id,
    title,
    status,
    priority,
    source_system,
    user_name,
    user_email,
    assigned_to_name,
    created_at,
    last_response_at
FROM dev_user_tickets
WHERE status IN ('open', 'awaiting_response', 'in_progress')
ORDER BY
    CASE priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
    END,
    CASE status
        WHEN 'awaiting_response' THEN 1
        WHEN 'open' THEN 2
        WHEN 'in_progress' THEN 3
    END,
    created_at DESC;

-- Credential Health Summary (credentials per server with last update)
CREATE OR REPLACE VIEW dev_credential_health_summary AS
SELECT
    s.id AS server_id,
    s.name AS server_name,
    s.status AS server_status,
    COUNT(c.id) AS credential_count,
    MAX(c.updated_at) AS last_credential_update,
    CASE
        WHEN COUNT(c.id) = 0 THEN 'missing'
        WHEN MAX(c.updated_at) < NOW() - INTERVAL '90 days' THEN 'stale'
        ELSE 'healthy'
    END AS credential_health
FROM dev_servers s
LEFT JOIN dev_server_credentials c ON s.id = c.server_id
GROUP BY s.id, s.name, s.status
ORDER BY s.name;

-- Credential Pool (all credentials with server info)
CREATE OR REPLACE VIEW dev_credential_pool AS
SELECT
    c.id,
    c.server_id,
    s.name AS server_name,
    c.credential_type,
    c.credential_key,
    c.credential_value,
    c.created_at,
    c.updated_at,
    s.status AS server_status,
    s.host AS server_host,
    s.port AS server_port,
    CASE
        WHEN c.updated_at < NOW() - INTERVAL '90 days' THEN 'stale'
        WHEN c.updated_at < NOW() - INTERVAL '30 days' THEN 'aging'
        ELSE 'fresh'
    END AS freshness
FROM dev_server_credentials c
JOIN dev_servers s ON c.server_id = s.id
ORDER BY s.name, c.credential_type, c.credential_key;

-- Recent Audit Trail (last 100 audit entries with user info)
CREATE OR REPLACE VIEW dev_recent_audit_trail AS
SELECT
    id,
    user_id,
    user_name,
    action,
    resource,
    resource_id,
    details,
    ip_address,
    created_at
FROM dev_audit_log
ORDER BY created_at DESC
LIMIT 100;

-- Server Health Summary (server status with metrics)
CREATE OR REPLACE VIEW dev_server_health_summary AS
SELECT
    s.id,
    s.name,
    s.host,
    s.port,
    s.status,
    s.description,
    s.last_health_check,
    s.cpu_usage,
    s.memory_usage,
    s.uptime_seconds,
    CASE
        WHEN s.status = 'online' AND s.cpu_usage < 80 AND s.memory_usage < 80 THEN 'healthy'
        WHEN s.status = 'online' AND (s.cpu_usage >= 80 OR s.memory_usage >= 80) THEN 'warning'
        WHEN s.status = 'degraded' THEN 'degraded'
        WHEN s.status = 'maintenance' THEN 'maintenance'
        ELSE 'offline'
    END AS health_status,
    CASE
        WHEN s.last_health_check IS NULL THEN 'never'
        WHEN s.last_health_check < NOW() - INTERVAL '5 minutes' THEN 'stale'
        ELSE 'recent'
    END AS check_freshness
FROM dev_servers s
ORDER BY
    CASE s.status
        WHEN 'degraded' THEN 1
        WHEN 'offline' THEN 2
        WHEN 'maintenance' THEN 3
        WHEN 'online' THEN 4
    END,
    s.name;
