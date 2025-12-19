 NextBid Production Studio Ops Console - Master Plan

 Vision

 Build a studio-grade ops console that controls 6 products, supports 4 roles, enforces release discipline, and
 provides observability across the entire NextBid ecosystem.

 Guardrails, not buttons.

 ---
 The 6-Product Ecosystem

 | Product           | Port      | What It Does                      | Integration Priority           |
 |-------------------|-----------|-----------------------------------|--------------------------------|
 | NextBid Engine    | 3002-3021 | 20 tradeline opportunity scrapers | HIGH - deploy, logs, health    |
 | NextSource        | 5103      | AI source learning (50+ APIs)     | HIGH - worker control, queues  |
 | MyKeystone Portal | 8004      | CRM, AI proposals, pipeline       | MEDIUM - tenant ops, AI config |
 | Gateway           | 7000      | JWT authentication                | LOW - audit logs               |
 | Patcher           | 7100      | Deployment orchestrator           | HIGH - release train           |
 | Dashboard         | 7500      | THIS CONSOLE                      | N/A                            |

 ---
 Role-Based Access Matrix

 | Feature              | Admin | Lead | Engineer           | Dev |
 |----------------------|-------|------|--------------------|-----|
 | View dashboards/logs | ✓     | ✓    | ✓                  | ✓   |
 | Reboot servers       | ✓     | ✓    | ✓                  | ✓   |
 | Manage credentials   | ✓     | ✓    | ✓                  | ✓   |
 | HelpDesk operations  | ✓     | ✓    | ✓                  | ✓   |
 | Kill switches        | ✓     | ✓    | ✓                  | ✗   |
 | Push to Test         | ✓     | ✓    | ✓                  | ✗   |
 | Push to Prod         | ✓     | ✓    | ✗ (needs approval) | ✗   |
 | Edit source code     | ✓     | ✓    | ✓                  | ✗   |
 | Approve prod deploys | ✓     | ✓    | ✗                  | ✗   |
 | Manage users/roles   | ✓     | ✓    | ✗                  | ✗   |
 | Rotate secrets       | ✓     | ✗    | ✗                  | ✗   |

 ---
 8 Major Sections (Tabs/Areas)

 1. Release & Patch Operations

 Purpose: Ship safely with discipline

 Features:
 - Release Train View: Visual pipeline showing what's in Dev → Test → Prod per project
 - Patch Notes Builder: REQUIRED before any deploy (what changed, risk, rollback plan)
 - Staged Rollout Controls: Canary 1 tradeline → 5 → 20 → all
 - Freeze/Lock Button: "No deploys to prod" during incidents
 - Dev Lock: Engineer marks repo "in development" (blocks pulls)
 - Bug Flag: Testing flags bug → blocks promotion to prod
 - Rollback Control: Pick version + scope (single/tradeline/all)
 - Diff Summary: Human-readable (files, configs, DB migrations)
 - Dependency Check: Warns if Engine patch requires Portal patch

 Files to create:
 src/app/dev-controls/releases/
 ├── page.tsx                    # Release train dashboard
 ├── [project]/page.tsx          # Per-project release view
 └── components/
     ├── ReleaseTrain.tsx        # Visual Dev→Test→Prod pipeline
     ├── PatchNotesModal.tsx     # Required patch notes form
     ├── CanaryControls.tsx      # Staged rollout UI
     ├── FreezeBanner.tsx        # Global deploy freeze indicator
     └── DiffViewer.tsx          # File/config diff display

 ---
 2. Incident Response (War Room)

 Purpose: Stop firefighting blind

 Features:
 - Incident Page: Create incident, assign owner, severity (P1-P4), status, timeline
 - Runbooks: Clickable SOPs ("PublicPurchase auth issue", "SAM quota", "OpenAI low balance")
 - Kill Switches:
   - Pause discovery per source (SAM, PP, PlanetBids)
   - Pause stage 2 only (doc download)
   - Pause AI summarization only
   - Pause entire tradeline
 - Quarantine Mode: Isolate misbehaving source/tradeline from master data
 - Auto-Mitigation Rules: "3 failures in 10 min → disable source + open ticket"

 Files to create:
 src/app/dev-controls/incidents/
 ├── page.tsx                    # Active incidents list
 ├── [id]/page.tsx               # Incident detail + timeline
 ├── runbooks/page.tsx           # SOP library
 └── components/
     ├── IncidentForm.tsx        # Create/edit incident
     ├── KillSwitchPanel.tsx     # All kill switches in one place
     ├── RunbookCard.tsx         # Clickable SOP
     └── QuarantineModal.tsx     # Isolate source/tradeline

 ---
 3. Observability & Quality

 Purpose: Know if it's good, not just up

 Features:
 - Pipeline Throughput: Ops/hour by stage (1, 1.5, 2, 3, 4)
 - Error Heatmap: By source + stage + tradeline
 - Dedup Rate: New vs duplicate trends
 - Doc Success Rate: Downloads attempted vs succeeded, avg size, slowest sources
 - AI Cost Dashboard: Spend by project/tradeline/source/stage with alerts
 - Data Quality Score: % with POP, due date, contacts, attachments, valid URL
 - Bad Leads Feedback: User-marked junk by source (tune filters)

 Files to create:
 src/app/dev-controls/observability/
 ├── page.tsx                    # Overview dashboard
 ├── pipeline/page.tsx           # Throughput metrics
 ├── errors/page.tsx             # Error heatmap
 ├── ai-costs/page.tsx           # AI spend tracking
 ├── quality/page.tsx            # Data quality scores
 └── components/
     ├── ThroughputChart.tsx
     ├── ErrorHeatmap.tsx
     ├── CostTracker.tsx
     ├── QualityScoreCard.tsx
     └── SourceHealthTable.tsx

 ---
 4. Source Lifecycle Management

 Purpose: Manage the source learning pipeline (NextSource integration)

 Features:
 - Source Registry: Every source, owner, status, last success
 - Credential Health: Expiring soon, invalid, rate limited, captcha detected
 - Secondary-Source Routing: Rules editor for 1.5 behavior
 - Playground/Sandbox: Run source against single URL, see step-by-step
 - Snapshot Library: "What page looked like when it broke"
 - Change Detection: "Page structure changed" alerts (DOM markers missing)
 - Worker Control: Start/stop/pause workers, assign roles (validation/navigation/learning/extraction)

 Integration with NextSource (port 5103):
 - Proxy /nextsource/* to 134.199.209.140:5103
 - Use WebSocket for real-time worker status
 - Key endpoints: /api/sources, /api/workers, /api/supervisor/*, /api/kpis

 Files to create:
 src/app/dev-controls/sources/
 ├── page.tsx                    # Source registry
 ├── [sourceId]/page.tsx         # Source detail + history
 ├── workers/page.tsx            # Worker management
 ├── playground/page.tsx         # Test source runner
 └── components/
     ├── SourceTable.tsx
     ├── CredentialHealthCard.tsx
     ├── WorkerStatusPanel.tsx
     ├── PlaygroundRunner.tsx
     └── SnapshotViewer.tsx

 ---
 5. Federation & Crowd Controls (Quest System Ready)

 Purpose: Governance for when users contribute data

 Features:
 - Contributor Leaderboard: Who contributed unique opps (per tradeline/region)
 - Trust Scoring: Detect spam/garbage contributors, throttle/ban
 - Merge Rules: How conflicts resolve (title mismatches, duplicate IDs)
 - Attribution Tracking: "This opp came from AZ roofer API"
 - Incentive Flags: Contributor vs consumer tier, contribution quotas

 Files to create:
 src/app/dev-controls/federation/
 ├── page.tsx                    # Federation overview
 ├── contributors/page.tsx       # Leaderboard
 ├── trust/page.tsx              # Trust scoring management
 ├── merge-rules/page.tsx        # Conflict resolution config
 └── components/
     ├── LeaderboardTable.tsx
     ├── TrustScoreCard.tsx
     └── MergeRuleEditor.tsx

 ---
 6. Security & Access

 Purpose: Studio-grade access control

 Features:
 - Role-Based Access Console: Who can deploy, edit configs, touch prod
 - Audit Log: Every action (deploy, rollback, credential change, kill-switch flip)
 - Secrets Manager UI: Rotate keys, show last rotated, who rotated
 - Environment Gates: Devs can't touch Prod; Engineers need approval
 - 2-Person Rule (optional): Engineer pushes, Lead approves

 Files to create:
 src/app/dev-controls/security/
 ├── page.tsx                    # Security overview
 ├── audit-log/page.tsx          # Full audit trail
 ├── secrets/page.tsx            # Secrets manager
 ├── access/page.tsx             # Role management
 └── components/
     ├── AuditLogTable.tsx
     ├── SecretCard.tsx
     ├── AccessMatrix.tsx
     └── ApprovalQueue.tsx

 ---
 7. Work Management

 Purpose: Studio workflow discipline

 Features:
 - Triage Queue Views: By severity, product, tradeline, customer-facing
 - Link Ticket to Incident: Avoid duplicate work
 - Postmortems: Template + required completion for P1 incidents
 - Change Requests: Structured requests for new sources/features

 Integration: Enhance existing HelpDesk tab

 Files to modify/create:
 src/app/helpdesk/
 ├── incidents/page.tsx          # Link to incident system
 ├── postmortems/page.tsx        # Post-incident reviews
 ├── change-requests/page.tsx    # Feature/source requests
 └── components/
     ├── TriageFilters.tsx
     ├── PostmortemTemplate.tsx
     └── ChangeRequestForm.tsx

 ---
 8. Customer Ops Tools

 Purpose: Support becomes engineering load

 Features:
 - Impersonate Client (safe mode): View as them without secrets
 - Tenant Health: "This customer's feeds degraded due to creds/rate limits"
 - Data Export Tools: For enterprise requests
 - Quota Controls: Doc storage, API calls/day, AI usage caps per client

 Files to create:
 src/app/dev-controls/customer-ops/
 ├── page.tsx                    # Customer overview
 ├── [tenantId]/page.tsx         # Tenant health detail
 ├── impersonate/page.tsx        # Safe impersonation
 └── components/
     ├── TenantHealthCard.tsx
     ├── QuotaEditor.tsx
     └── ExportTools.tsx

 ---
  Database Schema

 ALREADY EXISTS (in dev_tables.sql):

 -- dev_audit_log ✅ - action, resource, resource_id, details, ip_address
 -- dev_deployments ✅ - project, environment, status, branch, commit, notes
 -- dev_repositories ✅ - 7 repos defined
 -- dev_servers ✅ - gateway, patcher, dashboard
 -- dev_server_credentials ✅ - per-server credentials
 -- dev_roles + dev_permissions + dev_team_members ✅
 -- dev_system_tickets / dev_user_tickets ✅ - HelpDesk
 -- dev_engine_slots ✅ - 20 tradeline slots
 -- dev_tradeline_types ✅ - 20 tradelines
 -- dev_calendar_events, dev_chat_*, dev_activity ✅

 NEEDS TO BE ADDED (new tables for studio ops):

 -- ALTER dev_deployments to add release train columns
 ALTER TABLE dev_deployments ADD COLUMN IF NOT EXISTS
   patch_notes_required BOOLEAN DEFAULT TRUE,
   risk_level VARCHAR(10) DEFAULT 'low',     -- 'low', 'medium', 'high'
   rollback_plan TEXT,
   approved_by UUID REFERENCES dev_team_members(id),
   approved_at TIMESTAMPTZ,
   canary_scope INT DEFAULT 1,               -- 1, 5, 20, -1 (all)
   canary_expanded_at TIMESTAMPTZ[];         -- Track when expanded

 -- Dev Locks (NEW)
 CREATE TABLE dev_locks (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   project VARCHAR(100) NOT NULL,            -- 'tradelines', 'sources', etc.
   branch VARCHAR(100) DEFAULT 'main',
   locked_by UUID REFERENCES dev_team_members(id),
   locked_by_name VARCHAR(255),
   reason TEXT NOT NULL,
   locked_at TIMESTAMPTZ DEFAULT NOW(),
   expires_at TIMESTAMPTZ,                   -- NULL = indefinite
   is_active BOOLEAN DEFAULT TRUE
 );
 CREATE INDEX idx_dev_locks_project ON dev_locks(project) WHERE is_active = TRUE;

 -- Bug Flags (NEW) - block promotion to prod
 CREATE TABLE dev_bug_flags (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   project VARCHAR(100) NOT NULL,
   version VARCHAR(50),                      -- commit hash or version tag
   severity VARCHAR(20) NOT NULL CHECK (severity IN ('blocker', 'critical', 'major')),
   title VARCHAR(500) NOT NULL,
   description TEXT,
   flagged_by UUID REFERENCES dev_team_members(id),
   flagged_by_name VARCHAR(255),
   linked_ticket_id UUID REFERENCES dev_system_tickets(id),
   resolved_at TIMESTAMPTZ,
   resolved_by UUID REFERENCES dev_team_members(id),
   created_at TIMESTAMPTZ DEFAULT NOW()
 );
 CREATE INDEX idx_dev_bug_flags_project ON dev_bug_flags(project) WHERE resolved_at IS NULL;

 -- Incidents (NEW)
 CREATE TABLE dev_incidents (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   title VARCHAR(500) NOT NULL,
   severity VARCHAR(5) NOT NULL CHECK (severity IN ('P1', 'P2', 'P3', 'P4')),
   status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'mitigated', 'resolved',
 'postmortem')),
   owner_id UUID REFERENCES dev_team_members(id),
   owner_name VARCHAR(255),
   description TEXT,
   timeline JSONB DEFAULT '[]',              -- [{timestamp, action, by, notes}]
   affected_projects TEXT[] DEFAULT '{}',
   affected_tradelines TEXT[] DEFAULT '{}',
   root_cause TEXT,
   resolution TEXT,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   mitigated_at TIMESTAMPTZ,
   resolved_at TIMESTAMPTZ
 );
 CREATE INDEX idx_dev_incidents_status ON dev_incidents(status) WHERE status != 'resolved';
 CREATE INDEX idx_dev_incidents_severity ON dev_incidents(severity);

 -- Kill Switches (NEW)
 CREATE TABLE dev_kill_switches (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   switch_type VARCHAR(50) NOT NULL CHECK (switch_type IN ('source', 'stage', 'tradeline', 'project', 'global')),
   target VARCHAR(100),                      -- source name, stage number, tradeline name (NULL for global)
   is_enabled BOOLEAN DEFAULT FALSE,
   enabled_by UUID REFERENCES dev_team_members(id),
   enabled_by_name VARCHAR(255),
   reason TEXT NOT NULL,
   enabled_at TIMESTAMPTZ,
   auto_disable_at TIMESTAMPTZ,              -- Optional auto-restore
   linked_incident_id UUID REFERENCES dev_incidents(id),
   created_at TIMESTAMPTZ DEFAULT NOW(),
   UNIQUE(switch_type, target)
 );
 CREATE INDEX idx_dev_kill_switches_enabled ON dev_kill_switches(switch_type) WHERE is_enabled = TRUE;

 -- Runbooks / SOPs (NEW)
 CREATE TABLE dev_runbooks (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   title VARCHAR(255) NOT NULL,
   category VARCHAR(50) NOT NULL,            -- 'auth', 'quota', 'scraper', 'deploy', 'database'
   trigger_keywords TEXT[],                  -- Keywords to auto-suggest this runbook
   description TEXT,
   steps JSONB NOT NULL,                     -- [{step_number, title, action, notes, estimated_minutes}]
   created_by UUID REFERENCES dev_team_members(id),
   last_used_at TIMESTAMPTZ,
   use_count INT DEFAULT 0,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
 );
 CREATE INDEX idx_dev_runbooks_category ON dev_runbooks(category);

 ---
 Implementation Phases

 Phase 1: Foundation (Start Here)

 1. Fix API layer to connect to real patcher (7100-7106)
 2. Create dev_audit_log table + logging middleware
 3. Add role checks to all existing dev-controls pages
 4. Create basic Release Train view (read-only)

 Phase 2: Release Operations

 1. Patch Notes modal (REQUIRED for deploys)
 2. Dev Lock mechanism
 3. Bug Flag system
 4. Canary rollout controls

 Phase 3: Incident Response

 1. Incident CRUD
 2. Kill switch panel
 3. Basic runbooks

 Phase 4: Source Integration (NextSource)

 1. Proxy NextSource admin (port 5103)
 2. Worker status panel
 3. Source registry view

 Phase 5: Observability

 1. AI cost dashboard
 2. Error heatmap
 3. Pipeline throughput

 Phase 6: Security & Audit

 1. Audit log viewer
 2. Secrets manager
 3. Access matrix

 Phase 7: Customer Ops

 1. Tenant health
 2. Safe impersonation
 3. Quota controls

 Phase 8: Federation (Quest Ready)

 1. Contributor framework
 2. Trust scoring
 3. Merge rules

 ---
 Key Files to Modify (Existing)

 src/app/dev-controls/
 ├── page.tsx                    # Update hub with 8 sections
 ├── api.ts                      # Fix URLs, add all endpoints
 ├── deploy/page.tsx             # Add patch notes requirement
 ├── git/page.tsx                # Add dev lock mechanism
 ├── logs/page.tsx               # Connect to real logs
 └── ssh/page.tsx                # Add real server info

 src/components/
 ├── Sidebar.tsx                 # Add new nav sections
 └── Navigation.tsx              # Already has Dev Tools tab

 ---
 API Integration Map

 | Dashboard Route             | Backend Endpoint                | Port       |
 |-----------------------------|---------------------------------|------------|
 | /dev-controls/releases      | /deploy/jobs, /patch/history    | 7100       |
 | /dev-controls/sources       | /api/sources, /api/supervisor/* | 5103       |
 | /dev-controls/credentials   | /credentials/*                  | 7101       |
 | /dev-controls/config        | /config/*, /tradelines          | 7101       |
 | /dev-controls/logs          | /server/logs/:tradeline         | 7101       |
 | /dev-controls/observability | /api/kpis                       | 5103, 7101 |

 ---
 Notes

 1. Always audit - Every action writes to dev_audit_log
 2. Patch notes required - No deploy without description
 3. Canary by default - Start with 1 tradeline, expand manually
 4. Bug flags block - Flagged version cannot promote to prod
 5. Dev locks respected - Locked repos skip in pull operations
 6. Role checks everywhere - Check user role before showing actions