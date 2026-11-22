-- Keep worker publishing tables ready without Hibernate's full production schema scan.
CREATE TABLE IF NOT EXISTS worker_service_listings (
    id BIGSERIAL PRIMARY KEY,
    seeker_profile_id BIGINT NOT NULL REFERENCES seeker_profiles(id),
    category VARCHAR(100) NOT NULL,
    title VARCHAR(140) NOT NULL,
    description VARCHAR(3000) NOT NULL,
    skills_text VARCHAR(1200),
    pricing_type VARCHAR(24) NOT NULL,
    price NUMERIC(12, 2),
    minimum_duration_hours INTEGER,
    service_area VARCHAR(160),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    negotiable BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_worker_service_listings_seeker_updated
    ON worker_service_listings (seeker_profile_id, updated_at DESC);

ALTER TABLE availabilities
    ADD COLUMN IF NOT EXISTS worker_service_listing_id BIGINT;

-- Keep older worker accounts compatible with current profile preferences.
ALTER TABLE seeker_profiles
    ADD COLUMN IF NOT EXISTS accepting_work BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS seeker_preferred_categories (
    seeker_profile_id BIGINT NOT NULL REFERENCES seeker_profiles(id) ON DELETE CASCADE,
    category VARCHAR(80) NOT NULL,
    PRIMARY KEY (seeker_profile_id, category)
);

-- Forward-only compatibility migration for columns added to provider-owned jobs.
-- Provider postings and all existing rows are preserved.
ALTER TABLE job_posts
    ADD COLUMN IF NOT EXISTS category VARCHAR(80);

ALTER TABLE job_posts
    ADD COLUMN IF NOT EXISTS qualification_required VARCHAR(255);

ALTER TABLE job_posts
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;

ALTER TABLE job_posts
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE job_posts
    ADD COLUMN IF NOT EXISTS payment_max_amount NUMERIC(12, 2);

ALTER TABLE job_posts
    ADD COLUMN IF NOT EXISTS budget_negotiable BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE job_posts
    ADD COLUMN IF NOT EXISTS payment_period VARCHAR(20) NOT NULL DEFAULT 'PER_DAY';

-- Negotiable postings are allowed to omit a fixed minimum amount.
ALTER TABLE job_posts
    ALTER COLUMN payment_amount DROP NOT NULL;

-- Preserve applicant details as an application-time snapshot.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS applicant_name VARCHAR(120);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS applicant_email VARCHAR(254);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS applicant_phone VARCHAR(32);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS applicant_location VARCHAR(255);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS experience_level VARCHAR(32);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS introduction VARCHAR(1200);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS shortlisted BOOLEAN NOT NULL DEFAULT FALSE;

-- Ratings are read during profile refresh, so keep this core table present in
-- environments where Hibernate DDL is disabled (the production default).
CREATE TABLE IF NOT EXISTS reviews (
    id BIGSERIAL PRIMARY KEY,
    engagement_id BIGINT NOT NULL REFERENCES worker_engagements(id) ON DELETE CASCADE,
    reviewer_id BIGINT NOT NULL REFERENCES users(id),
    reviewee_id BIGINT NOT NULL REFERENCES users(id),
    direction VARCHAR(30) NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_reviews_engagement_direction UNIQUE (engagement_id, direction)
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_created_at
    ON reviews (reviewee_id, created_at DESC);

CREATE TABLE IF NOT EXISTS engagement_payments (
    id BIGSERIAL PRIMARY KEY,
    engagement_id BIGINT NOT NULL UNIQUE REFERENCES worker_engagements(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    method VARCHAR(24) NOT NULL,
    payment_date DATE NOT NULL,
    transaction_reference VARCHAR(120),
    note VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_engagement_payments_date ON engagement_payments (payment_date DESC);

CREATE TABLE IF NOT EXISTS application_skills (
    application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    skill VARCHAR(80) NOT NULL,
    PRIMARY KEY (application_id, skill)
);
