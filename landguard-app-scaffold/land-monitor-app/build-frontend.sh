#!/usr/bin/env bash
# Render Static Site Build Script — EarthGlobal Frontend
# This script builds the design-system first, then the frontend-owner app.
# Used by Render's static site service as the buildCommand.
set -e

echo "=== EarthGlobal Frontend Build ==="

# Move to the land-monitor-app root
LAND_APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$LAND_APP_DIR"

echo "→ Installing design-system dependencies..."
cd design-system
npm install --production=false

echo "→ Building design-system..."
npm run build

echo "→ Installing frontend-owner dependencies..."
cd ../frontend-owner
npm install --production=false

echo "→ Building frontend-owner (Vite + PWA)..."
npm run build

echo "→ Verifying dist/ output..."
if [ -d "./dist" ]; then
  echo "✓ Build successful — dist/ contains:"
  ls -la ./dist/ | head -20
  echo "✓ Static publish path: ./dist"
else
  echo "✗ Build failed — dist/ not found"
  exit 1
fi

echo "=== Build Complete ==="
