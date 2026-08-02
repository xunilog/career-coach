# Career Coach — Specification Index

Canonical entry point for architecture, design, and feature specifications.
Every agent starts here before reading code.

## Read Order

1. **Glossary** — ubiquitous language, term definitions
2. **Architecture** — C4 diagrams (context → container → component)
3. **Decisions** — ADRs constraining the design space
4. **Design** — class diagrams + sequence diagrams per module
5. **Features** — Gherkin scenarios with REQ-IDs + acceptance notes

## Navigation

| Layer           | Path                                                         | Contents                                          |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------- |
| Domain          | [`domain/glossary.md`](domain/glossary.md)                   | Term definitions, entity descriptions             |
| Architecture L1 | [`architecture/context.puml`](architecture/context.puml)     | C4 System Context                                 |
| Architecture L2 | [`architecture/container.puml`](architecture/container.puml) | C4 Container Diagram                              |
| Architecture L3 | [`architecture/component.puml`](architecture/component.puml) | C4 Component Diagram                              |
| Decisions       | [`architecture/decisions/`](architecture/decisions/)         | ADRs (0001–0007)                                  |
| Design          | [`design/`](design/)                                         | Class diagrams, sequence diagrams, state machines |

## Capability → Feature Map

| Capability    | REQ-ID prefix                      | Feature files             |
| ------------- | ---------------------------------- | ------------------------- |
| 01-search     | `REQ-SRCH`, `REQ-EXEC`, `REQ-SCHD` | `features/01-search/`     |
| 02-scoring    | `REQ-SCOR`                         | `features/02-scoring/`    |
| 03-research   | `REQ-RSCH`                         | `features/03-research/`   |
| 04-generation | `REQ-GENR`, `REQ-GENC`             | `features/04-generation/` |
| 05-inbox      | `REQ-INBX`                         | `features/05-inbox/`      |
| 06-tracking   | `REQ-TRAC`                         | `features/06-tracking/`   |
| 07-export     | `REQ-EXPT`                         | `features/07-export/`     |
| 08-chat       | `REQ-CONV`                         | `features/08-chat/`       |
| 09-settings   | `REQ-CNFG`                         | `features/09-settings/`   |

## REQ-ID Registry

### 01-search — Search Management & Execution

| REQ-ID        | Scenario                                      | File                                           |
| ------------- | --------------------------------------------- | ---------------------------------------------- |
| `REQ-SRCH-01` | Create a new search with simple fields        | `features/01-search/search-management.feature` |
| `REQ-SRCH-02` | Create a new search with advanced filters     | `features/01-search/search-management.feature` |
| `REQ-SRCH-03` | Prevent duplicate search titles               | `features/01-search/search-management.feature` |
| `REQ-SRCH-04` | Edit an existing search                       | `features/01-search/search-management.feature` |
| `REQ-SRCH-05` | Delete a search and all cascading data        | `features/01-search/search-management.feature` |
| `REQ-SRCH-06` | Nav panel shows all saved searches with stats | `features/01-search/search-management.feature` |
| `REQ-SRCH-07` | Delete a search from the edit modal           | `features/01-search/search-management.feature` |
| `REQ-EXEC-01` | Run a single search successfully              | `features/01-search/search-execution.feature`  |
| `REQ-EXEC-02` | Run all searches sequentially                 | `features/01-search/search-execution.feature`  |
| `REQ-EXEC-03` | Retry with exponential backoff on 429         | `features/01-search/search-execution.feature`  |
| `REQ-EXEC-04` | Skip search on persistent failure             | `features/01-search/search-execution.feature`  |
| `REQ-EXEC-05` | Only run scheduled searches during tick       | `features/01-search/search-execution.feature`  |
| `REQ-EXEC-06` | Build SearchState from database row           | `features/01-search/search-execution.feature`  |
| `REQ-EXEC-07` | Clear is_new flag when user views results     | `features/01-search/search-execution.feature`  |
| `REQ-SCHD-01` | Daily search runs after 24 hours              | `features/01-search/scheduling.feature`        |
| `REQ-SCHD-02` | Weekly search runs after 7 days               | `features/01-search/scheduling.feature`        |
| `REQ-SCHD-03` | Monthly search runs after 30 days             | `features/01-search/scheduling.feature`        |
| `REQ-SCHD-04` | Manual searches never auto-triggered          | `features/01-search/scheduling.feature`        |
| `REQ-SCHD-05` | Searches queued sequentially with 2s delay    | `features/01-search/scheduling.feature`        |
| `REQ-SCHD-06` | App start checks for due searches             | `features/01-search/scheduling.feature`        |
| `REQ-SCHD-07` | Scheduler respects in-progress searches       | `features/01-search/scheduling.feature`        |
| `REQ-SCHD-08` | Error handling during scheduled runs          | `features/01-search/scheduling.feature`        |

