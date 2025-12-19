-- ============================================================
-- DEV TOOLS STUDIO OPS - DATABASE MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. ALTER dev_deployments to add release train columns
ALTER TABLE dev_deployments ADD COLUMN IF NOT EXISTS patch_notes_required BOOLEAN DEFAULT TRUE;
ALTER TABLE dev_deployments ADD COLUMN IF NOT EXISTS risk_level VARCHAR(10) DEFAULT 'low';
ALTER TABLE dev_deployments ADD COLUMN IF NOT EXISTS rollback_plan TEXT;
ALTER TABLE dev_deployments ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE dev_deployments ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE dev_deployments ADD COLUMN IF NOT EXISTS canary_scope INT DEFAULT 1;
ALTER TABLE dev_deployments ADD COLUMN IF NOT EXISTS canary_expanded_at TIMESTAMPTZ[];

-- 2. Dev Locks - Engineer marks repo "in development" (blocks pulls)
CREATE TABLE IF NOT EXISTS dev_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project VARCHAR(100) NOT NULL,
  branch VARCHAR(100) DEFAULT 'main',
  locked_by UUID,
  locked_by_name VARCHAR(255),
  reason TEXT NOT NULL,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dev_locks_project ON dev_locks(project) WHERE is_active = TRUE;

-- 3. Bug Flags - Block promotion to prod
CREATE TABLE IF NOT EXISTS dev_bug_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project VARCHAR(100) NOT NULL,
  version VARCHAR(50),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('blocker', 'critical', 'major')),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  flagged_by UUID,
  flagged_by_name VARCHAR(255),
  linked_ticket_id UUID,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dev_bug_flags_project ON dev_bug_flags(project) WHERE resolved_at IS NULL;

-- 4. Incidents - War room incident tracking
CREATE TABLE IF NOT EXISTS dev_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  severity VARCHAR(5) NOT NULL CHECK (severity IN ('P1', 'P2', 'P3', 'P4')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'mitigated', 'resolved', 'postmortem')),
  owner_id UUID,
  owner_name VARCHAR(255),
  description TEXT,
  timeline JSONB DEFAULT '[]',
  affected_projects TEXT[] DEFAULT '{}',
  affected_tradelines TEXT[] DEFAULT '{}',
  root_cause TEXT,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  mitigated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_dev_incidents_status ON dev_incidents(status) WHERE status != 'resolved';
CREATE INDEX IF NOT EXISTS idx_dev_incidents_severity ON dev_incidents(severity);

-- 5. Kill Switches - Pause sources, stages, tradelines
CREATE TABLE IF NOT EXISTS dev_kill_switches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  switch_type VARCHAR(50) NOT NULL CHECK (switch_type IN ('source', 'stage', 'tradeline', 'project', 'global')),
  target VARCHAR(100),
  is_enabled BOOLEAN DEFAULT FALSE,
  enabled_by UUID,
  enabled_by_name VARCHAR(255),
  reason TEXT NOT NULL,
  enabled_at TIMESTAMPTZ,
  auto_disable_at TIMESTAMPTZ,
  linked_incident_id UUID REFERENCES dev_incidents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(switch_type, target)
);
CREATE INDEX IF NOT EXISTS idx_dev_kill_switches_enabled ON dev_kill_switches(switch_type) WHERE is_enabled = TRUE;

-- 6. Runbooks / SOPs
CREATE TABLE IF NOT EXISTS dev_runbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  trigger_keywords TEXT[],
  description TEXT,
  steps JSONB NOT NULL,
  created_by UUID,
  last_used_at TIMESTAMPTZ,
  use_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dev_runbooks_category ON dev_runbooks(category);

