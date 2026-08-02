# Acceptance Notes — Company Research

## Edge Cases

- **Company name is ambiguous** (e.g., "Apple"): LLM uses job description context to disambiguate.
- **Research tab opened before generation**: Shows empty state with prompt to generate.
- **User closes app during research generation**: Streaming channel is per-request, no data is persisted until "done" event. Incomplete research is discarded.
- **Research for a company with no web presence**: LLM produces best-effort output from training data. Quality may be lower but generation does not fail.

## Non-Functional

- **Generation time**: ~5–15s depending on LLM response length and section count.
- **Streaming behavior**: Content is chunked by section after the LLM responds (not true streaming during token generation).
- **Data freshness**: Research is a snapshot generated at the time of the request. It does not auto-update.

## Dependencies

- Mistral LLM must be available.
- Job description must exist in `jobs.description` for context.
- Research is a prerequisite for resume and cover letter generation.
