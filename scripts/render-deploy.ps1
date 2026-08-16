# ═══════════════════════════════════════════════════════════════
# EarthGlobal — Render Auto-Deploy Script (Windows PowerShell)
#
# Usage:
#   $env:RENDER_API_KEY = "rpg_xxx"
#   .\scripts\render-deploy.ps1
#
# Or set RENDER_API_KEY in your .env file and run:
#   .\scripts\render-deploy.ps1
# ═══════════════════════════════════════════════════════════════
param()

$ErrorActionPreference = "Stop"

function Log($msg)  { Write-Host "[deploy] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[warn] $msg" -ForegroundColor Yellow }
function Info($msg) { Write-Host "[info] $msg" -ForegroundColor Cyan }
function Err($msg)  { Write-Host "[error] $msg" -ForegroundColor Red }

# ── Load .env if it exists ──
if (Test-Path .env) {
    Get-Content .env | Where-Object { $_ -match '^\s*[^#]' } | ForEach-Object {
        $parts = $_ -split '=', 2
        if ($parts.Length -eq 2) {
            $key = $parts[0].Trim()
            $val = $parts[1].Trim()
            Set-Item -Path "env:$key" -Value $val
        }
    }
    Log "Loaded .env file"
}

# ── Check prerequisites ──
if (-not $env:RENDER_API_KEY) {
    Err "RENDER_API_KEY is not set."
    Write-Host ""
    Info "Get your API key at: https://dashboard.render.com/users/me"
    Info "Then run: `$env:RENDER_API_KEY = 'rpg_xxx'; .\scripts\render-deploy.ps1"
    Write-Host ""
    Info "Or add to .env:  RENDER_API_KEY=rpg_xxx"
    exit 1
}

if (-not $env:DATABASE_URL) {
    Warn "DATABASE_URL is not set in .env"
    Warn "You'll need to set it manually in the Render dashboard."
}

$RENDER_API = "https://api.render.com/v1"
$AUTH = @{ Authorization = "Bearer $env:RENDER_API_KEY"; "Content-Type" = "application/json" }

# ── Step 1: Verify API key ──
Log "Verifying Render API key..."
try {
    $owners = Invoke-RestMethod -Uri "$RENDER_API/owners" -Headers $AUTH -Method Get
    $ownerId = $owners[0].owner.id
    Log "Authenticated as Render owner: $ownerId"
} catch {
    Err "Failed to authenticate with Render API: $($_.Exception.Message)"
    exit 1
}

# ── Step 2: Check for existing services ──
Log "Checking for existing EarthGlobal services..."
try {
    $services = Invoke-RestMethod -Uri "$RENDER_API/services?limit=50" -Headers $AUTH -Method Get
    $apiService = $services | Where-Object { $_.service.name -eq "earthglobal-api" } | Select-Object -First 1
} catch {
    $apiService = $null
}

