#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# EarthGlobal — Local Development Setup
#
# Installs all dependencies, creates .env files from templates,
# and verifies the build works.
#
# Usage: bash scripts/setup.sh
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}[setup]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
info() { echo -e "${BLUE}[info]${NC} $1"; }

ROOT=$(cd "$(dirname "$0")/.." && pwd)
APP_DIR="$ROOT/landguard-app-scaffold/land-monitor-app"

# ── Check Node version ──
NODE_VERSION=$(node -v 2>/dev/null || echo "none")
if [ "$NODE_VERSION" = "none" ]; then
  echo "Node.js is not installed. Install Node 18+ from https://nodejs.org"
  exit 1
fi
log "Node.js version: $NODE_VERSION"

# ── Create .env files from templates ──
log "Creating .env files..."

# Root .env
if [ ! -f "$ROOT/.env" ]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
  log "Created .env from .env.example"
else
  warn ".env already exists — skipping"
fi

# Backend .env
if [ ! -f "$APP_DIR/backend/.env" ]; then
  if [ -f "$APP_DIR/backend/.env.example" ]; then
    cp "$APP_DIR/backend/.env.example" "$APP_DIR/backend/.env"
    log "Created backend/.env"
  fi
else
  warn "backend/.env already exists — skipping"
fi

# Frontend .env
if [ ! -f "$APP_DIR/frontend-owner/.env" ]; then
  if [ -f "$APP_DIR/frontend-owner/.env.example" ]; then
    cp "$APP_DIR/frontend-owner/.env.example" "$APP_DIR/frontend-owner/.env"
    log "Created frontend-owner/.env"
  fi
else
  warn "frontend-owner/.env already exists — skipping"
fi

# ── Install dependencies ──
log "Installing dependencies..."

log "  Installing design-system..."
cd "$APP_DIR/design-system"
npm install --silent

log "  Installing backend..."
cd "$APP_DIR/backend"
npm install --silent

log "  Installing frontend..."
cd "$APP_DIR/frontend-owner"
npm install --silent

# ── Verify builds ──
log "Verifying frontend build..."
npm run build --silent && log "Frontend build OK" || { echo "Frontend build failed"; exit 1; }

# ── Done ──
echo ""
echo "═══════════════════════════════════════════════════════════════"
log "Setup complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
info "Next steps:"
info "  1. Edit .env files with your real values (DATABASE_URL, JWT_SECRET, etc.)"
info "  2. Run the database migration:  yarn migrate"
info "  3. Start development:           yarn start"
info ""
info "  Frontend: http://localhost:5173"
info "  Backend:  http://localhost:4000"
info "  Health:   http://localhost:4000/health"
echo ""
