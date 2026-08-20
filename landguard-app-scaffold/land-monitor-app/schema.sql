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
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
    CREATE TYPE plan_period AS ENUM ('week', 'month', 'quarter');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    included_visits_per_period INT NOT NULL DEFAULT 0,
    period plan_period NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    live_video_included BOOLEAN NOT NULL DEFAULT false
);

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    credits_remaining INT NOT NULL DEFAULT 0,
    renews_at TIMESTAMPTZ,
    status subscription_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_owner ON subscriptions (owner_id);

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
    plan_credit_used BOOLEAN NOT NULL DEFAULT false
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
    CREATE TYPE alert_type AS ENUM ('clearing', 'possible_structure', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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
-- Reset search_path to default after schema setup
-- =========================================================
RESET search_path;

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
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buildings_org ON buildings (organization_id);
CREATE INDEX IF NOT EXISTS idx_buildings_parcel ON buildings (parcel_id);
CREATE INDEX IF NOT EXISTS idx_buildings_status ON buildings (status);
CREATE INDEX IF NOT EXISTS idx_buildings_footprint ON buildings USING GIST (footprint);
CREATE INDEX IF NOT EXISTS idx_buildings_protected ON buildings (in_protected_area);

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

RESET search_path;

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
