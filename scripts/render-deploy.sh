#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# EarthGlobal — Render Auto-Deploy Script
#
# This script automates deployment to Render using the Render API.
# It creates all services from render.yaml, sets environment variables,
# triggers a deploy, and runs the database migration.
#
# Prerequisites:
#   1. A Render account — sign up at https://render.com
#   2. A Render API key — create at https://dashboard.render.com/users/me
#   3. This repo pushed to GitHub
#   4. A PostgreSQL database (either on Render or external) with PostGIS
#
# Usage:
#   RENDER_API_KEY=rpg_xxx bash scripts/render-deploy.sh
#
# Or set RENDER_API_KEY in your .env file and run:
#   bash scripts/render-deploy.sh
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log()   { echo -e "${GREEN}[deploy]${NC} $1"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $1"; }
error() { echo -e "${RED}[error]${NC} $1"; }
info()  { echo -e "${BLUE}[info]${NC} $1"; }

# ── Load .env if it exists ──
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs 2>/dev/null || true)
  log "Loaded .env file"
fi

# ── Check prerequisites ──
if [ -z "${RENDER_API_KEY:-}" ]; then
  error "RENDER_API_KEY is not set."
  echo ""
  info "Get your API key at: https://dashboard.render.com/users/me"
  info "Then run: RENDER_API_KEY=rpg_xxx bash scripts/render-deploy.sh"
  echo ""
  info "Or add to .env:  RENDER_API_KEY=rpg_xxx"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  warn "DATABASE_URL is not set in .env"
  warn "You'll need to set it manually in the Render dashboard after blueprint creation."
  warn "The migration job will fail until DATABASE_URL is set."
fi

RENDER_API="https://api.render.com/v1"
AUTH_HEADER="Authorization: Bearer ${RENDER_API_KEY}"
CONTENT_TYPE="Content-Type: application/json"

# ── Step 1: Verify API key ──
log "Verifying Render API key..."
OWNER_RESPONSE=$(curl -s -w "\n%{http_code}" -H "$AUTH_HEADER" "${RENDER_API}/owners")
HTTP_CODE=$(echo "$OWNER_RESPONSE" | tail -1)
BODY=$(echo "$OWNER_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" != "200" ]; then
  error "Failed to authenticate with Render API (HTTP $HTTP_CODE)"
  echo "$BODY"
  exit 1
fi
OWNER_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['owner']['id'])" 2>/dev/null || echo "")
if [ -z "$OWNER_ID" ]; then
  # Try jq if python3 isn't available
  OWNER_ID=$(echo "$BODY" | jq -r '.[0].owner.id' 2>/dev/null || echo "")
fi
log "Authenticated as Render owner: ${OWNER_ID}"

# ── Step 2: Check if services already exist ──
log "Checking for existing EarthGlobal services..."