### 02-scoring — Job Scoring

| REQ-ID        | Scenario                                        | File                                      |
| ------------- | ----------------------------------------------- | ----------------------------------------- |
| `REQ-SCOR-01` | Batch score new jobs in groups of 10            | `features/02-scoring/job-scoring.feature` |
| `REQ-SCOR-02` | Scoring prompt includes profile and job details | `features/02-scoring/job-scoring.feature` |
| `REQ-SCOR-03` | Skip scoring for already-scored jobs            | `features/02-scoring/job-scoring.feature` |
| `REQ-SCOR-04` | Handle LLM scoring failure gracefully           | `features/02-scoring/job-scoring.feature` |
| `REQ-SCOR-05` | Score is displayed in the results table         | `features/02-scoring/job-scoring.feature` |
| `REQ-SCOR-06` | Profile not available — skip scoring            | `features/02-scoring/job-scoring.feature` |

### 03-research — Company Research

| REQ-ID        | Scenario                                          | File                                            |
| ------------- | ------------------------------------------------- | ----------------------------------------------- |
| `REQ-RSCH-01` | Generate company research successfully            | `features/03-research/company-research.feature` |
| `REQ-RSCH-02` | Research output structure (5 sections)            | `features/03-research/company-research.feature` |
| `REQ-RSCH-03` | Research is manual, not automatic                 | `features/03-research/company-research.feature` |
| `REQ-RSCH-04` | Re-generate replaces existing research            | `features/03-research/company-research.feature` |
| `REQ-RSCH-05` | Handle research failure                           | `features/03-research/company-research.feature` |
| `REQ-RSCH-06` | Research precondition for resume and cover letter | `features/03-research/company-research.feature` |

### 04-generation — Resume & Cover Letter Generation

| REQ-ID        | Scenario                                                 | File                                               |
| ------------- | -------------------------------------------------------- | -------------------------------------------------- |
| `REQ-GENR-01` | Generate adapted resume via Writer→Scorer→Reviewer       | `features/04-generation/resume-adaptation.feature` |
| `REQ-GENR-02` | Writer agent produces initial draft from inputs          | `features/04-generation/resume-adaptation.feature` |
| `REQ-GENR-03` | Scorer agent evaluates ATS match (target 85%)            | `features/04-generation/resume-adaptation.feature` |
| `REQ-GENR-04` | Reviewer agent evaluates human authenticity (target 80%) | `features/04-generation/resume-adaptation.feature` |
| `REQ-GENR-05` | Max 5 iterations with feedback loops                     | `features/04-generation/resume-adaptation.feature` |
| `REQ-GENR-06` | Scores always visible in collapsible score panel         | `features/04-generation/resume-adaptation.feature` |
| `REQ-GENR-07` | Re-score after manual edits (Writer skipped)             | `features/04-generation/resume-adaptation.feature` |
| `REQ-GENR-08` | Personalization suggestions from Reviewer                | `features/04-generation/resume-adaptation.feature` |
| `REQ-GENR-09` | Resume is editable after generation                      | `features/04-generation/resume-adaptation.feature` |
| `REQ-GENR-10` | Re-generate overwrites existing adapted resume           | `features/04-generation/resume-adaptation.feature` |
| `REQ-GENR-11` | Chat iteration on adapted resume                         | `features/04-generation/resume-adaptation.feature` |
| `REQ-GENR-12` | Resume generation requires company research              | `features/04-generation/resume-adaptation.feature` |
| `REQ-GENR-13` | Handle resume generation failure                         | `features/04-generation/resume-adaptation.feature` |
| `REQ-GENC-01` | Generate cover letter via Writer→Scorer→Reviewer         | `features/04-generation/cover-letter.feature`      |
| `REQ-GENC-02` | Cover letter Writer prompt includes company research     | `features/04-generation/cover-letter.feature`      |
| `REQ-GENC-03` | Cover letter Scorer evaluates ATS match                  | `features/04-generation/cover-letter.feature`      |
| `REQ-GENC-04` | Cover letter Reviewer detects AI tells                   | `features/04-generation/cover-letter.feature`      |
| `REQ-GENC-05` | Max 5 iterations, best draft wins                        | `features/04-generation/cover-letter.feature`      |
| `REQ-GENC-06` | Cover letter is editable after generation                | `features/04-generation/cover-letter.feature`      |
| `REQ-GENC-07` | Re-Score after manual edits (Writer skipped)             | `features/04-generation/cover-letter.feature`      |
| `REQ-GENC-08` | Re-generate overwrites existing cover letter             | `features/04-generation/cover-letter.feature`      |
| `REQ-GENC-09` | Cover letter requires company research                   | `features/04-generation/cover-letter.feature`      |
| `REQ-GENC-10` | Generate resume and cover letter independently           | `features/04-generation/cover-letter.feature`      |
| `REQ-GENC-11` | Handle cover letter generation failure                   | `features/04-generation/cover-letter.feature`      |

