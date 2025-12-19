# NextBid Platform Port Assignments (3000-9000)

> **Version:** 2.0 (5-Digit Engine Scheme)
> **Date:** 2025-12-12
> **Owner:** NextBid Engineering

---

## Golden Rules

1. **Port = Slot/Lane**, not a tradeline name
2. **Tradeline + behavior** comes from registry/config (`TRADELINE=...`, Slot Registry)
3. **Every paired system shares the same SlotId:**
   - Engine Slot 01 (31001) ↔ Orchestrator Slot 01 (7201) ↔ Dashboard Slot 01
4. **Never hardcode tradeline names** into services. Only use SlotId + config.
5. **XX matches across all environments:** DEV 51XX, TEST 50XX, PROD 80XX, Patcher 71XX

---

## 4 Droplets Overview

| Droplet | IP | Port Range | Purpose |
|---------|-----|------------|---------|
| **Engine** | 64.23.151.201 | 31001-39420 | Production tradeline servers (5-digit) |
| **Development** | 161.35.229.220 | 5000-5999 | Dev & test environments |
| **Patcher** | 134.199.209.140 | 7000-7999 | Auth, orchestration, dashboard |
| **Portals** | 146.190.169.112 | 8000-8999 | User-facing products |

---

## Quick Reference: Project Port Map

| Project | DEV (51XX) | TEST (50XX) | PROD | Patcher (71XX) |
|---------|------------|-------------|------|----------------|
| **Dev Studio** | **5000** | — | — | — |
| **Dev Worker** | **5100** | — | — | — |
| NextBid Engine | 5101 | 5001 | 31001-31020 | 7101 |
| NextSource | 5102 | 5002 | 8002 | 7102 |
| NextBidder | 5103 | 5003 | 8003 | 7103 |
| NextBid Portal | 5104 | 5004 | 8004 | 7104 |
| NextTech | 5105 | 5005 | 8005 | 7105 |
| NextTask | 5106 | 5006 | 8006 | 7106 |

---

## 31001–39420: Production Engine Slots (5-Digit Scheme)

### Port Format: `3[Droplet][Worker][SlotId]`

| Component | Position | Values | Meaning |
|-----------|----------|--------|---------|
| **3** | First | 3 | Engine range |
| **Droplet** | Second | 1-9 | Droplet number |
| **Worker** | Third | 0-4 | Worker type |
| **SlotId** | Fourth+Fifth | 01-20 | Slot number |

### Worker Types

| Worker Code | Role | Description |
|-------------|------|-------------|
| 0 | Main | Primary tradeline server |
| 1 | Fetch | Fetch/scrape from sources |
| 2 | Parse | Parse/extract data |
| 3 | AI | AI classification/NAICS |
| 4 | Store | Store/distribute results |

---

### Droplet 1 Engine Ports (64.23.151.201)

#### Main Servers (310XX)

| SlotId | Port | Current Tradeline |
|--------|------|-------------------|
| 01 | 31001 | security |
| 02 | 31002 | administrative |
| 03 | 31003 | facilities |
| 04 | 31004 | logistics |
| 05 | 31005 | electrical |
| 06 | 31006 | lowvoltage |
| 07 | 31007 | landscaping |
| 08 | 31008 | hvac |
| 09 | 31009 | plumbing |
| 10 | 31010 | janitorial |
| 11 | 31011 | support |
| 12 | 31012 | waste |
| 13 | 31013 | construction |
| 14 | 31014 | roofing |
| 15 | 31015 | painting |
| 16 | 31016 | flooring |
| 17 | 31017 | demolition |
| 18 | 31018 | environmental |
| 19 | 31019 | concrete |
| 20 | 31020 | fencing |

#### Full Droplet 1 Port Table (All Workers)

| Slot | Main (310XX) | Fetch (311XX) | Parse (312XX) | AI (313XX) | Store (314XX) |
|------|--------------|---------------|---------------|------------|---------------|
| 01 | 31001 | 31101 | 31201 | 31301 | 31401 |
| 02 | 31002 | 31102 | 31202 | 31302 | 31402 |
| 03 | 31003 | 31103 | 31203 | 31303 | 31403 |
| 04 | 31004 | 31104 | 31204 | 31304 | 31404 |
| 05 | 31005 | 31105 | 31205 | 31305 | 31405 |
| 06 | 31006 | 31106 | 31206 | 31306 | 31406 |
| 07 | 31007 | 31107 | 31207 | 31307 | 31407 |
| 08 | 31008 | 31108 | 31208 | 31308 | 31408 |
| 09 | 31009 | 31109 | 31209 | 31309 | 31409 |
| 10 | 31010 | 31110 | 31210 | 31310 | 31410 |
| 11 | 31011 | 31111 | 31211 | 31311 | 31411 |
| 12 | 31012 | 31112 | 31212 | 31312 | 31412 |
| 13 | 31013 | 31113 | 31213 | 31313 | 31413 |
| 14 | 31014 | 31114 | 31214 | 31314 | 31414 |
| 15 | 31015 | 31115 | 31215 | 31315 | 31415 |
| 16 | 31016 | 31116 | 31216 | 31316 | 31416 |
| 17 | 31017 | 31117 | 31217 | 31317 | 31417 |
| 18 | 31018 | 31118 | 31218 | 31318 | 31418 |
| 19 | 31019 | 31119 | 31219 | 31319 | 31419 |
| 20 | 31020 | 31120 | 31220 | 31320 | 31420 |

