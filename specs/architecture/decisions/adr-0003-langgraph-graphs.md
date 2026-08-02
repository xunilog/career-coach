# LangGraph Graphs for Generation and Coaching

**Status:** Accepted

Two compiled LangGraph `StateGraph`s power the AI features:

- **Graph 1** (Profile Coach): `Router → Profile Coach / Experience Coach / Resume Coach` — conversational career profile building, persisted via `SqlCheckpointer`.
- **Graph 2** (Generation): `Writer → Scorer(ATS) → Reviewer(Humanizer)` — per-job resume and cover letter generation with feedback loops.

Both graphs are compiled once at startup (before any request arrives), held in module scope, and invoked per-request. This avoids per-request compilation overhead and keeps the graphs warm in memory.

Graph 2 uses a specific iteration pattern: Writer, Scorer, and Reviewer all run each iteration. The Scorer evaluates ATS match (target ≥85%), the Reviewer evaluates human authenticity (target ≥80%). If either score is below threshold, combined feedback is routed back to the Writer for the next iteration (max 5 total). This differs from earlier documentation that showed Scorer feedback causing a Writer re-run within the same iteration before Reviewer ran.

## Considered Options

- **Simple LLM call (no graph)** — Would work for one-shot generation but can't express feedback loops. The Writer→Scorer→Reviewer pattern needs conditional routing and state accumulation across iterations.
- **CrewAI or AutoGen** — Heavier agent frameworks that add complexity without benefit for a fixed-topology pipeline. LangGraph gives us explicit control over the graph structure.