### 05-inbox — Inbox & Search Results

| REQ-ID        | Scenario                                          | File                                      |
| ------------- | ------------------------------------------------- | ----------------------------------------- |
| `REQ-INBX-01` | Inbox aggregates new results across all searches  | `features/05-inbox/inbox-results.feature` |
| `REQ-INBX-02` | Inbox is empty when no new results                | `features/05-inbox/inbox-results.feature` |
| `REQ-INBX-03` | Clicking an inbox row navigates to search results | `features/05-inbox/inbox-results.feature` |
| `REQ-INBX-04` | Search results view renders jobs table            | `features/05-inbox/inbox-results.feature` |
| `REQ-INBX-05` | Color-coded fit scores in results table           | `features/05-inbox/inbox-results.feature` |
| `REQ-INBX-06` | Sortable columns in results view                  | `features/05-inbox/inbox-results.feature` |
| `REQ-INBX-07` | New marker behavior (is_new flag)                 | `features/05-inbox/inbox-results.feature` |
| `REQ-INBX-08` | Status column shows application progress          | `features/05-inbox/inbox-results.feature` |
| `REQ-INBX-09` | Resume and Cover indicators via existence check   | `features/05-inbox/inbox-results.feature` |
| `REQ-INBX-10` | Search All streams progress via IPC               | `features/05-inbox/inbox-results.feature` |

### 06-tracking — Application Status Tracking

| REQ-ID        | Scenario                                  | File                                                |
| ------------- | ----------------------------------------- | --------------------------------------------------- |
| `REQ-TRAC-01` | Update application status from job detail | `features/06-tracking/application-tracking.feature` |
| `REQ-TRAC-02` | Status transition validation              | `features/06-tracking/application-tracking.feature` |
| `REQ-TRAC-03` | Archived jobs are hidden                  | `features/06-tracking/application-tracking.feature` |
| `REQ-TRAC-04` | Show Archived toggle                      | `features/06-tracking/application-tracking.feature` |
| `REQ-TRAC-05` | Update freeform notes                     | `features/06-tracking/application-tracking.feature` |
| `REQ-TRAC-06` | Status history records every change       | `features/06-tracking/application-tracking.feature` |
| `REQ-TRAC-07` | Status updates with optional notes        | `features/06-tracking/application-tracking.feature` |

### 07-export — Export

| REQ-ID        | Scenario                         | File                                |
| ------------- | -------------------------------- | ----------------------------------- |
| `REQ-EXPT-01` | Export adapted resume to PDF     | `features/07-export/export.feature` |
| `REQ-EXPT-02` | Export cover letter to PDF       | `features/07-export/export.feature` |
| `REQ-EXPT-03` | No document to export            | `features/07-export/export.feature` |
| `REQ-EXPT-04` | Copy document to clipboard       | `features/07-export/export.feature` |
| `REQ-EXPT-05` | Open apply URL in system browser | `features/07-export/export.feature` |
| `REQ-EXPT-06` | No apply URL available           | `features/07-export/export.feature` |
| `REQ-EXPT-07` | Export filename convention       | `features/07-export/export.feature` |

### 08-chat — Conversation History

| REQ-ID        | Scenario                                       | File                                            |
| ------------- | ---------------------------------------------- | ----------------------------------------------- |
| `REQ-CONV-01` | First ever run — auto-create conversation      | `features/08-chat/conversation-history.feature` |
| `REQ-CONV-02` | Chat creates title from first user message     | `features/08-chat/conversation-history.feature` |
| `REQ-CONV-03` | Conversations persist across restarts          | `features/08-chat/conversation-history.feature` |
| `REQ-CONV-04` | Switching conversations loads correct messages | `features/08-chat/conversation-history.feature` |
| `REQ-CONV-05` | Starting a new conversation                    | `features/08-chat/conversation-history.feature` |
| `REQ-CONV-06` | Newer conversation indicator                   | `features/08-chat/conversation-history.feature` |
| `REQ-CONV-07` | Deleting a conversation                        | `features/08-chat/conversation-history.feature` |
| `REQ-CONV-08` | Delete the last conversation                   | `features/08-chat/conversation-history.feature` |
| `REQ-CONV-09` | Streaming updates updated_at                   | `features/08-chat/conversation-history.feature` |

