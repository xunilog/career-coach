# ts-jobspy (Indeed + LinkedIn Scraping) over Hiring.cafe API

**Status:** Accepted

The original architecture documents reference "Hiring.cafe API" as the job data source. The actual implementation uses `ts-jobspy`, an npm library that scrapes Indeed and LinkedIn directly. Hiring.cafe was considered but never implemented.

We chose `ts-jobspy` because it requires no API key, works with any location, provides richer job descriptions than most REST APIs, and avoids rate-limit tiers. The trade-off is that web scraping is inherently fragile — site layout changes can break the scraper — and there are legal/ToS considerations.

## Consequences

- The `jobs.source` column defaults to `'hiring.cafe'` in `db-migrations.ts` — this is a legacy artifact that should be corrected to `'ts-jobspy'` in a future migration.
- Architecture diagrams that previously referenced "Hiring.cafe API" now reference "Indeed + LinkedIn (via ts-jobspy)".
- The `jobspy-client.ts` module wraps `ts-jobspy` with retry logic and streaming progress. If the scraping approach changes, only this module needs to change.
