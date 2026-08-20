# EarthGlobal — Land Monitoring Platform

Remote land monitoring powered by satellite imagery, NDVI change detection,
and verified field agents. See it. Check it. Secure it.

## Structure

```
backend/            Node.js + Express API + WebSocket server
                    PostgreSQL + PostGIS (Supabase)
                    Google Earth Engine (Sentinel-2 NDVI monitoring)
design-system/      Shared component library (styled-components + theme)
frontend-owner/     Unified frontend (owner + agent + admin in one app)
schema.sql          Full database schema (earthglobal schema, isolated)
```

## Architecture

**One unified app** — a single frontend handles all three roles:
- Owner → `/dashboard` (parcel monitoring, visit requests)
- Agent → `/agent` (visit list, field verification, media upload)
- Admin → `/admin` (parcel onboarding, agent management)

Login auto-detects the user's role from the database and routes accordingly.

## Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Netlify | https://earthglobalgh.netlify.app |
| Backend API | Render | https://earthglobal.onrender.com |
| Database | Supabase (PostgreSQL + PostGIS) | eu-west-2 |

## Getting started

### 1. Database
```bash
# Supabase PostgreSQL — connection string in backend/.env
node backend/scripts/migrate.js    # creates earthglobal schema + all tables
node backend/scripts/seed.js       # creates test accounts (owner/agent/admin)
```

### 2. Backend
```bash
cd backend
cp .env.example .env    # fill in DATABASE_URL, JWT_SECRET, EE_SERVICE_ACCOUNT_JSON
npm install
npm run dev              # starts on http://localhost:4000
```

### 3. Frontend
```bash
cd frontend-owner
cp .env.example .env    # set VITE_API_URL to backend URL
npm install
npm run dev               # starts on http://localhost:5173
```

## Test Accounts

| Role | Email | Password | Redirects to |
|------|-------|----------|-------------|
| Owner | owner@earthglobal.com | password123 | /dashboard |
| Agent | agent@earthglobal.com | password123 | /agent |
| Admin | admin@earthglobal.com | password123 | /admin |

## Features

**Fully implemented:**
- Auth: signup, login (auto-role detection), JWT tokens
- Parcels CRUD with PostGIS geometry
- Survey sessions: GPS capture, file import, manual coordinates
- Visit requests with subscription credit checking
- Satellite imagery: Sentinel-2 via Google Earth Engine
- NDVI change detection: runs every 2 days via node-cron
- Real-time alerts: WebSocket + email (SendGrid) + SMS (Twilio)
- Parcel satellite image capture + historical gallery
- PWA: installable, offline support, app icons
- Professional landing page + split-screen login

**Environment variables needed:**
- `DATABASE_URL` — Supabase connection string
- `DATABASE_SSL` — true
- `JWT_SECRET` — random string
- `EE_SERVICE_ACCOUNT_JSON` — Google Earth Engine service account JSON key
- `SENDGRID_API_KEY` — for email alerts (optional)
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` — for SMS alerts (optional)
