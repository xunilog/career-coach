# Acceptance Notes — Job Scoring

## Edge Cases

- **Zero unscored jobs**: Scoring step is a no-op. No LLM calls made.
- **Single job in batch**: Batch size of 1 is valid. Same prompt structure, just one job.
- **All jobs already scored**: Merge logic preserves existing scores. Scoring query returns zero rows.
- **Profile exists but is incomplete**: LLM scores with whatever profile data is available. Quality degrades but system doesn't fail.
- **LLM returns malformed JSON**: Zod schema validation catches it. Treated as a failure → retry once → default to Medium.

## Non-Functional

- **Scoring latency**: ~2–5s per batch of 10. A search with 50 new jobs = 5 batches = ~10–25s total scoring time.
- **LLM cost**: One API call per batch. 50 jobs = 5 calls. Batch size of 10 balances cost vs latency.
- **Retry behavior**: One retry on transient failures. Persistent failures default to "Medium" so the user can still see results.
- **Profile read**: Profile is read once per search execution from SQLite, cached in memory for all batches within that execution. Not re-read per batch.

## Dependencies

- Career profile must exist in `career_profile` SQLite table. If the user hasn't completed the profile coaching flow, scoring is skipped.
- Mistral LLM must be available. No fallback LLM provider exists.