**Droplet 1 Total:** 100 ports (20 slots × 5 workers)

---

### Droplet 2 Engine Ports (Future Expansion)

| Slot | Main (320XX) | Fetch (321XX) | Parse (322XX) | AI (323XX) | Store (324XX) |
|------|--------------|---------------|---------------|------------|---------------|
| 01 | 32001 | 32101 | 32201 | 32301 | 32401 |
| 02 | 32002 | 32102 | 32202 | 32302 | 32402 |
| ... | ... | ... | ... | ... | ... |
| 20 | 32020 | 32120 | 32220 | 32320 | 32420 |

**Pattern continues for Droplets 3-9:**
- Droplet 3: 33001-33420
- Droplet 4: 34001-34420
- Droplet 5: 35001-35420
- Droplet 6: 36001-36420
- Droplet 7: 37001-37420
- Droplet 8: 38001-38420
- Droplet 9: 39001-39420

**Maximum Capacity:** 9 droplets × 20 slots × 5 workers = **900 engine ports**

---

## 4000–4999: Internal Engine Utilities (Reserved)

| Range | Purpose |
|-------|---------|
| 4000–4099 | Engine Admin Utilities (internal only) |
| 4100–4199 | Engine Schedulers / Timers |
| 4200–4299 | Engine AI helpers (local inference, caching) |
| 4300–4399 | Engine Data Exporters |
| 4400–4499 | Engine Webhooks / Notifiers |
| 4500–4999 | Reserved |

---

## 5000–5999: Development & Testing (Dev Droplet)

### Dev → Test → Prod Flow

| Project | DEV (51XX) | TEST (50XX) | PROD | Patcher (71XX) |
|---------|------------|-------------|------|----------------|
| NextBid Engine | 5101 | 5001 | 31001-31020 | 7101 |
| NextSource | 5102 | 5002 | 8002 | 7102 |
| NextBidder | 5103 | 5003 | 8003 | 7103 |
| NextBid Portal | 5104 | 5004 | 8004 | 7104 |
| NextTech | 5105 | 5005 | 8005 | 7105 |
| NextTask | 5106 | 5006 | 8006 | 7106 |
| Reserved | 5107-5199 | 5007-5099 | — | 7107-7199 |

### Development Folders (Dev Droplet: 161.35.229.220)

| Folder | DEV Port | TEST Port | Purpose |
|--------|----------|-----------|---------|
| **`NextBid_Dev/dev-studio-5000`** | **5000** | — | **Dev Studio (AI dev toolkit)** |
| **`NextBid_Dev/dev-worker-5100`** | **5100** | — | **Dev Worker (cataloger/background)** |
| `NextBid_Dev/engine-dev-5101` | 5101 | — | Engine development |
| `NextBid_Dev/engine-test-5001` | — | 5001 | Engine test before prod |
| `NextBid_Dev/source-dev-5102` | 5102 | — | NextSource development |
| `NextBid_Dev/source-test-5002` | — | 5002 | NextSource test |
| `NextBid_Dev/bidder-dev-5103` | 5103 | — | NextBidder development |
| `NextBid_Dev/bidder-test-5003` | — | 5003 | NextBidder test |
| `NextBid_Dev/portal-dev-5104` | 5104 | — | Portal development |
| `NextBid_Dev/portal-test-5004` | — | 5004 | Portal test |
| `NextBid_Dev/tech-dev-5105` | 5105 | — | NextTech development |
| `NextBid_Dev/tech-test-5005` | — | 5005 | NextTech test |
| `NextBid_Dev/task-dev-5106` | 5106 | — | NextTask development |
| `NextBid_Dev/task-test-5006` | — | 5006 | NextTask test |

### Dev/QA Tools

| Range | Purpose |
|-------|---------|
| 5200–5299 | QA / load tests / replay harness |
| 5300–5399 | Sandbox services |
| 5400–5499 | Temporary branches / preview deployments |
| 5500–5999 | Reserved |

---

## 6000–6999: Shared Internal Services (Reserved)

| Range | Purpose |
|-------|---------|
| 6000–6099 | Shared caches / redis gateways |
| 6100–6199 | Queue services |
| 6200–6299 | File processing / doc services |
| 6300–6399 | Internal APIs |
| 6400–6999 | Reserved |

