
  app/credentials/
  ├── layout.tsx              # Shared layout with category tabs
  ├── page.tsx                # Overview/alerts dashboard
  ├── components/
  │   ├── SourceCard.tsx      # Reusable source display card
  │   ├── CategoryTabs.tsx    # Federal/State/Local/Municipal/Other tabs
  │   ├── CredentialForm.tsx  # Edit credentials form
  │   ├── AlertsPanel.tsx     # Expiring/failed credentials
  │   └── PortalSelector.tsx  # Select portals/categories
  ├── federal/
  │   ├── page.tsx            # SAM.gov, Labs, DoD, etc.
  │   └── [sourceId]/page.tsx # Individual source details
  ├── state/
  │   ├── page.tsx            # CaleProcure, Texas, etc.
  │   └── [sourceId]/page.tsx
  ├── local/
  │   ├── page.tsx            # PlanetBids, OpenGov, BidNet
  │   └── [sourceId]/page.tsx
  ├── municipal/
  │   ├── page.tsx            # Energy, Transit, Water districts
  │   └── [sourceId]/page.tsx
  └── other/
      ├── page.tsx            # Everything else
      └── [sourceId]/page.tsx

  Tab Structure:
  - Federal: SAM.gov, DoD, 12 Labs, GSA, etc.
  - State: CaleProcure, Texas SmartBuy, etc. (50 states)
  - Local: PlanetBids (350+ portals), OpenGov, BidNet
  - Municipal: Energy districts, Transit, Water, Utilities
  - Other: Private, Universities, Associations

  The sidebar Credentials dropdown would link to /credentials and each tradeline would filter the view.