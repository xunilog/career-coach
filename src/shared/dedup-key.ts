// src/shared/dedup-key.ts
// ---------------------------------------------------------------------------
// Deterministic content hash for job deduplication.
// Stable across scrape runs — based on job content, not scraper IDs.
// ---------------------------------------------------------------------------

/**
 * djb2 hash — simple, fast, deterministic string hash.
 * Returns a hex string (8 chars) for readability and compact storage.
 */
function djb2(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Compute a stable deduplication key from job content fields.
 * Normalizes case and whitespace; includes source so cross-site
 * postings of the same job are tracked separately.
 */
export function computeDedupKey(
  company: string,
  title: string,
  location: string,
  source: string,
): string {
  const normalized = [
    company.trim().toLowerCase(),
    title.trim().toLowerCase(),
    (location ?? "").trim().toLowerCase(),
    source,
  ].join("|");
  return djb2(normalized);
}
