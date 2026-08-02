-- Career Coach — Migration v3: Add content-based dedup key to jobs
-- Enables stable job identity across scrape runs by hashing content fields
-- instead of relying on external scraper IDs which can change.

ALTER TABLE jobs ADD COLUMN dedup_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_dedup_key ON jobs(dedup_key);
