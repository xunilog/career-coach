# Acceptance Notes — Resume & Cover Letter Generation

## Edge Cases

- **No company research**: Generation buttons are disabled with tooltip "Run Company Research first."
- **No profile**: Scoring quality degrades but generation still runs with available data.
- **No work experiences**: Resume generation runs with base resume + JD + research only. Missing experience section in output.
- **User edits during generation**: Editor is read-only during streaming. Edits are blocked until "done" event.
- **Re-score on empty content**: Scorer and Reviewer evaluate empty string — scores will be very low.
- **Chat modification then re-score**: Chat modifies content, user clicks Re-Score — only Scorer + Reviewer run, content is evaluated as-is.
- **Best draft at iteration cap**: If neither ATS nor Human passes by iteration 5, the draft with the highest combined score across all iterations is returned.

## Non-Functional

- **Generation time**: 15–60s for resume, 10–40s for cover letter. Streaming IPC keeps UI responsive.
- **Iteration behavior**: Both Scorer AND Reviewer run each iteration. Combined feedback is sent to Writer for the next iteration if either score is below threshold. This differs from earlier documentation that showed Scorer feedback triggering a Writer re-run within the same iteration.
- **LLM cost**: Up to 15 LLM calls per generation (5 iterations × 3 agents). Most pass within 2–3 iterations.
- **Score panel**: Collapsible but always visible below the editor. Shows current iteration scores and feedback.

## Dependencies

- Company research must exist for the job (prerequisite).
- Career profile, work experiences, and resume draft must exist in SQLite.
- Mistral LLM must be available.
- LangGraph Graph 2 must be compiled at startup.
