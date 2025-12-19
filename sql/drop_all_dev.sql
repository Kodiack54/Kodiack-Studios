-- ============================================
-- DROP ALL dev_ TABLES AND VIEWS
-- Run this FIRST, then run dev_tables.sql fresh
-- ============================================

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS v_active_system_tickets CASCADE;
DROP VIEW IF EXISTS v_active_user_tickets CASCADE;
DROP VIEW IF EXISTS v_credential_health_summary CASCADE;
DROP VIEW IF EXISTS v_credential_pool CASCADE;
DROP VIEW IF EXISTS v_recent_audit_trail CASCADE;
DROP VIEW IF EXISTS v_server_health_summary CASCADE;
DROP VIEW IF EXISTS dev_active_system_tickets CASCADE;
DROP VIEW IF EXISTS dev_active_user_tickets CASCADE;
DROP VIEW IF EXISTS dev_credential_health_summary CASCADE;
DROP VIEW IF EXISTS dev_credential_pool CASCADE;
DROP VIEW IF EXISTS dev_recent_audit_trail CASCADE;
DROP VIEW IF EXISTS dev_server_health_summary CASCADE;

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS dev_ticket_messages CASCADE;
DROP TABLE IF EXISTS dev_system_ticket_comments CASCADE;
DROP TABLE IF EXISTS dev_user_ticket_history CASCADE;
DROP TABLE IF EXISTS dev_canned_responses CASCADE;
DROP TABLE IF EXISTS dev_system_tickets CASCADE;
DROP TABLE IF EXISTS dev_user_tickets CASCADE;
DROP TABLE IF EXISTS dev_helpdesk_settings CASCADE;
DROP TABLE IF EXISTS dev_activity CASCADE;
DROP TABLE IF EXISTS dev_deployments CASCADE;
DROP TABLE IF EXISTS dev_server_credentials CASCADE;
DROP TABLE IF EXISTS dev_servers CASCADE;
DROP TABLE IF EXISTS dev_repositories CASCADE;
DROP TABLE IF EXISTS dev_code_pushes CASCADE;
DROP TABLE IF EXISTS dev_builds CASCADE;
DROP TABLE IF EXISTS dev_deploy_logs CASCADE;
DROP TABLE IF EXISTS dev_tasks CASCADE;
DROP TABLE IF EXISTS dev_break_periods CASCADE;
DROP TABLE IF EXISTS dev_time_punches CASCADE;
DROP TABLE IF EXISTS dev_schedules CASCADE;
DROP TABLE IF EXISTS dev_audit_log CASCADE;
DROP TABLE IF EXISTS dev_team_members CASCADE;
DROP TABLE IF EXISTS dev_users CASCADE;
DROP TABLE IF EXISTS dev_roles CASCADE;
DROP TABLE IF EXISTS dev_permissions CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS dev_update_timestamp CASCADE;

-- ============================================
-- DONE - Now run dev_tables.sql
-- ============================================
