# NextBid Dev Command Dashboard v2

Central control dashboard for the NextBid development team. Manages 6 patcher projects, team calendars, helpdesk, and development tools.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:7500](http://localhost:7500)

---

## Architecture

### Server Infrastructure
- **Gateway**: 134.199.209.140:7000 - JWT auth hub
- **Patcher**: 134.199.209.140:7100 - Deployment orchestrator
- **Dashboard**: 134.199.209.140:7500 - This app
- **Engine**: 64.23.151.201 - 20 tradeline servers (ports 3002-3021)

### The 6 Patchers
| Port | Project | Description |
|------|---------|-------------|
| 7101 | Tradelines | Engine Patcher - 20 tradeline servers |
| 7102 | Portals | User Portal Patcher - 10 portals |
| 7103 | NextBidder | Auction Suppliers |
| 7104 | Sources | New Sources Discovery |
| 7105 | NextTech | SOPs/Operations |
| 7106 | NextTask | Task Generator |

---

## Database Tables (Supabase)

All tables prefixed with `dev_` - see `sql/dev_tables.sql`

### Core Tables
- `dev_team_members` - Team members with roles
- `dev_roles` - Role definitions (admin, lead, engineer, developer)
- `dev_permissions` - Granular permissions
- `dev_audit_log` - Activity tracking

### Server Management
- `dev_servers` - Server configurations
- `dev_engine_slots` - 20 tradeline slot assignments
- `dev_tradeline_types` - Available tradeline categories
- `dev_server_credentials` - API keys, tokens (encrypted)
- `dev_deployments` - Deployment history
- `dev_repositories` - Git repo tracking

### Helpdesk
- `dev_system_tickets` - Internal dev tickets
- `dev_user_tickets` - Customer support tickets
- `dev_user_ticket_history` - Ticket conversations
- `dev_canned_responses` - Quick reply templates
- `dev_helpdesk_settings` - SLA configs

### Calendar & Time
- `dev_calendar_events` - Calendar events
- `dev_time_off_requests` - PTO requests
- `dev_timesheet_adjustments` - Clock corrections

### Chat
- `dev_chat_channels` - Chat channels & DMs
- `dev_chat_messages` - Messages with code support
- `dev_chat_read_receipts` - Unread tracking

---

## Features Completed

### Authentication & Layout
- [x] Gateway JWT integration
- [x] Role-based access (admin, lead, engineer, developer)
- [x] NextBid Portal-style navigation with tabs
- [x] Gradient banner with page actions
- [x] Collapsible sidebar sections
- [x] Project switcher dropdown

### Calendar System
- [x] Week view with hourly grid
- [x] Month view
- [x] Drag-and-drop events
- [x] Multi-hour drag selection
- [x] Quick add events
- [x] Create/Edit event modals
- [x] Time off request modal
- [x] Timesheet adjustment modal
- [x] Team calendars with role-based filtering
- [x] Collapsible "Today's Overview"
- [x] Auto-collapse servers on calendar page
- [x] Noon indicator line
- See: `src/app/calendar/calendarinfo.md`

### Chat System
- [x] Slack-like chat dropdown
- [x] Channels & Direct Messages
- [x] Code mode with syntax highlighting
- [x] Copy code button
- [x] Draggable & resizable panel
- [x] Maximize/minimize
- [x] Unread badges

### UI Polish
- [x] Custom NextBid favicon
- [x] Dark theme throughout
- [x] Button outlines on gradient banner
- [x] Independent sidebar scrolling

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth + Gateway JWT
- **Realtime**: Supabase Realtime (planned)

---

## Folder Structure

```
src/
├── app/
│   ├── calendar/          # Calendar system
│   ├── dashboard/         # Universal dashboard
│   ├── dev-controls/      # Dev tools
│   ├── helpdesk/          # Support tickets
│   ├── servers/           # Server management
│   ├── team/              # Team/Development tab
│   └── layout.tsx         # Root layout with contexts
├── components/
│   ├── Navigation.tsx     # Top nav bar
│   ├── Sidebar.tsx        # Left sidebar
│   ├── ChatDropdown.tsx   # Chat panel
│   └── ...
├── lib/
│   └── supabase.ts        # Supabase client
sql/
└── dev_tables.sql         # All database schemas
docs/
└── (feature docs)
```

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## Deployment

```bash
npm run build
pm2 start npm --name "dashboard-7500" -- start -- -p 7500
```
Developer is very picky about the structure , keep it very orginized, or he will make you redo it
---

## Last Updated
December 11, 2025
