-- ============================================
-- CLEANUP: Remove user/person tables from nextbid_ prefix
--
-- nextbid_ is for SYSTEM data only:
--   - canonical opportunities
--   - server health
--   - company/tradeline data
--   - API tokens
--   - system audit logs
--
-- People belong in their product prefix:
--   - dev_team_members (dashboard staff)
--   - portal_users, portal_clients (portal people)
--   - nextbidder_users (nextbidder app people)
--   - nexttech_users (nexttech app people)
-- ============================================

-- Drop user/person tables that don't belong in nextbid_
DROP TABLE IF EXISTS nextbid_ticket_messages CASCADE;
DROP TABLE IF EXISTS nextbid_user_tickets CASCADE;
DROP TABLE IF EXISTS nextbid_sessions CASCADE;
DROP TABLE IF EXISTS nextbid_permissions CASCADE;
DROP TABLE IF EXISTS nextbid_staff_users CASCADE;
DROP TABLE IF EXISTS nextbid_users CASCADE;

-- ============================================
-- KEEPING these nextbid_ tables (system data):
-- ============================================
-- nextbid_api_tokens          - API tokens for services
-- nextbid_audit_log           - System audit trail
-- nextbid_canonical_opportunities - Core opportunity data
-- nextbid_companies           - Company records
-- nextbid_company_credentials - Company API keys
-- nextbid_company_tradelines  - Tradeline assignments
-- nextbid_patcher_credential_health - Credential monitoring
-- nextbid_patcher_server_health - Server monitoring
-- nextbid_patcher_tickets     - System/patcher tickets (not user tickets)
-- ============================================