if ($apiService) {
    $serviceId = $apiService.service.id
    Log "EarthGlobal API service found (ID: $serviceId)"
    Log "Updating environment variables..."

    # ── Update env vars ──
    function Set-EnvVar($svcId, $key, $value) {
        if (-not $value) { Warn "  Skipping $key (no value)"; return }
        $body = @{ key = $key; value = $value } | ConvertTo-Json
        try {
            Invoke-RestMethod -Uri "$RENDER_API/services/$svcId/env-vars/$key" -Headers $AUTH -Method Put -Body $body | Out-Null
            Log "  Set $key"
        } catch {
            Warn "  Failed to set $key"
        }
    }

    Set-EnvVar $serviceId "NODE_ENV" "production"
    Set-EnvVar $serviceId "DATABASE_URL" $env:DATABASE_URL
    Set-EnvVar $serviceId "DATABASE_SSL" "true"
    if (-not $env:JWT_SECRET) { $env:JWT_SECRET = -join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) }) }
    Set-EnvVar $serviceId "JWT_SECRET" $env:JWT_SECRET
    Set-EnvVar $serviceId "CORS_ORIGINS" "https://earthglobalgh.netlify.app,https://earthglobal-api.onrender.com"
    Set-EnvVar $serviceId "PORT" "10000"
    Set-EnvVar $serviceId "STRIPE_SECRET_KEY" $env:STRIPE_SECRET_KEY
    Set-EnvVar $serviceId "STRIPE_WEBHOOK_SECRET" $env:STRIPE_WEBHOOK_SECRET
    Set-EnvVar $serviceId "EE_SERVICE_ACCOUNT_JSON" $env:EE_SERVICE_ACCOUNT_JSON
    Set-EnvVar $serviceId "S3_BUCKET" $env:S3_BUCKET
    Set-EnvVar $serviceId "S3_ACCESS_KEY_ID" $env:S3_ACCESS_KEY_ID
    Set-EnvVar $serviceId "S3_SECRET_ACCESS_KEY" $env:S3_SECRET_ACCESS_KEY
    Set-EnvVar $serviceId "S3_ENDPOINT" $env:S3_ENDPOINT
    Set-EnvVar $serviceId "SENDGRID_API_KEY" $env:SENDGRID_API_KEY
    Set-EnvVar $serviceId "TWILIO_ACCOUNT_SID" $env:TWILIO_ACCOUNT_SID
    Set-EnvVar $serviceId "TWILIO_AUTH_TOKEN" $env:TWILIO_AUTH_TOKEN

    # ── Trigger deploy ──
    Log "Triggering deploy..."
    $deployBody = @{ clearCache = "do_not_clear" } | ConvertTo-Json
    $deploy = Invoke-RestMethod -Uri "$RENDER_API/services/$serviceId/deploys" -Headers $AUTH -Method Post -Body $deployBody
    Log "Deploy triggered: $($deploy.id)"
    Info "Watch at: https://dashboard.render.com/web/$serviceId"

} else {
    Log "No existing services found."
    Write-Host ""
    Info "To deploy using the render.yaml blueprint:"
    Info ""
    Info "  Option A - Render Dashboard (recommended for first deploy):"
    Info "    1. Go to: https://dashboard.render.com/blueprints"
    Info "    2. Click 'New Blueprint Instance'"
    Info "    3. Select your GitHub repo: AT175/Earthglobal"
    Info "    4. Render will detect render.yaml and create all services"
    Info "    5. Set DATABASE_URL in the dashboard for the API + migration services"
    Info ""
    Info "  After services are created, re-run this script to set env vars automatically."
    exit 0
}

# ── Step 3: Run migration if DATABASE_URL is set ──
if ($env:DATABASE_URL) {
    Log "Running database migration..."
    $migratePath = "landguard-app-scaffold/land-monitor-app/backend/scripts/migrate.js"
    if (Test-Path $migratePath) {
        Push-Location "landguard-app-scaffold/land-monitor-app/backend"
        $env:DATABASE_SSL = "true"
        node scripts/migrate.js
        Pop-Location
        Log "Migration complete."
    } else {
        Warn "Migration script not found at $migratePath"
    }
} else {
    Warn "DATABASE_URL not set - skipping migration."
}

# ── Summary ──
Write-Host ""
Write-Host "==============================================================="
Log "Render deployment complete!"
Write-Host "==============================================================="
Write-Host ""
Info "API:      https://earthglobal-api.onrender.com"
Info "Health:   https://earthglobal-api.onrender.com/health"
Info "Frontend: https://earthglobalgh.netlify.app"
Write-Host ""
if (-not $env:DATABASE_URL) { Warn "TODO: Set DATABASE_URL in Render dashboard" }
if (-not $env:STRIPE_SECRET_KEY) { Warn "TODO: Set STRIPE_SECRET_KEY in Render dashboard" }
if (-not $env:EE_SERVICE_ACCOUNT_JSON) { Warn "TODO: Set EE_SERVICE_ACCOUNT_JSON for satellite imagery" }
Write-Host ""
Log "Done!"