---

## 7000–7999: Control Plane (Patcher Droplet)

### 7000–7099: Gateway / Auth / Routing

| Port | Service | Status |
|------|---------|--------|
| **7000** | **Gateway** (JWT auth, RBAC, API routing) | Active |
| 7001–7099 | Reserved (auth expansions, SSO, audit) | Planned |

### 7100–7199: Patchers (Deploy Lanes)

| Port | Service | Deploy Target | Status |
|------|---------|---------------|--------|
| **7100** | **Deploy Orchestrator** | Routes to sub-patchers, job tracking | Active |
| **7101** | **Engine Patcher** | Deploy to slots 31001-39420 | Active |
| **7102** | **Source Patcher** | Deploy NextSource (8002) | Planned |
| **7103** | **Bidder Patcher** | Deploy NextBidder (8003) | Planned |
| **7104** | **Portal Patcher** | Deploy NextBid Portal (8004) | Planned |
| **7105** | **Tech Patcher** | Deploy NextTech (8005) | Planned |
| **7106** | **Task Patcher** | Deploy NextTask (8006) | Planned |
| 7107 | Model Patcher | Deploy ML models | Planned |
| 7108–7199 | Reserved | Future patch lanes | — |

### 7200–7299: Canonical Sync Orchestrator (Slot-Paired)

**Rule:** Sync worker port = `7200 + SlotId`

| Port | Service |
|------|---------|
| **7200** | **Canonical Sync Orchestrator** (scheduler + coordinator) |
| 7201 | Slot 01 Sync Worker (paired to 31001) |
| 7202 | Slot 02 Sync Worker (paired to 31002) |
| 7203 | Slot 03 Sync Worker (paired to 31003) |
| 7204 | Slot 04 Sync Worker (paired to 31004) |
| 7205 | Slot 05 Sync Worker (paired to 31005) |
| 7206 | Slot 06 Sync Worker (paired to 31006) |
| 7207 | Slot 07 Sync Worker (paired to 31007) |
| 7208 | Slot 08 Sync Worker (paired to 31008) |
| 7209 | Slot 09 Sync Worker (paired to 31009) |
| 7210 | Slot 10 Sync Worker (paired to 31010) |
| 7211 | Slot 11 Sync Worker (paired to 31011) |
| 7212 | Slot 12 Sync Worker (paired to 31012) |
| 7213 | Slot 13 Sync Worker (paired to 31013) |
| 7214 | Slot 14 Sync Worker (paired to 31014) |
| 7215 | Slot 15 Sync Worker (paired to 31015) |
| 7216 | Slot 16 Sync Worker (paired to 31016) |
| 7217 | Slot 17 Sync Worker (paired to 31017) |
| 7218 | Slot 18 Sync Worker (paired to 31018) |
| 7219 | Slot 19 Sync Worker (paired to 31019) |
| 7220 | Slot 20 Sync Worker (paired to 31020) |
| 7221–7299 | Reserved for future slots |

### 7300–7399: Crowdsourcing / Federation

| Port | Service |
|------|---------|
| 7300 | Crowdsource Orchestrator |
| 7301 | Client Pull Service |
| 7302 | Canonization / Merge |
| 7303 | Distribution Back to Clients |
| 7304–7399 | Reserved |

### 7400–7499: Health / Monitoring APIs

| Port | Service |
|------|---------|
| 7400 | DB Health Monitor |
| 7401 | Metrics Collector |
| 7402–7499 | Reserved |

### 7500–7599: Ops Dashboard + Realtime

| Port | Service | Status |
|------|---------|--------|
| **7500** | **Ops Dashboard API** | Active |
| 7501 | WebSocket / Realtime Stream | Planned |
| 7502 | Alert Router | Planned |
| 7503 | Audit Viewer | Planned |
| 7504–7599 | Reserved | — |

### 7600–7699: NextTask Backend Services

| Port | Service |
|------|---------|
| 7600 | Task Engine |
| 7601 | Template Service |
| 7602 | Assignment Service |
| 7603 | XP/Leveling |
| 7604 | Leaderboards |
| 7605 | Analytics |
| 7606–7699 | Reserved |

### 7700–7799: AI Training / Model Registry

| Port | Service |
|------|---------|
| 7700 | Training Aggregator |
| 7701 | Classifier Trainer |
| 7702 | NAICS Trainer |
| 7703 | Relevance Trainer |
| 7704 | Model Registry |
| 7705 | Model Distribution |
| 7706 | Feedback Collector |
| 7707 | A/B Testing |
| 7708–7799 | Reserved |

### 7800–7999: Reserved Future Control Plane

---

## 8000–8999: Production Portals (Portals Droplet)

### Production Products

