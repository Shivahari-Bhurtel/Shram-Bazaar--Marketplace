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