-- 7. Insert default kill switches (all disabled)
INSERT INTO dev_kill_switches (switch_type, target, is_enabled, reason) VALUES
  ('global', NULL, FALSE, 'Global kill switch - stops all operations'),
  ('source', 'SAM.gov', FALSE, 'Pause SAM.gov discovery'),
  ('source', 'PlanetBids', FALSE, 'Pause PlanetBids discovery'),
  ('source', 'PublicPurchase', FALSE, 'Pause PublicPurchase discovery'),
  ('source', 'CalProcure', FALSE, 'Pause CalProcure discovery'),
  ('stage', 'discovery', FALSE, 'Pause Stage 1 - Discovery'),
  ('stage', 'sow', FALSE, 'Pause Stage 2 - SOW extraction'),
  ('stage', 'documents', FALSE, 'Pause Stage 3 - Document download'),
  ('stage', 'ai', FALSE, 'Pause Stage 4 - AI summarization'),
  ('project', 'tradelines', FALSE, 'Pause NextBid Engine'),
  ('project', 'sources', FALSE, 'Pause NextSource'),
  ('project', 'nextbidder', FALSE, 'Pause NextBidder'),
  ('project', 'portals', FALSE, 'Pause NextBid Portal'),
  ('project', 'nexttech', FALSE, 'Pause NextTech'),
  ('project', 'nexttask', FALSE, 'Pause NextTask')
ON CONFLICT (switch_type, target) DO NOTHING;

-- 8. Insert sample runbooks
INSERT INTO dev_runbooks (title, category, trigger_keywords, description, steps) VALUES
  ('SAM.gov Rate Limit', 'scraper', ARRAY['sam', 'rate limit', '429'],
   'Handle SAM.gov rate limiting (429 errors)',
   '[{"step": 1, "title": "Check error logs", "action": "View PM2 logs for the affected tradeline", "notes": "Look for 429 status codes"}, {"step": 2, "title": "Pause discovery", "action": "Enable SAM.gov kill switch", "notes": "This stops new requests"}, {"step": 3, "title": "Wait 15 minutes", "action": "SAM.gov rate limits reset after 15 min", "notes": ""}, {"step": 4, "title": "Re-enable", "action": "Disable kill switch and monitor", "notes": "Watch for recurring 429s"}]'::jsonb),

  ('OpenAI Balance Low', 'quota', ARRAY['openai', 'balance', 'credit'],
   'Handle low OpenAI API balance',
   '[{"step": 1, "title": "Check balance", "action": "Log into OpenAI dashboard", "notes": "https://platform.openai.com/usage"}, {"step": 2, "title": "Add credits", "action": "Add $50-100 to account", "notes": "Use company card"}, {"step": 3, "title": "Update credential", "action": "Update balance in credentials.json", "notes": "Set new balance amount"}, {"step": 4, "title": "Verify", "action": "Run test AI call", "notes": "Check logs for success"}]'::jsonb),

  ('PlanetBids Login Failed', 'auth', ARRAY['planetbids', 'login', 'auth', 'password'],
   'Handle PlanetBids authentication failure',
   '[{"step": 1, "title": "Verify credentials", "action": "Try manual login at portal", "notes": "Check if password expired"}, {"step": 2, "title": "Reset if needed", "action": "Use forgot password flow", "notes": "May need portal admin access"}, {"step": 3, "title": "Update credential", "action": "Update in credentials.json", "notes": "Use Secrets Manager"}, {"step": 4, "title": "Restart worker", "action": "Reboot affected tradeline", "notes": "Forces credential reload"}]'::jsonb),

  ('Deploy Rollback', 'deploy', ARRAY['rollback', 'revert', 'bad deploy'],
   'Rollback a bad deployment',
   '[{"step": 1, "title": "Identify version", "action": "Find last known good commit", "notes": "Check git log or deployments table"}, {"step": 2, "title": "Create incident", "action": "Log incident if P1/P2", "notes": "Link to this rollback"}, {"step": 3, "title": "Execute rollback", "action": "Use Patcher rollback endpoint", "notes": "POST /rollback/:tradeline/:commit"}, {"step": 4, "title": "Verify", "action": "Check health status", "notes": "Confirm green lights"}]'::jsonb)
ON CONFLICT DO NOTHING;

-- Done!
SELECT 'Migration complete! Tables created: dev_locks, dev_bug_flags, dev_incidents, dev_kill_switches, dev_runbooks' as status;
