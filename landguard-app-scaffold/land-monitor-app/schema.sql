-- EarthGlobal Land Monitoring App — Database Schema
-- PostgreSQL + PostGIS
--
-- IMPORTANT: This schema creates a dedicated PostgreSQL schema named "earthglobal"
-- so it is fully isolated from any other application sharing the same database.
-- Extensions (postgis, uuid-ossp) are installed at the database level in "public"
-- since PostgreSQL extensions must be owned by a superuser and live in a schema
-- accessible to all users. All EarthGlobal tables, types, and indexes live inside
-- the "earthglobal" schema.

-- Extensions must be created in public (PostgreSQL requirement)
-- Supabase installs extensions in the "extensions" schema
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the dedicated EarthGlobal schema (idempotent)
CREATE SCHEMA IF NOT EXISTS earthglobal;

-- All subsequent objects are created inside the earthglobal schema
-- Include "extensions" for Supabase-installed extension functions
SET search_path TO earthglobal, public, extensions;

-- =========================================================
-- OWNERS
-- =========================================================
CREATE TABLE IF NOT EXISTS owners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255),
    approved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add approved column to owners if it doesn't exist (for existing DBs)
DO $$ BEGIN
    ALTER TABLE owners ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- =========================================================
-- AGENTS
-- =========================================================
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50) UNIQUE NOT NULL,
    region VARCHAR(255),
    password_hash VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add email + password_hash to agents if they don't exist (for existing DBs)
DO $$ BEGIN
    ALTER TABLE agents ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE agents ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- =========================================================
-- ADMINS
-- =========================================================
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin sub-role: 'super_admin' (full platform access) or 'finance_officer'
-- (manages subscriptions, fees, payments and tenant billing configuration).
-- Mirrors the assembly_users.role sub-role pattern.
DO $$ BEGIN
    ALTER TABLE admins ADD COLUMN IF NOT EXISTS role VARCHAR(30) NOT NULL DEFAULT 'super_admin';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- =========================================================