### 09-settings — API Key Management

| REQ-ID        | Scenario                                        | File                                                  |
| ------------- | ----------------------------------------------- | ----------------------------------------------------- |
| `REQ-CNFG-01` | App starts without any stored API key           | `features/09-settings/api-key-management.feature`     |
| `REQ-CNFG-02` | App starts with a verified key in the database  | `features/09-settings/api-key-management.feature`     |
| `REQ-CNFG-03` | App starts with an env variable in dev mode     | `features/09-settings/api-key-management.feature`     |
| `REQ-CNFG-04` | User submits a valid API key                    | `features/09-settings/api-key-management.feature`     |
| `REQ-CNFG-05` | User submits an invalid API key                 | `features/09-settings/api-key-management.feature`     |
| `REQ-CNFG-06` | Network error during verification               | `features/09-settings/api-key-management.feature`     |
| `REQ-CNFG-07` | Update API key from the profile menu            | `features/09-settings/api-key-management.feature`     |
| `REQ-CNFG-08` | Successful key update via modal                 | `features/09-settings/api-key-management.feature`     |
| `REQ-CNFG-09` | Invalid key update via modal                    | `features/09-settings/api-key-management.feature`     |
| `REQ-CNFG-10` | getModel falls back to database when env absent | `features/09-settings/api-key-management.feature`     |
| `REQ-CNFG-11` | getModel prefers env var over database          | `features/09-settings/api-key-management.feature`     |
| `REQ-CNFG-12` | getModel throws when no key is available        | `features/09-settings/api-key-management.feature`     |

## Diagram Index

| Diagram                  | File                                                                             | Type          |
| ------------------------ | -------------------------------------------------------------------------------- | ------------- |
| System Context           | [`architecture/context.puml`](architecture/context.puml)                         | C4 L1         |
| Container                | [`architecture/container.puml`](architecture/container.puml)                     | C4 L2         |
| Component                | [`architecture/component.puml`](architecture/component.puml)                     | C4 L3         |
| Domain Model             | [`design/domain-model.class.puml`](design/domain-model.class.puml)               | UML Class     |
| Database Schema          | [`design/schema-er.puml`](design/schema-er.puml)                                 | ER Diagram    |
| Job Status State Machine | [`design/status-machine.puml`](design/status-machine.puml)                       | State Diagram |
| Generation Pipeline      | [`design/generation-sequence.puml`](design/generation-sequence.puml)             | UML Sequence  |
| Re-Score Flow            | [`design/rescore-sequence.puml`](design/rescore-sequence.puml)                   | UML Sequence  |
| Company Research         | [`design/research-sequence.puml`](design/research-sequence.puml)                 | UML Sequence  |
| Stream Event Types       | [`design/stream-events.class.puml`](design/stream-events.class.puml)             | UML Class     |
| Search Execution         | [`design/search-execution-sequence.puml`](design/search-execution-sequence.puml) | UML Sequence  |
| Full Stack Dataflow      | [`design/dataflow.puml`](design/dataflow.puml)                                   | Flowchart     |

## Decision Index

| ADR                                                                   | Title                                      | Status   |
| --------------------------------------------------------------------- | ------------------------------------------ | -------- |
| [ADR-0001](architecture/decisions/adr-0001-sqlite-over-markdown.md)   | SQLite over Markdown Files                 | Accepted |
| [ADR-0002](architecture/decisions/adr-0002-ts-jobspy.md)              | ts-jobspy over Hiring.cafe API             | Accepted |
| [ADR-0003](architecture/decisions/adr-0003-langgraph-graphs.md)       | LangGraph Graphs for Generation & Coaching | Accepted |
| [ADR-0004](architecture/decisions/adr-0004-streaming-ipc.md)          | Streaming IPC as Default for AI Operations | Accepted |
| [ADR-0005](architecture/decisions/adr-0005-zod-schemas.md)            | Zod Schemas as Single Source of Truth      | Accepted |
| [ADR-0006](architecture/decisions/adr-0006-scheduler-main-process.md) | Scheduler as Main-Process Object           | Accepted |
| [ADR-0007](architecture/decisions/adr-0007-monthly-schedule.md)       | Monthly Schedule Support                   | Accepted |