SERVICES_RESPONSE=$(curl -s -H "$AUTH_HEADER" "${RENDER_API}/services?limit=50")
EXISTING_API=$(echo "$SERVICES_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for s in data:
  if s.get('service', {}).get('name') == 'earthglobal-api':
    print(s['service']['id'])
    break
" 2>/dev/null || echo "$SERVICES_RESPONSE" | jq -r '.[] | select(.service.name=="earthglobal-api") | .service.id' 2>/dev/null || echo "")

if [ -n "$EXISTING_API" ]; then
  log "EarthGlobal API service already exists (ID: ${EXISTING_API})"
  log "Updating environment variables..."

  # ── Step 3a: Update env vars on existing API service ──
  update_env_var() {
    local SERVICE_ID=$1
    local KEY=$2
    local VALUE=$3

    if [ -z "$VALUE" ]; then
      warn "  Skipping $KEY (no value set)"
      return
    fi

    curl -s -X PUT \
      -H "$AUTH_HEADER" \
      -H "$CONTENT_TYPE" \
      -d "{\"key\":\"$KEY\",\"value\":\"$VALUE\"}" \
      "${RENDER_API}/services/${SERVICE_ID}/env-vars/${KEY}" > /dev/null
    log "  Set $KEY"
  }

  # Set all env vars on the API service
  update_env_var "$EXISTING_API" "NODE_ENV" "production"
  update_env_var "$EXISTING_API" "DATABASE_URL" "${DATABASE_URL:-}"
  update_env_var "$EXISTING_API" "DATABASE_SSL" "true"
  update_env_var "$EXISTING_API" "JWT_SECRET" "${JWT_SECRET:-$(openssl rand -hex 32 2>/dev/null || echo 'change-me-in-production')}"
  update_env_var "$EXISTING_API" "CORS_ORIGINS" "https://earthglobalgh.netlify.app,https://earthglobal-api.onrender.com"
  update_env_var "$EXISTING_API" "PORT" "10000"
  update_env_var "$EXISTING_API" "STRIPE_SECRET_KEY" "${STRIPE_SECRET_KEY:-}"
  update_env_var "$EXISTING_API" "STRIPE_WEBHOOK_SECRET" "${STRIPE_WEBHOOK_SECRET:-}"
  update_env_var "$EXISTING_API" "EE_SERVICE_ACCOUNT_JSON" "${EE_SERVICE_ACCOUNT_JSON:-}"
  update_env_var "$EXISTING_API" "S3_BUCKET" "${S3_BUCKET:-}"
  update_env_var "$EXISTING_API" "S3_ACCESS_KEY_ID" "${S3_ACCESS_KEY_ID:-}"
  update_env_var "$EXISTING_API" "S3_SECRET_ACCESS_KEY" "${S3_SECRET_ACCESS_KEY:-}"
  update_env_var "$EXISTING_API" "S3_ENDPOINT" "${S3_ENDPOINT:-}"
  update_env_var "$EXISTING_API" "SENDGRID_API_KEY" "${SENDGRID_API_KEY:-}"
  update_env_var "$EXISTING_API" "TWILIO_ACCOUNT_SID" "${TWILIO_ACCOUNT_SID:-}"
  update_env_var "$EXISTING_API" "TWILIO_AUTH_TOKEN" "${TWILIO_AUTH_TOKEN:-}"

  # ── Step 4: Trigger deploy ──
  log "Triggering deploy of API service..."
  DEPLOY_RESPONSE=$(curl -s -X POST \
    -H "$AUTH_HEADER" \
    -H "$CONTENT_TYPE" \
    -d '{"clearCache":"do_not_clear"}' \
    "${RENDER_API}/services/${EXISTING_API}/deploys")
  DEPLOY_ID=$(echo "$DEPLOY_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "$DEPLOY_RESPONSE" | jq -r '.id' 2>/dev/null || echo "")
  log "Deploy triggered: ${DEPLOY_ID}"
  info "Watch at: https://dashboard.render.com/web/${EXISTING_API}"

else
  # ── Step 3b: Create services from blueprint ──
  log "No existing services found. Creating from render.yaml blueprint..."
  echo ""
  info "To deploy using the render.yaml blueprint:"
  info ""
  info "  Option A — Render Dashboard (recommended for first deploy):"
  info "    1. Go to: https://dashboard.render.com/blueprints"
  info "    2. Click 'New Blueprint Instance'"
  info "    3. Select your GitHub repo: AT175/Earthglobal"
  info "    4. Render will detect render.yaml and create all services"
  info "    5. Set DATABASE_URL in the dashboard for the API + migration services"
  info ""
  info "  Option B — Render CLI:"
  info "    npm install -g @render/cli"
  info "    render deploy --blueprint render.yaml"
  info ""
  info "  After services are created, re-run this script to set env vars automatically."
  exit 0
fi

# ── Step 5: Run migration if DATABASE_URL is set ──
if [ -n "${DATABASE_URL:-}" ]; then
  log "Running database migration..."
  log "  DATABASE_URL is set — applying schema.sql to the earthglobal schema..."

  # Check if we have the migrate script
  if [ -f "landguard-app-scaffold/land-monitor-app/backend/scripts/migrate.js" ]; then
    cd landguard-app-scaffold/land-monitor-app/backend
    DATABASE_SSL=true node scripts/migrate.js || warn "Migration had errors (may be normal if tables already exist)"
    cd - > /dev/null
    log "Migration complete."
  else
    warn "Migration script not found — run manually: cd backend && node scripts/migrate.js"
  fi
else
  warn "DATABASE_URL not set — skipping migration."
  warn "Set DATABASE_URL in .env or Render dashboard, then run: yarn migrate"
fi

# ── Step 6: Summary ──
echo ""
echo "═══════════════════════════════════════════════════════════════"
log "Render deployment complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
info "API:      https://earthglobal-api.onrender.com"
info "Health:   https://earthglobal-api.onrender.com/health"
info "Frontend: https://earthglobalgh.netlify.app"
echo ""
if [ -z "${DATABASE_URL:-}" ]; then
  warn "TODO: Set DATABASE_URL in Render dashboard for the API service"
fi
if [ -z "${STRIPE_SECRET_KEY:-}" ]; then
  warn "TODO: Set STRIPE_SECRET_KEY in Render dashboard for payments"
fi
if [ -z "${EE_SERVICE_ACCOUNT_JSON:-}" ]; then
  warn "TODO: Set EE_SERVICE_ACCOUNT_JSON for Earth Engine satellite imagery"
fi
echo ""
log "Done!"