-- PARCELS
-- =========================================================
CREATE TABLE IF NOT EXISTS parcels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    boundary GEOMETRY(POLYGON, 4326) NOT NULL,
    region VARCHAR(255),
    survey_date DATE,
    deed_doc_url TEXT,
    area_sqm NUMERIC(14, 2),
    perimeter_m NUMERIC(14, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spatial index for fast map queries / bounding box lookups
CREATE INDEX IF NOT EXISTS idx_parcels_boundary ON parcels USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_parcels_owner ON parcels (owner_id);

-- =========================================================
-- SURVEY SESSIONS
-- =========================================================
DO $$ BEGIN
    CREATE TYPE survey_method AS ENUM ('live_gps', 'file_import', 'manual_coords');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS survey_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
    surveyed_by UUID, -- references agents(id) or an admin user id
    method survey_method NOT NULL,
    source_file_url TEXT,
    raw_points JSONB, -- array of { lat, lng, accuracy_m, captured_at } for live_gps
    gps_accuracy_m NUMERIC(6, 2),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_survey_sessions_parcel ON survey_sessions (parcel_id);

-- =========================================================
-- PLANS & SUBSCRIPTIONS
-- =========================================================
DO $$ BEGIN
    CREATE TYPE plan_period AS ENUM ('week', 'month', 'quarter', 'one_time');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TYPE plan_period ADD VALUE IF NOT EXISTS 'one_time'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- plan_category: 'search' = one-off land search batches (quick/validated/turbo)
--                'monitoring' = recurring land monitoring subscriptions
DO $$ BEGIN
    CREATE TYPE plan_category AS ENUM ('search', 'monitoring');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- billing_cycle: for monitoring plans — monthly, quarterly, or yearly
DO $$ BEGIN
    CREATE TYPE billing_cycle AS ENUM ('monthly', 'quarterly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    included_visits_per_period INT NOT NULL DEFAULT 0,
    period plan_period NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    live_video_included BOOLEAN NOT NULL DEFAULT false,
    -- ── Extended plan metadata ──
    category plan_category NOT NULL DEFAULT 'monitoring',
    tier VARCHAR(50) NOT NULL DEFAULT 'regular',        -- quick_search | validated_search | taboo_search | regular | executive_suite | golden_member
    max_parcels INT NOT NULL DEFAULT 5,                  -- max parcels per subscription (5 for all tiers)
    includes_quick_search BOOLEAN NOT NULL DEFAULT false,
    includes_validated_search BOOLEAN NOT NULL DEFAULT false,
    includes_field_verification BOOLEAN NOT NULL DEFAULT false,
    -- Search-plan delivery pricing (NULL for monitoring plans)
    min_delivery_days INT,                               -- minimum delivery days (1)
    max_delivery_days INT,                               -- maximum delivery days (5)
    base_price NUMERIC(12, 2),                           -- price at max delivery days
    rush_fee_per_day NUMERIC(12, 2) DEFAULT 0,           -- extra fee per day fewer than max
    -- Monitoring billing discounts (fractional, e.g. 0.9 = 10% off for quarterly)
    quarterly_discount NUMERIC(3, 2) DEFAULT 0.00,
    yearly_discount NUMERIC(3, 2) DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plans_category ON plans(category);
CREATE INDEX IF NOT EXISTS idx_plans_tier ON plans(tier);
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active);

-- Ensure one plan per category+tier (prevents duplicate seeds)
DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_category_tier_unique ON plans(category, tier);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'cancelled', 'expired', 'trial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    credits_remaining INT NOT NULL DEFAULT 0,
    renews_at TIMESTAMPTZ,
    status subscription_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- ── Extended subscription metadata ──
    billing_cycle billing_cycle,                         -- monthly | quarterly | yearly (monitoring plans)
    delivery_days INT,                                   -- chosen delivery days (search plans)
    price_paid NUMERIC(12, 2) DEFAULT 0,                 -- actual amount paid
    currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
    parcels_used INT NOT NULL DEFAULT 0,                 -- how many of max_parcels are used
    searches_used INT NOT NULL DEFAULT 0,                -- how many searches done (search plans)
    expires_at TIMESTAMPTZ                               -- when the subscription expires
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_owner ON subscriptions (owner_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);

-- Top-ups: additional services purchased when a subscription is exhausted
DO $$ BEGIN
    CREATE TYPE top_up_type AS ENUM ('extra_parcel', 'extra_search', 'field_visit', 'rush_delivery');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE top_up_status AS ENUM ('pending', 'fulfilled', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS top_ups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    type top_up_type NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
    status top_up_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    fulfilled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_top_ups_subscription ON top_ups(subscription_id);
CREATE INDEX IF NOT EXISTS idx_top_ups_owner ON top_ups(owner_id);
CREATE INDEX IF NOT EXISTS idx_top_ups_status ON top_ups(status);

-- Extend payment_purpose for top-ups and search subscriptions
DO $$ BEGIN
    ALTER TYPE payment_purpose ADD VALUE IF NOT EXISTS 'top_up';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TYPE payment_purpose ADD VALUE IF NOT EXISTS 'search';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Seed default plans (idempotent — uses ON CONFLICT) ──
-- Search plans (one-off, max 5 parcels each, delivery-day pricing)
INSERT INTO plans (name, category, tier, period, price, included_visits_per_period, max_parcels,
    includes_quick_search, includes_validated_search, includes_field_verification,
    min_delivery_days, max_delivery_days, base_price, rush_fee_per_day, is_active, sort_order, description)
VALUES
    ('Quick Search', 'search', 'quick_search', 'week', 50.00, 0, 5,
     true, false, false,
     NULL, NULL, 50.00, 0, true, 1,
     'Basic parcel detail search. Covers up to 5 parcels. Once exhausted, a new subscription is needed.'),
    ('Validated Search', 'search', 'validated_search', 'week', 150.00, 0, 5,
     true, true, false,
     1, 5, 150.00, 40.00, true, 2,
     'Quick Search + validated search from the assembly planner. Delivered in 1-5 working days. Pay more for faster delivery.'),
    ('Turbo Search', 'search', 'taboo_search', 'week', 300.00, 0, 5,
     true, true, true,
     1, 5, 300.00, 80.00, true, 3,
     'Quick Search + Validated Search + field verification. Delivered in 1-5 days. Price based on delivery speed.')
ON CONFLICT (category, tier) DO NOTHING;

-- Monitoring plans (recurring, max 5 parcels, billing cycle discounts)
INSERT INTO plans (name, category, tier, period, price, included_visits_per_period, max_parcels,
    includes_quick_search, includes_validated_search, includes_field_verification,
    quarterly_discount, yearly_discount, is_active, sort_order, description)
VALUES
    ('Regular Monitoring', 'monitoring', 'regular', 'month', 100.00, 4, 5,
     true, false, false,
     0.10, 0.20, true, 4,
     'Monitor up to 5 parcels with satellite + alert detection. Excludes field verification.'),
    ('Executive Suite', 'monitoring', 'executive_suite', 'month', 250.00, 8, 5,
     true, true, true,
     0.10, 0.20, true, 5,
     'Monitor up to 5 plots with one scheduled field visit per billing cycle. Includes validated search.'),
    ('Golden Member', 'monitoring', 'golden_member', 'month', 500.00, 12, 5,
     true, true, true,
     0.15, 0.25, true, 6,
     'Premium monitoring for up to 5 plots with regular field visits upon request. Full feature access.')
ON CONFLICT (category, tier) DO NOTHING;

-- =========================================================
-- VISIT REQUESTS
-- =========================================================
DO $$ BEGIN
    CREATE TYPE visit_type AS ENUM ('photo', 'video', 'live');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE visit_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS visit_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id),
    type visit_type NOT NULL,
    status visit_status NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    price_charged NUMERIC(10, 2),
    plan_credit_used BOOLEAN NOT NULL DEFAULT false,
    agent_notes TEXT,
    owner_notes TEXT,
    survey_session_id UUID REFERENCES survey_sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_visit_requests_owner ON visit_requests (owner_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_agent ON visit_requests (agent_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_status ON visit_requests (status);

-- =========================================================
-- MEDIA
-- =========================================================
DO $$ BEGIN
    CREATE TYPE media_type AS ENUM ('photo', 'video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_request_id UUID NOT NULL REFERENCES visit_requests(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    type media_type NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_visit_request ON media (visit_request_id);

-- =========================================================
-- ALERTS (satellite change detection)
-- =========================================================
DO $$ BEGIN
    CREATE TYPE alert_type AS ENUM ('clearing', 'possible_structure', 'other', 'new_building', 'building_change', 'deforestation', 'air_quality', 'urban_heat', 'wetland_loss');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add building change detection values if the type already exists
DO $$ BEGIN ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'new_building'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'building_change'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'deforestation'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'air_quality'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'urban_heat'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'wetland_loss'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ndvi_before NUMERIC(5, 3),
    ndvi_after NUMERIC(5, 3),
    change_score NUMERIC(6, 3),
    alert_type alert_type NOT NULL,
    image_url TEXT,
    verified BOOLEAN NOT NULL DEFAULT false,
    verified_by_visit_id UUID REFERENCES visit_requests(id)
);

CREATE INDEX IF NOT EXISTS idx_alerts_parcel ON alerts (parcel_id);

-- Building change detection columns on alerts (FK added after building_change_detections table is created)
DO $$ BEGIN ALTER TABLE alerts ADD COLUMN IF NOT EXISTS change_detection_id UUID; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE alerts ADD COLUMN IF NOT EXISTS building_count INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE alerts ADD COLUMN IF NOT EXISTS builtup_area_sqm DOUBLE PRECISION; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- =========================================================
-- PARCEL IMAGES (satellite snapshots)
-- =========================================================
CREATE TABLE IF NOT EXISTS parcel_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    ndvi_value NUMERIC(5, 3),
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    source VARCHAR(50) NOT NULL DEFAULT 'sentinel-2'
);

CREATE INDEX IF NOT EXISTS idx_parcel_images_parcel ON parcel_images (parcel_id);
CREATE INDEX IF NOT EXISTS idx_parcel_images_date ON parcel_images (captured_at DESC);

-- =========================================================
-- PAYMENTS
-- =========================================================
DO $$ BEGIN
    CREATE TYPE payment_purpose AS ENUM ('subscription', 'one_off_visit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend payment_purpose for land-sale commission payments and tenant
-- (assembly) subscription billing, both managed by the finance officer.
DO $$ BEGIN
    ALTER TYPE payment_purpose ADD VALUE IF NOT EXISTS 'land_sale';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TYPE payment_purpose ADD VALUE IF NOT EXISTS 'tenant_billing';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    provider VARCHAR(50) NOT NULL, -- 'stripe' | 'paystack' | 'flutterwave'
    provider_ref VARCHAR(255),
    purpose payment_purpose NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_owner ON payments (owner_id);

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (owner_id IS NOT NULL OR agent_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_notifications_owner ON notifications (owner_id);
CREATE INDEX IF NOT EXISTS idx_notifications_agent ON notifications (agent_id);

-- =========================================================
-- AUDIT LOGS — immutable record of sensitive actions
-- =========================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,  -- no FK — user may be deleted but audit record stays
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);

-- =========================================================
-- Reset search_path to default after schema setup
-- =========================================================
-- Reset search_path to the app default (pooled connections reuse this session)
SET search_path TO earthglobal, public, extensions;

-- =========================================================
-- MULTI-TENANT: ORGANIZATIONS (District Assemblies)
-- =========================================================
-- Each organization is a District Assembly or municipal authority
-- that uses EarthGlobal for urban planning and land administration.
-- =========================================================
SET search_path TO earthglobal, public, extensions;

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'district_assembly',
    region VARCHAR(255) NOT NULL,
    boundary GEOMETRY(POLYGON, 4326),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_boundary ON organizations USING GIST (boundary);

-- Add organization_id to existing tables (nullable for backward compat)
DO $$ BEGIN ALTER TABLE owners ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agents ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admins ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE parcels ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_parcels_org ON parcels (organization_id);

-- =========================================================
-- ASSEMBLY USERS (municipal staff)
-- =========================================================
DO $$ BEGIN
    CREATE TYPE assembly_role AS ENUM ('assembly_admin', 'planning_officer', 'revenue_officer', 'inspector');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS assembly_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    role assembly_role NOT NULL DEFAULT 'planning_officer',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assembly_users_org ON assembly_users (organization_id);

-- =========================================================
-- BUILDING PERMITS
-- =========================================================
DO $$ BEGIN
    CREATE TYPE permit_status AS ENUM ('pending', 'approved', 'rejected', 'expired', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE permit_type AS ENUM ('residential', 'commercial', 'industrial', 'institutional', 'agricultural', 'renovation', 'demolition');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS building_permits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
    applicant_name VARCHAR(255) NOT NULL,
    applicant_phone VARCHAR(50),
    permit_type permit_type NOT NULL,
    status permit_status NOT NULL DEFAULT 'pending',
    permit_number VARCHAR(50) UNIQUE,
    building_description TEXT,
    building_footprint GEOMETRY(POLYGON, 4326),
    estimated_cost NUMERIC(14, 2),
    fee_paid NUMERIC(10, 2) DEFAULT 0,
    approved_by UUID REFERENCES assembly_users(id),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at TIMESTAMPTZ,
    expires_at DATE,
    documents JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permits_org ON building_permits (organization_id);
CREATE INDEX IF NOT EXISTS idx_permits_parcel ON building_permits (parcel_id);
CREATE INDEX IF NOT EXISTS idx_permits_status ON building_permits (status);
CREATE INDEX IF NOT EXISTS idx_permits_footprint ON building_permits USING GIST (building_footprint);

-- =========================================================
-- BUILDINGS (detected from satellite imagery)
-- =========================================================
DO $$ BEGIN
    CREATE TYPE building_status AS ENUM ('unverified', 'verified_permitted', 'verified_unpermitted', 'under_investigation', 'demolished');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Building change detection runs — tracks each ML-based comparison
CREATE TABLE IF NOT EXISTS building_change_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'running',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    baseline_start DATE NOT NULL,
    baseline_end DATE NOT NULL,
    bbox JSONB,
    new_buildings_count INTEGER DEFAULT 0,
    new_builtup_area_sqm DOUBLE PRECISION DEFAULT 0,
    method TEXT,
    before_tile_url TEXT,
    after_tile_url TEXT,
    change_tile_url TEXT,
    error_message TEXT,
    started_by UUID REFERENCES assembly_users(id),
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bcd_org ON building_change_detections(organization_id);
CREATE INDEX IF NOT EXISTS idx_bcd_status ON building_change_detections(status);

-- Add FK from alerts.change_detection_id to building_change_detections (now that the table exists)
DO $$ BEGIN
  ALTER TABLE alerts ADD CONSTRAINT fk_alerts_change_detection
    FOREIGN KEY (change_detection_id) REFERENCES building_change_detections(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
    permit_id UUID REFERENCES building_permits(id) ON DELETE SET NULL,
    footprint GEOMETRY(POLYGON, 4326) NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    first_seen_in_image TEXT,
    latest_image TEXT,
    area_sqm NUMERIC(10, 2),
    status building_status NOT NULL DEFAULT 'unverified',
    in_protected_area BOOLEAN NOT NULL DEFAULT false,
    verified_by UUID REFERENCES assembly_users(id),
    verified_at TIMESTAMPTZ,
    notes TEXT,
    -- Geospatial metadata (added by migrate-geospatial.js)
    metadata JSONB DEFAULT '{}'::jsonb,
    centroid_lat DOUBLE PRECISION,
    centroid_lng DOUBLE PRECISION,
    -- Change detection linkage (added by migrate-building-change-detection.js)
    change_detection_id UUID REFERENCES building_change_detections(id) ON DELETE SET NULL,
    -- Building height estimation (added by migrate-building-height.js)
    estimated_height_m DOUBLE PRECISION,
    estimated_floors INTEGER,
    height_method VARCHAR(20),
    height_confidence DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buildings_org ON buildings (organization_id);
CREATE INDEX IF NOT EXISTS idx_buildings_parcel ON buildings (parcel_id);
CREATE INDEX IF NOT EXISTS idx_buildings_status ON buildings (status);
CREATE INDEX IF NOT EXISTS idx_buildings_footprint ON buildings USING GIST (footprint);
CREATE INDEX IF NOT EXISTS idx_buildings_protected ON buildings (in_protected_area);
CREATE INDEX IF NOT EXISTS idx_buildings_centroid ON buildings (centroid_lat, centroid_lng);
CREATE INDEX IF NOT EXISTS idx_buildings_cd ON buildings (change_detection_id);

-- =========================================================
-- PROTECTED AREAS (zones where construction is prohibited)
-- =========================================================
DO $$ BEGIN
    CREATE TYPE protected_area_type AS ENUM ('forest_reserve', 'water_body', 'wetland', 'cemetery', 'public_land', 'buffer_zone', 'ecological_corridor', 'heritage_site');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS protected_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type protected_area_type NOT NULL,
    boundary GEOMETRY(POLYGON, 4326) NOT NULL,
    description TEXT,
    regulations TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_protected_areas_org ON protected_areas (organization_id);
CREATE INDEX IF NOT EXISTS idx_protected_areas_boundary ON protected_areas USING GIST (boundary);

-- =========================================================
-- PARCEL TRANSACTIONS (land sales)
-- =========================================================
DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'disputed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE documentation_status AS ENUM ('proper', 'improper', 'missing', 'under_review');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS parcel_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
    seller_name VARCHAR(255) NOT NULL,
    buyer_name VARCHAR(255) NOT NULL,
    seller_phone VARCHAR(50),
    buyer_phone VARCHAR(50),
    sale_price NUMERIC(14, 2),
    transaction_date DATE NOT NULL,
    status transaction_status NOT NULL DEFAULT 'pending',
    documentation_status documentation_status NOT NULL DEFAULT 'under_review',
    deed_document_url TEXT,
    stamp_duty_paid NUMERIC(10, 2) DEFAULT 0,
    registration_fee_paid NUMERIC(10, 2) DEFAULT 0,
    reviewed_by UUID REFERENCES assembly_users(id),
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_org ON parcel_transactions (organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_parcel ON parcel_transactions (parcel_id);
CREATE INDEX IF NOT EXISTS idx_transactions_doc_status ON parcel_transactions (documentation_status);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON parcel_transactions (status);

-- =========================================================
-- BUILDING DESIGNS (owner-submitted for authorization)
-- =========================================================
DO $$ BEGIN
    CREATE TYPE design_status AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'revision_requested');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS building_designs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES owners(id) ON DELETE SET NULL,
    designer_name VARCHAR(255),
    design_name VARCHAR(255) NOT NULL,
    description TEXT,
    design_document_url TEXT NOT NULL,
    footprint GEOMETRY(POLYGON, 4326),
    estimated_cost NUMERIC(14, 2),
    status design_status NOT NULL DEFAULT 'submitted',
    reviewed_by UUID REFERENCES assembly_users(id),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_designs_org ON building_designs (organization_id);
CREATE INDEX IF NOT EXISTS idx_designs_parcel ON building_designs (parcel_id);
CREATE INDEX IF NOT EXISTS idx_designs_status ON building_designs (status);

-- =========================================================
-- REVENUE RECORDS (fees collected by the assembly)
-- =========================================================
DO $$ BEGIN
    CREATE TYPE revenue_category AS ENUM ('permit_fee', 'transaction_fee', 'stamp_duty', 'registration_fee', 'penalty', 'inspection_fee', 'subscription', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS revenue_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category revenue_category NOT NULL,
    description VARCHAR(255),
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
    payment_method VARCHAR(50),
    reference_id UUID,
    reference_type VARCHAR(50),
    collected_by UUID REFERENCES assembly_users(id),
    payer_name VARCHAR(255),
    payer_phone VARCHAR(50),
    collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revenue_org ON revenue_records (organization_id);
CREATE INDEX IF NOT EXISTS idx_revenue_category ON revenue_records (category);
CREATE INDEX IF NOT EXISTS idx_revenue_date ON revenue_records (collected_at DESC);

-- =========================================================
-- Extend alert_type enum for assembly alerts
-- =========================================================
DO $$ BEGIN
    ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'unpermitted_building';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'protected_area_violation';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'design_submitted';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'improper_transaction';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add organization_id to alerts
DO $$ BEGIN ALTER TABLE alerts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_alerts_org ON alerts (organization_id);

-- Add organization_id to notifications for assembly users
DO $$ BEGIN ALTER TABLE notifications ADD COLUMN IF NOT EXISTS assembly_user_id UUID REFERENCES assembly_users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE notifications ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_notifications_assembly ON notifications (assembly_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications (organization_id);

-- Relax the CHECK constraint on notifications (now any of owner/agent/assembly can be set)
DO $$ BEGIN
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_owner_id_agent_id_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- =========================================================
-- LAND SALE MARKETPLACE
-- =========================================================

-- Add seller-related columns to owners table
DO $$ BEGIN ALTER TABLE owners ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) NOT NULL DEFAULT 'owner'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE owners ADD COLUMN IF NOT EXISTS seller_verified BOOLEAN NOT NULL DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE owners ADD COLUMN IF NOT EXISTS total_sales INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE owners ADD COLUMN IF NOT EXISTS total_commission_paid NUMERIC(14, 2) NOT NULL DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE owners ADD COLUMN IF NOT EXISTS outstanding_commission NUMERIC(14, 2) NOT NULL DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE owners ADD COLUMN IF NOT EXISTS free_monitoring_until TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Land listings
CREATE TABLE IF NOT EXISTS land_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    seller_name VARCHAR(255) NOT NULL,
    seller_email VARCHAR(255),
    seller_phone VARCHAR(50),
    seller_type VARCHAR(20) NOT NULL DEFAULT 'seller',
    parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    region VARCHAR(255),
    area_sqm DOUBLE PRECISION,
    boundary JSONB,
    centroid_lat DOUBLE PRECISION,
    centroid_lng DOUBLE PRECISION,
    price NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
    platform_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    platform_fee_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    validation_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    validation_result JSONB,
    nearby_hazards JSONB DEFAULT '[]'::jsonb,
    planner_id UUID REFERENCES assembly_users(id) ON DELETE SET NULL,
    planner_name VARCHAR(255),
    validated_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    planner_notes TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    images JSONB DEFAULT '[]'::jsonb,
    view_count INTEGER DEFAULT 0,
    inquiry_count INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ll_org ON land_listings(organization_id);
CREATE INDEX IF NOT EXISTS idx_ll_seller ON land_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_ll_status ON land_listings(status);
CREATE INDEX IF NOT EXISTS idx_ll_validation ON land_listings(validation_status);

-- Land purchases
CREATE TABLE IF NOT EXISTS land_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES land_listings(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    buyer_name VARCHAR(255) NOT NULL,
    buyer_email VARCHAR(255),
    buyer_phone VARCHAR(50),
    buyer_address TEXT,
    purchase_price NUMERIC(14, 2) NOT NULL,
    platform_fee_amount NUMERIC(14, 2) NOT NULL,
    platform_fee_paid BOOLEAN NOT NULL DEFAULT false,
    purchase_form JSONB,
    status VARCHAR(40) NOT NULL DEFAULT 'initiated',
    initiated_at TIMESTAMPTZ DEFAULT now(),
    seller_notified_at TIMESTAMPTZ,
    seller_accepted_at TIMESTAMPTZ,
    payment_confirmed_at TIMESTAMPTZ,
    receipt_generated_at TIMESTAMPTZ,
    ownership_transferred_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    receipt_id UUID,
    seller_notes TEXT,
    buyer_notes TEXT,
    admin_notes TEXT,
    free_monitoring_granted BOOLEAN NOT NULL DEFAULT false,
    free_monitoring_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lp_org ON land_purchases(organization_id);
CREATE INDEX IF NOT EXISTS idx_lp_listing ON land_purchases(listing_id);
CREATE INDEX IF NOT EXISTS idx_lp_buyer ON land_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_lp_seller ON land_purchases(seller_id);
CREATE INDEX IF NOT EXISTS idx_lp_status ON land_purchases(status);

-- Land receipts
CREATE TABLE IF NOT EXISTS land_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    purchase_id UUID NOT NULL REFERENCES land_purchases(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES land_listings(id) ON DELETE CASCADE,
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    seller_name VARCHAR(255) NOT NULL,
    seller_email VARCHAR(255),
    buyer_name VARCHAR(255) NOT NULL,
    buyer_email VARCHAR(255),
    land_title VARCHAR(255) NOT NULL,
    region VARCHAR(255),
    area_sqm DOUBLE PRECISION,
    purchase_price NUMERIC(14, 2) NOT NULL,
    platform_fee_amount NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    payment_date TIMESTAMPTZ,
    receipt_url TEXT,
    transfer_documents JSONB DEFAULT '[]'::jsonb,
    generated_by VARCHAR(255) NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lr_purchase ON land_receipts(purchase_id);

-- =========================================================
-- PLANNING SCHEMES
-- Uploaded by planning officers for the assembly. Each scheme
-- contains parcels (zoned land use areas) that form the basis
-- for building extraction per parcel. Schemes may be uploaded
-- in a local datum/projection and are reprojected to WGS84
-- (EPSG:4326) for map visualization.
-- =========================================================
CREATE TABLE IF NOT EXISTS planning_schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    -- Source projection info (what the planner uploaded in)
    source_crs VARCHAR(100),          -- e.g. 'EPSG:2136' (Accra / Ghana Grid)
    source_crs_name VARCHAR(255),     -- human-readable, e.g. 'Accra / Ghana Grid'
    source_format VARCHAR(50),        -- 'geojson', 'kml', 'shapefile'
    -- The scheme boundary in WGS84 (EPSG:4326) — always stored in web-friendly projection
    boundary GEOMETRY(POLYGON, 4326),
    -- Full scheme data as GeoJSON FeatureCollection (all parcels/zones in WGS84)
    geojson JSONB NOT NULL,
    -- Original uploaded file metadata
    original_filename VARCHAR(255),
    original_file_size INTEGER,
    -- Stats
    parcel_count INTEGER DEFAULT 0,
    total_area_sqm DOUBLE PRECISION,
    -- Status
    status VARCHAR(30) NOT NULL DEFAULT 'active',  -- active, superseded, draft
    version VARCHAR(50),
    -- Who uploaded
    uploaded_by UUID REFERENCES assembly_users(id) ON DELETE SET NULL,
    uploaded_by_name VARCHAR(255),
    -- Timestamps
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ps_org ON planning_schemes(organization_id);
CREATE INDEX IF NOT EXISTS idx_ps_status ON planning_schemes(status);
CREATE INDEX IF NOT EXISTS idx_ps_boundary ON planning_schemes USING GIST (boundary);

-- =========================================================
-- SCHEME PARCELS — individual parcels/zones within a scheme
-- Each parcel can be used as the area for building extraction
-- =========================================================
CREATE TABLE IF NOT EXISTS scheme_parcels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id UUID NOT NULL REFERENCES planning_schemes(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    parcel_label VARCHAR(255),        -- e.g. 'Plot 42', 'Zone A'
    land_use VARCHAR(100),            -- e.g. 'residential', 'commercial', 'mixed'
    -- Parcel geometry in WGS84 (EPSG:4326)
    boundary GEOMETRY(POLYGON, 4326),
    area_sqm DOUBLE PRECISION,
    -- Original coordinates (before reprojection, for reference)
    original_coordinates JSONB,
    -- Building extraction results
    last_extraction_at TIMESTAMPTZ,
    last_extraction_count INTEGER DEFAULT 0,
    last_extraction_area_sqm DOUBLE PRECISION,
    -- Metadata
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sp_scheme ON scheme_parcels(scheme_id);
CREATE INDEX IF NOT EXISTS idx_sp_org ON scheme_parcels(organization_id);
CREATE INDEX IF NOT EXISTS idx_sp_boundary ON scheme_parcels USING GIST (boundary);

-- =========================================================
-- FINANCE — platform fee settings, tenant billing & invoices
-- Managed by the finance_officer admin sub-role. Covers everything
-- money-related: land-sale commission %, per-tenant (assembly)
-- subscription billing configuration, and invoices.
-- =========================================================

-- Singleton row holding platform-wide fee/commission defaults.
CREATE TABLE IF NOT EXISTS platform_fee_settings (
    id VARCHAR(20) PRIMARY KEY DEFAULT 'default',
    land_sale_commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    default_currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
    late_payment_penalty_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
    updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform_fee_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- Per-tenant (organization) billing configuration — one row per assembly.
CREATE TABLE IF NOT EXISTS tenant_billing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    billing_plan VARCHAR(50) NOT NULL DEFAULT 'standard',
    monthly_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
    -- NULL = use platform_fee_settings.land_sale_commission_percent
    commission_override_percent NUMERIC(5, 2),
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly', -- monthly | quarterly | yearly
    status VARCHAR(20) NOT NULL DEFAULT 'active',         -- active | trial | suspended | cancelled
    trial_ends_at TIMESTAMPTZ,
    next_invoice_date DATE,
    notes TEXT,
    updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_billing_org ON tenant_billing(organization_id);
CREATE INDEX IF NOT EXISTS idx_tenant_billing_status ON tenant_billing(status);

-- Invoices issued to tenant organizations for their subscription billing.
CREATE TABLE IF NOT EXISTS tenant_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
    period_start DATE,
    period_end DATE,
    due_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | paid | overdue | cancelled
    paid_at TIMESTAMPTZ,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    notes TEXT,
    created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_invoices_org ON tenant_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invoices_status ON tenant_invoices(status);

-- =========================================================
-- HIERARCHICAL PAYMENT SYSTEM
-- Payments are split between the platform (system finance)
-- and the tenant (assembly organization). The system receives
-- all subscription, upgrade, and fee revenue. Tenants receive
-- their own revenue (e.g. validated search fees, field visit
-- charges, land-sale commission share) into their wallet.
-- =========================================================

-- Payment methods supported by the platform
DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('cash', 'momo', 'card');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Settlement destination — who receives the money
DO $$ BEGIN
    CREATE TYPE settlement_destination AS ENUM ('system', 'tenant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Settlement status
DO $$ BEGIN
    CREATE TYPE settlement_status AS ENUM ('pending', 'settled', 'failed', 'reversed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add payment method + organization_id to payments table
DO $$ BEGIN ALTER TABLE payments ADD COLUMN IF NOT EXISTS method payment_method; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE payments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE payments ADD COLUMN IF NOT EXISTS method_reference VARCHAR(255); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
-- momo_number, card_last4 for receipt tracking
DO $$ BEGIN ALTER TABLE payments ADD COLUMN IF NOT EXISTS momo_number VARCHAR(20); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE payments ADD COLUMN IF NOT EXISTS card_last4 VARCHAR(4); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE payments ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method);
CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_purpose ON payments(purpose);

-- Tenant wallets — each organization has a wallet balance
-- that accumulates their share of payments until paid out.
CREATE TABLE IF NOT EXISTS tenant_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_earned NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_paid_out NUMERIC(14, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
    -- Payout account details
    payout_momo_number VARCHAR(20),
    payout_bank_name VARCHAR(100),
    payout_bank_account VARCHAR(50),
    payout_account_name VARCHAR(255),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_wallets_org ON tenant_wallets(organization_id);

-- Payment settlements — each payment is split into one or more
-- settlement lines. 'system' lines go to platform finance,
-- 'tenant' lines credit the organization's wallet.
CREATE TABLE IF NOT EXISTS payment_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    destination settlement_destination NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
    description VARCHAR(255),
    status settlement_status NOT NULL DEFAULT 'pending',
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settlements_payment ON payment_settlements(payment_id);
CREATE INDEX IF NOT EXISTS idx_settlements_org ON payment_settlements(organization_id);
CREATE INDEX IF NOT EXISTS idx_settlements_destination ON payment_settlements(destination);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON payment_settlements(status);

-- Tenant payouts — withdrawals from the tenant wallet to their
-- momo or bank account. Initiated by the finance officer.
DO $$ BEGIN
    CREATE TYPE payout_status AS ENUM ('pending', 'approved', 'rejected', 'paid', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE payout_method AS ENUM ('momo', 'bank', 'cash');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS tenant_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    amount NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
    method payout_method NOT NULL DEFAULT 'momo',
    -- Destination details (snapshot at time of payout)
    destination_account VARCHAR(255),
    destination_name VARCHAR(255),
    reference VARCHAR(255),
    notes TEXT,
    status payout_status NOT NULL DEFAULT 'pending',
    requested_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payouts_org ON tenant_payouts(organization_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON tenant_payouts(status);

-- Extend payment_purpose for tenant-collected fees
DO $$ BEGIN
    ALTER TYPE payment_purpose ADD VALUE IF NOT EXISTS 'validated_search';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TYPE payment_purpose ADD VALUE IF NOT EXISTS 'field_visit_fee';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TYPE payment_purpose ADD VALUE IF NOT EXISTS 'upgrade';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- USER PROFILE COLUMNS — extended metadata for all roles
-- =========================================================
-- Owners
DO $$ BEGIN ALTER TABLE owners ADD COLUMN IF NOT EXISTS avatar_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE owners ADD COLUMN IF NOT EXISTS bio TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE owners ADD COLUMN IF NOT EXISTS address TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE owners ADD COLUMN IF NOT EXISTS region VARCHAR(255); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE owners ADD COLUMN IF NOT EXISTS notification_email BOOLEAN NOT NULL DEFAULT true; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE owners ADD COLUMN IF NOT EXISTS notification_sms BOOLEAN NOT NULL DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE owners ADD COLUMN IF NOT EXISTS notification_push BOOLEAN NOT NULL DEFAULT true; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Agents
DO $$ BEGIN ALTER TABLE agents ADD COLUMN IF NOT EXISTS avatar_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agents ADD COLUMN IF NOT EXISTS bio TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agents ADD COLUMN IF NOT EXISTS address TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agents ADD COLUMN IF NOT EXISTS notification_email BOOLEAN NOT NULL DEFAULT true; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agents ADD COLUMN IF NOT EXISTS notification_push BOOLEAN NOT NULL DEFAULT true; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Admins
DO $$ BEGIN ALTER TABLE admins ADD COLUMN IF NOT EXISTS avatar_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admins ADD COLUMN IF NOT EXISTS bio TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone VARCHAR(50); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admins ADD COLUMN IF NOT EXISTS notification_email BOOLEAN NOT NULL DEFAULT true; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Assembly users
DO $$ BEGIN ALTER TABLE assembly_users ADD COLUMN IF NOT EXISTS avatar_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE assembly_users ADD COLUMN IF NOT EXISTS bio TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE assembly_users ADD COLUMN IF NOT EXISTS address TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE assembly_users ADD COLUMN IF NOT EXISTS notification_email BOOLEAN NOT NULL DEFAULT true; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE assembly_users ADD COLUMN IF NOT EXISTS notification_push BOOLEAN NOT NULL DEFAULT true; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- =========================================================
-- SITE PLANS
-- =========================================================
-- A site plan is a layout drawing for a parcel showing boundary,
-- buildings, setbacks, dimensions, north arrow, and scale.
-- Owners, admins, and assembly planning officers can generate
-- site plans. Assembly can certify them; uncertified plans are
-- draft/unsigned. Owners can request certified site plans.
-- =========================================================

DO $$ BEGIN
    CREATE TYPE site_plan_status AS ENUM ('draft', 'certified', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS site_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    generated_by UUID,                       -- references owners, admins, or assembly_users
    generated_by_role VARCHAR(30) NOT NULL,  -- 'owner' | 'admin' | 'assembly'
    plan_data JSONB NOT NULL DEFAULT '{}',   -- { buildings: [], setbacks: {}, north: deg, scale: ratio, area_sqm, perimeter_m }
    plan_image_url TEXT,                     -- rendered image URL (if generated)
    status site_plan_status NOT NULL DEFAULT 'draft',
    certified_by UUID REFERENCES assembly_users(id),
    certified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    title VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_plans_parcel ON site_plans (parcel_id);
CREATE INDEX IF NOT EXISTS idx_site_plans_org ON site_plans (organization_id);
CREATE INDEX IF NOT EXISTS idx_site_plans_status ON site_plans (status);
CREATE INDEX IF NOT EXISTS idx_site_plans_generated_by ON site_plans (generated_by);

-- =========================================================
-- SITE PLAN REQUESTS (owner asks assembly for a certified plan)
-- =========================================================
DO $$ BEGIN
    CREATE TYPE site_plan_request_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS site_plan_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    status site_plan_request_status NOT NULL DEFAULT 'pending',
    purpose TEXT,                             -- e.g. 'building permit', 'land sale', 'mortgage'
    notes TEXT,
    assigned_to UUID REFERENCES assembly_users(id),
    resulting_plan_id UUID REFERENCES site_plans(id) ON DELETE SET NULL,
    fee_amount NUMERIC(10, 2) DEFAULT 0,
    fee_paid BOOLEAN NOT NULL DEFAULT false,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_site_plan_requests_parcel ON site_plan_requests (parcel_id);
CREATE INDEX IF NOT EXISTS idx_site_plan_requests_owner ON site_plan_requests (owner_id);
CREATE INDEX IF NOT EXISTS idx_site_plan_requests_org ON site_plan_requests (organization_id);
CREATE INDEX IF NOT EXISTS idx_site_plan_requests_status ON site_plan_requests (status);

-- =========================================================
-- SALES MANAGER ROLE
-- =========================================================
-- Sales managers are land professionals who list land for sale across
-- all assemblies/tenants. They have universal access to monitoring tools,
-- marketplace, validation, and field visits. Registration is free.
-- They are stored in the owners table with account_type = 'sales_manager'.

DO $$ BEGIN ALTER TABLE owners ADD COLUMN IF NOT EXISTS is_sales_manager BOOLEAN NOT NULL DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Track sales manager activity across tenants
CREATE TABLE IF NOT EXISTS sales_manager_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_manager_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL,
    parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
    listing_id UUID REFERENCES land_listings(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sma_manager ON sales_manager_activity(sales_manager_id);
CREATE INDEX IF NOT EXISTS idx_sma_org ON sales_manager_activity(organization_id);
CREATE INDEX IF NOT EXISTS idx_sma_type ON sales_manager_activity(activity_type);

-- Reset search_path to the app default (pooled connections reuse this session)
SET search_path TO earthglobal, public, extensions;

-- =========================================================
-- USEFUL SPATIAL QUERIES (examples, not part of schema)
-- =========================================================
-- All queries must prefix tables with earthglobal. or set search_path:
--   SET search_path TO earthglobal, public;
--
-- Compute area in square meters for a parcel (geography cast gives meters, not degrees):
-- SELECT ST_Area(boundary::geography) FROM earthglobal.parcels WHERE id = '...';
--
-- Compute perimeter in meters:
-- SELECT ST_Perimeter(boundary::geography) FROM earthglobal.parcels WHERE id = '...';
--
-- Find parcels within a bounding box (for map viewport loading):
-- SELECT * FROM earthglobal.parcels
-- WHERE boundary && ST_MakeEnvelope(minLng, minLat, maxLng, maxLat, 4326);
