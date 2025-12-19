# NextBid Dashboard v2 - TODO

---

## 🔐 PERMISSION SYSTEM ARCHITECTURE (In Progress)

### The Problem We're Solving
- Gateway (7000) and Dashboard (7500) had SEPARATE user/permission systems
- Gateway was checking non-existent `nextbid_users` table
- Dashboard has `dev_team_members` + `dev_roles` tables
- Need to centralize: Gateway authenticates, each product authorizes

### Architecture Decision

```
┌─────────────────────────────────────────────────────────────────┐
│                     GATEWAY (7000)                               │
│                     Authentication ONLY                          │
│                                                                   │
│  1. User logs in with email/password                             │
│  2. Gateway checks ALL product user tables:                      │
│     ├── dev_users            → Dashboard access                  │
│     ├── portal_users         → Portal access                     │
│     ├── nextbidder_users     → NextBidder access                 │
│     ├── nexttech_users       → NextTech access                   │
│     ├── nexttask_users       → NextTask access                   │
│     └── nextsource_users     → NextSource access                 │
│                                                                   │
│  3. JWT contains: { email, products: ['dashboard', 'portal'] }   │
│                                                                   │
│  4. Redirect:                                                    │
│     └── 1 product  → straight to that system                    │
│     └── 2+ products → choice popup                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DASHBOARD (7500)                             │
│                     Authorization (own permissions)              │
│                                                                   │
│  1. Reads JWT from Gateway cookie (accessToken)                  │
│  2. Verifies 'dashboard' is in products[]                        │
│  3. Queries dev_users by nextbid_user_id                         │
│  4. Gets role from dev_users.role                                │
│  5. Enforces permissions based on ROLE_PERMISSIONS[role]         │
└─────────────────────────────────────────────────────────────────┘
```

### Table Naming Convention
| Prefix | Purpose | Examples |
|--------|---------|----------|
| `nextbid_*` | System-wide/canonical ONLY | `nextbid_canonical_opportunities`, `nextbid_companies` |
| `dev_*` | Dashboard/dev team | `dev_team_members`, `dev_roles`, `dev_deployments` |
| `portal_*` | Portal users | `portal_users`, `portal_companies` |
| `nextbidder_*` | NextBidder | `nextbidder_users` |
| `nexttech_*` | NextTech | `nexttech_users` |
| `nexttask_*` | NextTask | `nexttask_users` |

### Dashboard Role Hierarchy (dev_roles)
| Role | Level | Permissions |
|------|-------|-------------|
| SuperAdmin | 6 | All projects + all permissions + hasAllProjects=true |
| Admin | 5 | Assigned projects + all permissions |
| Lead | 4 | Assigned projects + deploy + manage users |
| Engineer | 3 | Assigned projects + push to test |
| Developer | 2 | Assigned projects + reboot + credentials |
| Support | 1 | Assigned projects + helpdesk only |

### Current Blockers
- [ ] **Add Supabase keys to .env** - Both `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_KEY` are empty

### Completed (Dec 12, 2025)
- [x] **Gateway login updated** - Checks `dev_users` table for Dashboard access
- [x] **Dashboard reads Gateway JWT** - UserContext.tsx now parses accessToken cookie
- [x] **dev_users table created** - For Dashboard user auth/permissions

### Completed (Dec 13, 2025)
- [x] **Per-droplet auth system built** - Each droplet runs auth on port 7000
- [x] **Engine auth service created** - `NextBid/auth/server.js` with `/auto-login` endpoint
- [x] **Auto-login token exchange** - Gateway token verified, local token issued, no re-login needed
- [x] **Dashboard deployed to server** - Running at `/var/www/dashboard-7500` via PM2
- [x] **Firewall ports opened** - 7500, 7100, 7102-7106 on Patcher; 7000 on Engine/Dev/Portals

### Files Modified
1. `gateway-7000/server.js` - Login checks all 6 product user tables, fixed dashboard redirect
2. `dashboard-7500/src/app/settings/UserContext.tsx` - Reads Gateway JWT, queries `dev_users`
3. `dashboard-7500/src/app/api/engine-redirect/route.ts` - Passes token to engine auth for auto-login
4. `NextBid/auth/server.js` - Engine droplet auth service on port 7000
5. `NextBid/admin/server.js` - Added role-based permission middleware (6 levels)
6. `gateway-7000/docs/DOMAINS-AND-AUTH.md` - Documented per-droplet auth architecture

