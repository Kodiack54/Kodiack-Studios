-- ============================================
-- FIX VIEWS MIGRATION
-- Drops old v_ prefixed views and recreates with dev_ prefix
-- ============================================

-- Drop old views with wrong prefix
DROP VIEW IF EXISTS v_active_system_tickets;
DROP VIEW IF EXISTS v_active_user_tickets;
DROP VIEW IF EXISTS v_credential_health_summary;
DROP VIEW IF EXISTS v_credential_pool;
DROP VIEW IF EXISTS v_recent_audit_trail;
DROP VIEW IF EXISTS v_server_health_summary;

-- ============================================
-- RECREATE VIEWS WITH dev_ PREFIX
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
    a.id,
    a.user_id,
    a.user_name,
    a.action,
    a.resource,
    a.resource_id,
    a.details,
    a.ip_address,
    a.created_at
FROM dev_audit_log a
ORDER BY a.created_at DESC
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

-- ============================================
-- VERIFY VIEWS CREATED
-- ============================================
-- Run this to confirm all views exist:
-- SELECT table_name FROM information_schema.views WHERE table_name LIKE 'dev_%';
