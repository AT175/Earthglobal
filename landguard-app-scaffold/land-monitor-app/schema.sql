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
    phone VARCHAR(50) UNIQUE NOT NULL,
    region VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT true,
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