---

## Completed Features

### Core Infrastructure
- [x] Next.js 14 App Router setup
- [x] Supabase integration
- [x] Gateway JWT authentication
- [x] Role-based access (admin, lead, engineer, developer)
- [x] NextBid Portal-style navigation
- [x] Dark theme throughout

### Calendar System (DONE)
- [x] Week view with hourly grid (80px/hour)
- [x] Month view with day cells
- [x] Drag-and-drop event rescheduling
- [x] Multi-hour drag selection for new events
- [x] Quick add events on slot click
- [x] Create Event modal
- [x] Edit Event modal with delete
- [x] Time Off Request modal
- [x] Timesheet Adjustment modal
- [x] Team calendars with role-based filtering
- [x] Collapsible "Today's Overview" stats
- [x] Auto-collapse servers section on calendar page
- [x] Noon indicator line
- [x] Header alignment fix (scrollbar sync)
- [x] Documentation: `src/app/calendar/calendarinfo.md`

### Chat System (DONE)
- [x] Slack-like dropdown panel
- [x] Channels (#general, #dev-updates, #code-review, #deployments)
- [x] Direct Messages
- [x] Code mode with syntax highlighting
- [x] Copy code button
- [x] Draggable panel
- [x] Resizable panel
- [x] Maximize/minimize buttons
- [x] Unread badges
- [x] Database tables (dev_chat_channels, dev_chat_messages, dev_chat_read_receipts)

### UI Polish (DONE)
- [x] Custom NextBid favicon
- [x] Cleaned public folder (removed unused assets)
- [x] Button outlines on gradient banner
- [x] Independent sidebar scrolling
- [x] Collapsible sidebar sections

---

## In Progress

### Database
- [ ] Run `sql/dev_tables.sql` on production Supabase
- [ ] Seed initial team members
- [ ] Connect calendar to live database (currently mock data)
- [ ] Connect chat to Supabase realtime

---

## Servers Tab - Tradelines (Major Redesign)

### Completed (Dec 13, 2025)

#### Layout Implementation
- [x] **Top Row (3/4 + 1/4 split)**
  - Server list (3/4 width) - scrollable list of 20 tradelines
  - Server detail panel (1/4 width) - shows selected server stats
  - Fixed height (280px) to prevent layout bouncing with long names

- [x] **Bottom Row (Stats + Feed/Terminal)**
  - ServerStatsPanel (left, w-80) - per-tradeline daily stats from Supabase
  - Live Feed + Terminal (right, flex-1) - real-time logs and SSH terminal

#### Server List Item Features
- [x] Port number display (31001-31020)
- [x] Tradeline display name (truncated for long names)
- [x] Status dots (Main + 3 Workers) - green=online, red=offline
- [x] Resource bars: CPU, MEM, NET, DISK
- [x] Health indicator (✓ healthy, X/Y partial, ✗ stopped)
- [x] **"Online" button** - opens tradeline site through gateway proxy
- [x] Fixed header height for 2-line names (line-clamp-2)

#### Server Detail Panel (Right Side)
- [x] Tradeline name + port display
- [x] Real PM2 process stats (Status, Uptime, Memory, CPU)
- [x] Process list with per-process stats
- [x] Auto-refresh every 10 seconds (no loading flash)
- [x] Retry button on error

#### Server Stats Panel (Bottom Left)
- [x] Today's opportunities found
- [x] Today's documents processed
- [x] AI cost (today)
- [x] By Source breakdown (Fed/State/Local/Municipal/Regional)
- [x] By Stage breakdown (Stages 1-4)
- [x] Storage bar (8 GB limit per tradeline)
- [x] All-time totals
- [x] Auto-refresh every 30 seconds

#### Live Feed Panel
- [x] Real-time PM2 logs from engine server
- [x] Worker tabs: Engine (006), Discovery (106), Scope (206), Research (306), Assistant (406)
- [x] Pause/Resume toggle
- [x] Manual refresh button
- [x] Color-coded log levels (info, warn, error, debug)
- [x] Auto-scroll to bottom

#### Terminal Panel
- [x] SSH command execution (pending patcher deployment)
- [x] PM2 commands for manual server control
- [x] Command history

#### DISK Bar - Real Data
- [x] Wired to Supabase storage via `/api/dev-controls/analytics/engine`
- [x] 8 GB limit per tradeline (100 GB total Supabase Pro Plan)
- [x] Color warnings: cyan < 75%, yellow 75-90%, red > 90%

#### Gateway Integration
- [x] Updated gateway tradeline proxy to 5-digit ports (31001-31020)
- [x] Proxy routes to engine server (64.23.151.201) instead of localhost
- [x] "Online" button uses `/api/engine-redirect?port={port}` for seamless auth
- [x] Opened firewall ports 31001-31020 on engine server
- [x] Auto-login flow: Dashboard → Engine Auth (7000) → Tradeline (31xxx)

### Still TODO
- [ ] Real-time feed panel (WebSocket instead of polling)
  - WebSocket connection to each patcher
  - Heartbeat pulses
  - Deploy notifications
- [ ] NET bar - currently placeholder (needs network monitoring data)
- [ ] AI Cost tracking (moved from Observability)
  - OpenAI GPT-4 spend
  - Embeddings spend
  - Claude spend
  - 24h / 7d / 30d views
- [ ] Per-Server Detail Page
  - Keyword performance (which keywords find most ops)
  - Category performance (which categories hit, which don't)
  - Edit/Add/Delete tradeline keywords
  - Edit/Add/Delete categories
  - Server-specific metrics and reporting

### Files Created/Modified
- `src/app/servers/tradelines/page.tsx` - Server-side data fetching
- `src/app/servers/tradelines/components/TradelinesClient.tsx` - Main layout
- `src/app/servers/tradelines/components/ServerListItem.tsx` - Tradeline row with Online button
- `src/app/servers/tradelines/components/ServerDetailPanel.tsx` - Right-side stats
- `src/app/servers/tradelines/components/ServerStatsPanel.tsx` - Bottom-left daily stats
- `src/app/servers/tradelines/components/LiveFeedPanel.tsx` - Real-time logs
- `src/app/servers/tradelines/components/TerminalPanel.tsx` - SSH terminal
- `src/app/servers/tradelines/api.ts` - Patcher API calls
- `src/app/api/tradelines/stats/[tradeline]/route.ts` - Per-tradeline Supabase stats
- `gateway-7000/server.js` - Updated tradeline proxy to 5-digit ports

---

## Dev Tools Tab - Phase 2 Complete

### Foundation (DONE)
- [x] API layer connected to real patcher (7100/7101)
- [x] UserContext for role management (`src/app/settings/UserContext.tsx`)
- [x] RoleGate component for permission-based UI (`src/app/settings/RoleGate.tsx`)
- [x] Role checks on deploy buttons (canPushToTest, canPushToProd)
- [x] Role checks on Git pull/push operations
- [x] Release Train view (`src/app/dev-controls/releases/page.tsx`)

### Git Operations (Functional)
- [x] Git page with Pull/Push buttons
- [x] Role-protected actions (Pull=canPushToTest, Push=canPushToProd)
- [x] Connected to real API (gitPullDev, pushDevToProd)
- [ ] Branch switching
- [ ] View commit history

### Deployment Pipeline (DONE)
- [x] Release Train visual (Dev → Test → Prod per project)
- [x] Quick Deploy modal with role checks
- [x] Production option disabled for non-prod users
- [x] Patch Notes modal (REQUIRED before deploys)
- [x] Canary rollout controls (1 → 5 → 20 → all)
- [x] Dev Lock mechanism (mark repo "in development")
- [x] Bug Flag system (block promotion to prod)

### Release Operations - Phase 2 (DONE)
- [x] PatchNotesModal component (`src/app/dev-controls/releases/components/PatchNotesModal.tsx`)
- [x] DevLockPanel component (`src/app/dev-controls/releases/components/DevLockPanel.tsx`)
- [x] BugFlagPanel component (`src/app/dev-controls/releases/components/BugFlagPanel.tsx`)
- [x] CanaryControls component (`src/app/dev-controls/releases/components/CanaryControls.tsx`)
- [x] Tabbed interface in releases page (Pipeline | Locks | Bugs | Canary)
- [x] Two-step deploy flow: Config → Patch Notes → Deploy

### Push / Pull Redesign (TODO)
**Problem:** Current page is intimidating with 3-column pipeline view. Need simpler, intuitive design.

**Solution:** Simple 2-panel layout with From/To environment dropdowns

**Environments:**
- **Dev** (161.35.229.220:51xx) - Development server
- **Test** (161.35.229.220:50xx) - Testing/staging server
- **Production** (64.23.151.201:31xxx) - Live production servers

**Common Workflows:**
1. Dev → Test (testing new code)
2. Test → Prod (promoting tested code)
3. Dev → Prod (hotfix)

**Proposed UI:**
```
┌─────────────────────────────────────────────────┐
│  FROM                    TO                      │
│  ┌──────────────┐       ┌──────────────┐        │
│  │ Development ▼│  ──►  │ Test        ▼│        │
│  └──────────────┘       └──────────────┘        │
│                                                  │
│  Commit: abc123         Commit: xyz789          │
│  "Fixed login bug"      "Previous version"      │
│                                                  │
│      [Pull Latest]          [Push Code]         │
│                                                  │
│  ─────────────────────────────────────────────  │
│  Status: Dev is 3 commits ahead of Test         │
└─────────────────────────────────────────────────┘
```

**Key Features:**
- Dropdown to select source environment (Pull From)
- Dropdown to select destination environment (Push To)
- Show current commit on each side
- Simple Pull/Push buttons
- Status line showing commit difference
- Engineer+ required for all operations

### Phase 3 - Features Relocated
~~War Room removed~~ - Features moved to appropriate pages:
- Rollbacks → Push / Pull page
- Server controls (stop/restart/kill) → Servers page with role permissions
- Incidents/runbooks → HelpDesk System Tickets

### Credential Management (Pending)
- [ ] API keys pool
- [ ] Token rotation
- [ ] Encrypted storage viewer
- [ ] Credential health check

### Tradeline Configuration (Pending)
- [ ] Keywords editor
- [ ] Categories manager
- [ ] Config push to servers

### Tradeline Server Management (NEW - Dec 13, 2025)
**Goal:** Launch/manage tradeline servers from dashboard dev tools

#### API Endpoints Needed
- [ ] `POST /api/engine/tradelines/start` - Start a tradeline slot (PM2)
- [ ] `POST /api/engine/tradelines/stop` - Stop a tradeline slot
- [ ] `POST /api/engine/tradelines/restart` - Restart a tradeline slot
- [ ] `GET /api/engine/tradelines/status` - Get PM2 status of all slots

#### UI Components
- [ ] Tradeline Slot Manager panel in Dev Tools
- [ ] Start/Stop/Restart buttons per slot
- [ ] Status indicators (running/stopped/errored)
- [ ] Log viewer for startup output

#### Integration
- [ ] SSH or Patcher API to Engine droplet (64.23.151.201)
- [ ] PM2 commands: `pm2 start slot-01`, `pm2 stop slot-01`, etc.
- [ ] Role requirement: Level 3+ (Engineer)

#### Slot Naming
- slot-01 through slot-20 correspond to ports 31001-31020
- Each slot runs 5 workers (Main, Fetch, Parse, AI, Store)

---

## Analytics Tab (DONE - Dec 12, 2025)

### Overview
Central analytics hub for all 6 products with consistent product tab navigation (matches Push/Pull page).

### Product Tabs
```
[ NextBid Engine | NextSource | NextBidder | NextBid Portal | NextTech | NextTask ]
```

### Completed Features (NextBid Engine)

#### Live Data Connection
- [x] Connected to real Supabase data (`lowvoltage_discovered_opportunities`, `lowvoltage_discovered_opportunity_documents`)
- [x] Dynamic tradeline detection from patcher API (`/tradelines` endpoint)
- [x] Auto-queries all active tradelines and aggregates results
- [x] Fallback to known tradelines if patcher unavailable

#### Auto-Refresh System
- [x] 5-minute auto-refresh interval
- [x] Live countdown timer in product bar (`Updated: 10:35:50 PM    Next refresh: 2:05`)
- [x] Silent refresh (no loading spinner on auto-refresh)
- [x] Manual refresh button in blue header bar

#### UI Layout
- [x] Compact top stat cards (Total Opportunities, Total Documents, This Month, Supabase Storage)
- [x] Reduced padding for tighter layout
- [x] 3-column vertical layout for time-based stats:
  - Opportunities Found (Week/Month/Year/All Time)
  - Documents Processed (Week/Month/Year/All Time)
  - AI Costs (Week/Month/Year/All Time)
- [x] Side-by-side scrollable boxes (max-h-96) for:
  - Storage by Tradeline (left)
  - By Source - All Tradelines (right)

#### Data Tracking
- [x] Opportunities count by time period (week/month/year/allTime)
- [x] Documents count by time period
- [x] AI costs from `pipeline_activity` table (Stage 2 OpenAI calls)
- [x] Source breakdown: SAM.gov, Cal-e-Procure, PlanetBids, PublicPurchase, BidNet
- [x] Source name mapping (display: `Cal-e-Procure` → DB: `CalProcure`)

#### Storage Tracking
- [x] Total Supabase storage (Pro Plan: 100 GB limit)
- [x] Per-tradeline storage with 5 GB limit each
- [x] Progress bars with color warnings:
  - Cyan: < 80% used
  - Yellow: 80-95% used
  - Red: > 95% used

### Product-Specific Metrics

#### 1. NextBid Engine (Tradelines) - CONNECTED
| Metric | Description |
|--------|-------------|
| Opportunities Found | Total ops discovered by all tradelines |
| Documents Stored | PDFs, specs, amendments per tradeline |
| Sources Processed | Government sites crawled |
| Storage by Tradeline | GB used per tradeline (electrician_documents, security_documents, etc.) |
| Keyword Performance | Which keywords find most ops (per-server detail page) |
| Category Performance | Which categories hit vs miss (per-server detail page) |

#### 2. NextSource (Placeholder)
| Metric | Description |
|--------|-------------|
| Sources Tracked | Total government sources in system |
| Sources Active | Currently being crawled |
| Sources Failing | Connection/parsing errors |
| New Sources Added | Recently discovered sources |
| Coverage by State | Map of source coverage |

#### 3. NextBidder (Auction Platform) (Placeholder)
| Metric | Description |
|--------|-------------|
| Auction Items | Total items listed |
| Active Bidders | Users with recent activity |
| Completed Auctions | Successfully sold items |
| Revenue | Total auction revenue |
| Cost of Goods | COGS tracking |
| Price Guide Updates | Market price data updates |

#### 4. NextBid Portal (Customer Portal) (Placeholder)
| Metric | Description |
|--------|-------------|
| Active Users | Users with recent logins |
| Companies | Total registered companies |
| Searches | Search queries performed |
| Work Orders | Generated from searches |
| Work Orders by Company | Breakdown per customer |
| User Engagement | Session duration, pages viewed |

#### 5. NextTech (Field Tech App) (Placeholder)
| Metric | Description |
|--------|-------------|
| SOPs Completed | Standard operating procedures finished |
| Training Progress | Team training completion rates |
| Job Feedback | Ratings and reviews submitted |
| AI Learning | New patterns added to AI |
| Tech Performance | Per-technician metrics |

#### 6. NextTask (Gamified Quests) (Placeholder)
| Metric | Description |
|--------|-------------|
| Quests Completed | Total finished quests |
| Active Quests | In-progress quests |
| Points Earned | Gamification points |
| AI Database Growth | New entries from quest completion |
| Leaderboard | Top contributors |

### Data Sources
- Tradeline servers have built-in reporting endpoints → aggregate for Engine metrics
- Each product exposes `/api/stats` endpoint
- Real-time via WebSocket for live counters
- Historical data stored in Supabase for trends

### Files
- `src/app/dev-controls/analytics/page.tsx` - Main analytics page with product tabs
- `src/app/api/dev-controls/analytics/engine/route.ts` - Supabase queries for Engine data
- `src/app/api/dev-controls/analytics/debug/route.ts` - Debug endpoint for table inspection
- `src/app/dev-controls/api.ts` - EngineAnalyticsData interface and fetch helper
- Components: EngineAnalytics, NextSourceAnalytics, NextBidderAnalytics, PortalAnalytics, NextTechAnalytics, NextTaskAnalytics

---

## Next Up: HelpDesk Tab

### System Tickets (Internal)
- [ ] Bug reports from servers
- [ ] Error alerts auto-generated
- [ ] Assign to team members
- [ ] Priority levels
- [ ] Status workflow

### User Tickets (External)
- [ ] Customer support queue
- [ ] Source system tracking (which portal/app)
- [ ] Response templates
- [ ] SLA tracking
- [ ] Conversation thread

### Automation (TBD)
- Will evolve based on actual ticket patterns

---

## Development Tab (Engineer+ Only) - IN PROGRESS

### UI Components v1 ✓ (Dec 13, 2025)
- [x] Main page layout with 4-panel design (`src/app/development/page.tsx`)
- [x] File Explorer panel (`components/FileExplorer.tsx`) - tree view with icons
- [x] Code Editor panel (`components/CodeEditor.tsx`) - syntax highlighting, line numbers
- [x] Terminal panel (`components/TerminalPanel.tsx`) - multi-tab, quick commands
- [x] Claude Chat panel (`components/ClaudeChat.tsx`) - quick prompts (Explain, Review, Refactor)
- [x] Deployment Bar (`components/DeploymentBar.tsx`) - DEV→TEST→PROD pipeline
- [x] Role-based access check (Engineer+ required)
- [x] Environment selector (Dev/Test/Prod)
- [x] Project selector (hardcoded list)
- [x] Navigation tab updated to `/development`

### UI Redesign Needed (Dec 13, 2025)
- [ ] **Clean main area** - Claude Chat takes full width for development
- [ ] **Sidebar pop-out icons**:
  - 📁 File Manager - local workspace files
  - 💻 Terminal - for experienced devs
  - 💰 AI Usage - cost tracking widget
  - 🌐 Virtual Browser - Puppeteer viewer
- [ ] Pop-outs slide from sidebar or float as windows
- [ ] Claude Chat shows code streaming (like Claude Chat web - code flows down)
- [ ] "Apply Code" button to save Claude's output to file

### Virtual Browser / Puppeteer Viewer (NEW)
Purpose: Visual testing, scraper building, click recording
- [ ] Embedded browser preview (iframe or Puppeteer headful)
- [ ] URL bar to navigate to any app/page
- [ ] **Record Mode**:
  - Track clicks (element, x/y coordinates)
  - Track inputs (which field, what was typed)
  - Capture CSS selectors automatically
- [ ] **Screenshot** button for bug reports
- [ ] **Inspect Element** - hover to get selector
- [ ] **Get Selector** - click element, copy selector for scraper
- [ ] AI monitors interactions for:
  - Scraper keyword placement
  - Form field mapping
  - Click sequence recording
- [ ] Save recorded sessions as scraper configs
- [ ] Replay recorded sessions for testing

### Use Cases for Virtual Browser:
1. Test UI changes without switching windows
2. Build scrapers visually (click element → get selector)
3. Debug scrapers (watch them run, see where they fail)
4. Record login flows for automation
5. Train AI on click patterns and form fields

### Project Management (Database-Driven)
- [ ] Create `dev_projects` table in Supabase
  ```sql
  id UUID, name VARCHAR, slug VARCHAR,
  git_repo VARCHAR, server_path VARCHAR,
  droplet_id VARCHAR, port_prefix VARCHAR,
  created_at, created_by, is_active
  ```
- [ ] "Add New Project" modal in UI
- [ ] Project list fetched from database (not hardcoded)
- [ ] Project settings page (edit repo, path, etc.)

### Project Locking System (CRITICAL)
- [ ] Create `dev_project_locks` table
  ```sql
  id UUID, project_id UUID,
  locked_by UUID (user), locked_at TIMESTAMP,
  branch VARCHAR, purpose VARCHAR,
  is_locked BOOLEAN
  ```
- [ ] Create `dev_project_unlocks` table (history)
  ```sql
  id UUID, project_id UUID, lock_id UUID,
  unlocked_by UUID, unlocked_at TIMESTAMP,
  patch_notes TEXT, changes_summary TEXT,
  commit_hash VARCHAR
  ```
- [ ] Lock button shows 🔒 with dev's name when locked
- [ ] Other devs see "Locked by [Name]" - cannot edit
- [ ] Unlock requires: patch notes + changes summary
- [ ] Lock history visible (who worked on what, when)

### Local Workspace Flow
```
1. Dev selects project + environment
2. Dev clicks "Pull" → git pull to local folder on their PC
3. File Explorer shows LOCAL files (C:\Projects\...)
4. Dev works with Claude, edits files locally
5. Dev clicks "Push" → git add, commit (with notes), push
6. If project was locked, auto-unlock after push
```

### Claude Chat Improvements
- [ ] Streaming responses (code flows down like Claude Chat web)
- [ ] Syntax highlighting in chat messages
- [ ] "Apply to File" button on code blocks
- [ ] File context shown (which file Claude is looking at)
- [ ] Conversation history saved per project

### AI Cost Tracking (IMPORTANT)
- [ ] Create `dev_ai_usage` table
  ```sql
  id UUID,
  user_id UUID,
  project_id UUID,
  model VARCHAR (claude-3-opus, claude-3-sonnet, etc.),
  input_tokens INT,
  output_tokens INT,
  cost_usd DECIMAL(10,6),
  request_type VARCHAR (chat, code-review, explain, etc.),
  created_at TIMESTAMP
  ```
- [ ] Log every Claude API call with token counts
- [ ] Calculate cost based on model pricing:
  - Opus: $15/M input, $75/M output
  - Sonnet: $3/M input, $15/M output
- [ ] Dashboard showing:
  - Cost by user (today/week/month)
  - Cost by project
  - Cost by request type
  - Total team spend
- [ ] Usage alerts (warn at 80%, block at 100% of budget)
- [ ] Per-user monthly limits (optional)
- [ ] AI Cost widget in Dev Tools Analytics page

### API Endpoints Needed
- [ ] `GET /api/development/projects` - List projects from DB
- [ ] `POST /api/development/projects` - Create new project
- [ ] `GET /api/development/locks` - Get current locks
- [ ] `POST /api/development/lock` - Lock a project
- [ ] `POST /api/development/unlock` - Unlock with notes
- [ ] `POST /api/development/claude` - Claude API with streaming
- [ ] `POST /api/development/execute` - Terminal command execution

### Security
- [x] Engineer+ role required (level 3+)
- [ ] Audit logging of all commands
- [ ] Lock prevents other devs from editing
- [ ] Prod environment is read-only
- [ ] Patch notes required for unlock

---

## Next Up: Security Tab (SOC Dashboard)

### Overview
Security Operations Center - monitor all products/sites for threats, unauthorized access, and anomalies. NOT credentials management (that's in Servers/Push-Pull).

### Phase 1: Easy Now (~40%) - Just query & display
- [ ] Logins by time period (today/week/month/all-time)
- [ ] Failed login attempts (wrong password, locked accounts)
- [ ] Token expirations (users who haven't re-authenticated)
- [ ] Unauthorized access attempts (redirected - no token or invalid token)
- [ ] Backup verification status (Supabase dashboard data)
- [ ] Active sessions count

### Phase 2: Add Logging (~40%) - Gateway/middleware updates needed
- [ ] Brute force attempts (count failures by IP/user)
- [ ] Rate limit violations by IP/user
- [ ] Session hijacking detection (same token from multiple IPs)
- [ ] IP addresses logged per request
- [ ] Encryption status for stored credentials
- [ ] Admin actions log (password resets, account locks)
- [ ] Real-time security feed (WebSocket)
- [ ] Alerting - Slack/email for critical events

### Phase 3: External Services (~20%) - Third-party APIs or significant work
- [ ] Geographic anomalies (login from unusual locations) - needs IP geolocation API
- [ ] Bot detection (automated scraping, rapid requests) - pattern analysis
- [ ] SQL injection / XSS attempts in logs - log parsing
- [ ] DDoS indicators (traffic spikes) - traffic analysis
- [ ] User data access audit (who viewed what PII) - query logging

### Data Sources
- Gateway audit logs (`nextbid_audit_log` table)
- Nginx access/error logs
- Application error logs
- Supabase auth logs

---

## Deployment Checklist

### Phase 1: Local Testing ✓
- [x] Dashboard running on port 7500 local only till this one replaces the other one
- [x] All UI components working
- [ ] Database connections verified

### Phase 2: Server Deployment ✓ (Dec 13, 2025)
- [x] Upload to Patcher droplet (134.199.209.140) - `/var/www/dashboard-7500`
- [x] PM2 configuration - running as `dashboard-7500`
- [x] Firewall port 7500 opened
- [ ] Nginx proxy setup (using direct IP:port for now)
- [ ] SSL certificates (using HTTP for now)

### Phase 3: Gateway Integration ✓ (Dec 13, 2025)
- [x] Login flow through gateway (134.199.209.140:7000)
- [x] JWT validation working
- [x] Role-based routing via auto-login endpoint
- [x] Engine redirect API for tradeline access (`/api/engine-redirect`)

### Phase 4: Live Testing
- [ ] All 6 patchers responding
- [ ] Real-time feeds working
- [ ] Chat realtime working
- [ ] Calendar sync working

---

## Database Changes Log

| Date | Change | Table(s) |
|------|--------|----------|
| Dec 11 | Initial schema | All dev_* tables |
| Dec 11 | Added calendar tables | dev_calendar_events, dev_time_off_requests, dev_timesheet_adjustments |
| Dec 11 | Added chat tables | dev_chat_channels, dev_chat_messages, dev_chat_read_receipts |
| Dec 13 | Engine role permissions added | dev_roles (6 levels: Support→Superadmin) |

---

## Notes

### Per-Droplet Authentication (Dec 13, 2025)
Each droplet runs its own auth service on port 7000. Cookies are domain-specific.

| Droplet | IP | Auth Port | Protects |
|---------|-----|-----------|----------|
| Patcher | 134.199.209.140 | 7000 | Gateway, Dashboard, Patchers (7100-7106) |
| Engine | 64.23.151.201 | 7000 | Tradelines (31001-31020) |
| Dev | 161.35.229.220 | 7000 | Dev/Test servers (5000-5999) |
| Portals | 146.190.169.112 | 7000 | User products (8000-8999) |

**Auto-Login Flow:**
1. User clicks "Online" on dashboard
2. Dashboard calls `/api/engine-redirect?port=31006`
3. API redirects to `http://64.23.151.201:7000/auto-login?token=xxx&redirect=31006`
4. Engine auth verifies gateway token, issues local token
5. User lands on tradeline (31006) - already authenticated

See: `gateway-7000/docs/DOMAINS-AND-AUTH.md`

### Server Architecture (5-Digit Port Scheme)
- Engine droplet: 64.23.151.201 (20 tradelines, ports 31001-31020)
- Patcher droplet: 134.199.209.140 (port 7100)
- Development droplet: 161.35.229.220 (DEV 51XX, TEST 50XX)
- Portals droplet: 146.190.169.112 (ports 8000-8999)
- Port format: 3[Droplet][Worker][SlotId] (e.g., 31215 = Droplet 1, Parse worker, Slot 15)
- Workers: 0=Main, 1=Fetch, 2=Parse, 3=AI, 4=Store
- Total services: 100 (20 slots x 5 workers)

### Role Hierarchy (Dashboard)
| Role | Calendar | Servers | Dev Tools | HelpDesk | Development |
|------|----------|---------|-----------|----------|-------------|
| superadmin | Full | Full | Full | Full | Full |
| admin | Full | Full | Full | Full | Full |
| lead | Full | Full | Full | Full | Full |
| engineer | Own teams | Full | Full | View | Full |
| developer | Own teams | View | Limited | View | No |
| support | Own teams | View | No | Full | No |

### Role Hierarchy (Engine - 6 Levels)
| Level | Role | Engine Permissions |
|-------|------|-------------------|
| 6 | Superadmin | All operations + all tradelines |
| 5 | Admin | All operations on assigned tradelines |
| 4 | Lead | Deploy + manage users + tradeline control |
| 3 | Engineer | Push to test + start/stop/restart tradelines |
| 2 | Developer | Reboot + credentials + view logs |
| 1 | Support | View only + helpdesk |

Engine API protection: Level 3+ required for POST/DELETE operations.

---

## Last Updated
December 13, 2025
