# LandGuard — Project Scaffold

This is the starter scaffold for earthglobal, matching the architecture document. It's meant to be a working
foundation, not a finished product — most integrations (payments, Sentinel Hub, S3, SMS)
are stubbed with clear `TODO` comments where real API calls need to be wired in.

## Structure

```
backend/            Node.js + Express API, PostgreSQL + PostGIS
frontend-owner/      Owner-facing web app (React + Vite) — map view, visit requests
frontend-agent/      Agent-facing web app (stub — visit fulfillment, media upload)
frontend-admin/      Admin panel (stub — parcel onboarding, agent management)
schema.sql          Full database schema (run this first)
```

## Getting started

### 1. Database
```bash
createdb land_monitor
psql land_monitor < schema.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env    # fill in real values
npm install
npm run dev              # starts on http://localhost:4000
```

### 3. Owner frontend
```bash
cd frontend-owner
cp .env.example .env    # add your Google Maps API key
npm install
npm run dev               # starts on http://localhost:5173
```

## What's fully wired vs. stubbed

**Fully wired (real logic, ready to run against a real DB):**
- Parcels CRUD with PostGIS geometry handling
- Survey sessions: start / sync / finalize (builds a polygon from captured GPS points)
- Visit requests: create with subscription-credit check, status updates
- Auth: signup, OTP flow (OTP delivery itself is stubbed — logs to console)
- Owner frontend: dashboard, parcel map view with Google Maps polygon overlay, visit request form

**Stubbed — needs a real integration before production:**
- Sentinel Hub OAuth + NDVI fetch (`backend/src/jobs/ndviChangeDetection.js`)
- File parsing for KML/KMZ, Shapefile, GPX imports (GeoJSON import already works)
- S3/R2 media upload (currently returns a fake URL)
- Payment provider calls (Stripe/Paystack) — DB records the intent, doesn't charge yet
- SMS/email notification delivery (logs instead of sending)
- Agent and Admin frontends (folder structure only, no pages yet — build following the
  same pattern as frontend-owner)

## Next steps
1. Get a Google Maps API key and a Postgres instance with PostGIS running
2. Wire up one integration at a time, starting with S3 media upload and payments
3. Build out the Agent app (visit request list + media upload) using frontend-owner as a template