| Port | Product | Description |
|------|---------|-------------|
| 8001 | Reserved | (Engine uses 31001-39420) |
| **8002** | **NextSource** | AI source learner UI |
| **8003** | **NextBidder** | Win SUPPLY contracts |
| **8004** | **NextBid Portal** | User opportunity/proposal UI |
| **8005** | **NextTech** | Dispatch/SOP/ops portal |
| **8006** | **NextTask** | Quest/task user portal |
| 8007–8099 | Reserved | Future products |

### Portal Microservices (Optional Future)

| Range | Purpose |
|-------|---------|
| 8100–8199 | Auth helpers |
| 8200–8299 | Search services |
| 8300–8399 | Document services |
| 8400–8499 | Notifications |
| 8500–8999 | Reserved |

---

## 9000–9099: Admin / Emergency / Maintenance

**Intentionally kept empty** for use under pressure.

| Range | Purpose |
|-------|---------|
| 9000 | Emergency maintenance UI |
| 9001–9099 | One-off admin tools, migrations, incident tools |

---

## Slot Registry Contract

All services must read from a central registry with these fields:

```json
{
  "slotId": "01",
  "droplet": 1,
  "engineMainPort": 31001,
  "engineWorkers": {
    "fetch": 31101,
    "parse": 31201,
    "ai": 31301,
    "store": 31401
  },
  "orchestratorPort": 7201,
  "tradeline": "security",
  "enabled": true,
  "notes": "Engine Slot 01 on Droplet 1"
}
```

**Key point:** Orchestrator and dashboard look up tradeline by slot — not by port name labels.

---

## Port Decoder Function

```javascript
function decodeEnginePort(port) {
  const str = port.toString();
  if (str.length !== 5 || str[0] !== '3') return null;

  return {
    droplet: parseInt(str[1]),
    worker: parseInt(str[2]),
    workerName: ['main', 'fetch', 'parse', 'ai', 'store'][parseInt(str[2])],
    slotId: parseInt(str.slice(3)),
    port: port
  };
}

// Example:
// decodeEnginePort(31215) → { droplet: 1, worker: 2, workerName: 'parse', slotId: 15, port: 31215 }
```

---

## Data Flow

```
Sources (400+ govt sites)
    ↓
source-dev-5102 (AI learns how to scrape each site)
    ↓
source-test-5002 (test sources before prod)
    ↓
NextSource-8002 (production source learner)
    ↓
engine-dev-5101 (develop engine features)
    ↓
engine-test-5001 (test before deploy)
    ↓
Patcher (7100/7101) deploys to Engine (31001-31020 + workers)
    ↓
5-Stage Pipeline: Discovery → SOW → Documents → Summary → Archive
    ↓
discovered_opportunities table (per tradeline)
    ↓
NextBid-Portal-8004 (users see filtered opportunities)
    ↓
User creates proposal → wins contract
```

---

## How Projects Access Central Config

All projects read configuration from **nextbid-patcher**:

**Option 1: File System (same server)**
```javascript
const config = require('/var/www/nextbid-patcher/config/server-registry');
const tradelines = require('/var/www/nextbid-patcher/config/tradelines');
```

**Option 2: API Call to 7101**
```javascript
// Get server identity
const identity = await fetch('http://localhost:7101/identity?ip=x.x.x.x&port=31001');

// Get tradeline config
const config = await fetch('http://localhost:7101/config/security');

// Get credentials
const creds = await fetch('http://localhost:7101/credentials/security');
```

---

## For Claude: Which Project Does This Belong To?

When working on features, ask yourself:

| If it's about... | It belongs in... |
|-----------------|------------------|
| User login, auth, API tokens | nextbid-gateway (7000) |
| Deploying code to servers | nextbid-patcher (7100-7106) |
| Server registry, tradeline configs | nextbid-patcher (central config) |
| Cross-tradeline opportunity sync | nextbid-orchestrator (7200+) |
| Pulling from client databases | nextbid-crowdsource (7300+) |
| Database health checks | nextbid-monitor (7400) |
| Real-time dashboard, alerts | nextbid-dashboard (7500+) |
| Task queues, gamification, XP | nexttask (7600-7699) |
| AI model training, feedback | nextbid-ai-training (7700+) |

---

## Central Config Files (nextbid-patcher)

```
config/
├── server-registry.js    # ALL server:port → tradeline assignments
├── servers.js            # Droplet IPs and deploy paths
└── tradelines.js         # 20 tradeline definitions with ports

tradelines/
├── {tradeline}/
│   ├── naics_psc.json        # NAICS/PSC codes for matching
│   ├── keywords_unspsc.json  # Keywords/UNSPSC codes
│   └── credentials.json      # API keys, source logins, alerts

sources/
├── {source}/portals/{portal}/
│   └── categories.json       # Portal-specific category mappings
```

---

*Last Updated: December 12, 2025*
